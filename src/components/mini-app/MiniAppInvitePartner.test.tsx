import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MiniAppLinkInviteFlow } from "./MiniAppLinkInviteFlow";
import { remcardFetch } from "@/lib/api-client";
import type { LinkInviteListRow } from "@/lib/link-invite-list";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status = 400;
    body = null;
    constructor(msg: string) {
      super(msg);
    }
  },
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://prof.remcard.ru",
}));

const baseRow: LinkInviteListRow = {
  id: "inv-1",
  status: "PENDING",
  statusLabel: "Активно",
  expiresAt: "2099-01-01T00:00:00.000Z",
  legacyTtl: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  acceptedAt: null,
  intendedPartnerType: "STORE",
  recipientLabel: "Магазин Партнёр",
  personalLabel: null,
  canEditPersonalLabel: true,
  note: "Здравствуйте!",
  partnershipId: null,
  previewPath: "/invite/abc-token",
  canCopyLink: true,
  canReissue: false,
  createdBy: { userId: "u1", displayName: "Owner", at: "2026-01-01T00:00:00.000Z" },
  acceptedBy: null,
  terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
};

function listPayload(active: LinkInviteListRow[] = [baseRow], archive: LinkInviteListRow[] = []) {
  return {
    listVersion: 2,
    resurfaceEnabled: true,
    active: { items: active, nextCursor: null },
    archive: { items: archive, nextCursor: null },
    activeLimit: 50,
    inviterBusinessSide: {
      principalUserId: "u1",
      partnerType: "COMPANY",
      storeCategories: ["doors", "flooring"],
      specializations: [],
      tradeTermCategories: ["doors", "flooring"],
    },
  };
}

describe("MiniAppLinkInviteFlow", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
    vi.mocked(remcardFetch).mockImplementation(async (path, opts) => {
      if (path === "/api/auth/me") {
        return { user: { id: "u1", displayName: "Компания", partnerType: "COMPANY" } };
      }
      if (path === "/api/partnership/link-invite" && opts?.method === "POST") {
        return { token: "t", expiresAt: "2099-01-01T00:00:00.000Z", previewPath: "/invite/new" };
      }
      if (path === "/api/partnership/link-invite") {
        return listPayload();
      }
      if (typeof path === "string" && path.includes("/api/partnership/link-invite/") && opts?.method === "DELETE") {
        return { ok: true };
      }
      throw new Error(`unexpected ${path}`);
    });
  });

  it("loads list with listVersion=2 and shows active tab", async () => {
    render(<MiniAppLinkInviteFlow onBack={() => {}} />);
    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/partnership/link-invite", {
        searchParams: { listVersion: "2" },
      });
    });
    expect(await screen.findByTestId("mini-invite-tab-active")).toBeInTheDocument();
    expect(await screen.findByTestId("mini-invite-row-inv-1")).toBeInTheDocument();
    expect(await screen.findByTestId("mini-invite-copy-text")).toBeInTheDocument();
  });

  it("blocks agent inviter without profile type on create step 3", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path, opts) => {
      if (path === "/api/auth/me") {
        return { user: { id: "a1", displayName: "Агент", partnerType: "AGENT" } };
      }
      if (path === "/api/partnership/link-invite" && !opts?.method) {
        return {
          ...listPayload([]),
          inviterBusinessSide: {
            principalUserId: "a1",
            partnerType: "AGENT",
            storeCategories: [],
            specializations: [],
            tradeTermCategories: [],
          },
        };
      }
      return listPayload([]);
    });
    render(<MiniAppLinkInviteFlow onBack={() => {}} />);
    await screen.findByTestId("mini-invite-start-create");
    await userEvent.click(screen.getByTestId("mini-invite-start-create"));
    await userEvent.type(screen.getByLabelText(/Имя или название/i), "Партнёр");
    await userEvent.selectOptions(screen.getByLabelText(/Предполагаемый тип/i), "MASTER");
    await userEvent.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    fireEvent.change(screen.getByLabelText(/Текст приглашения/i), { target: { value: "Текст" } });
    await userEvent.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    expect(await screen.findByTestId("link-invite-terms-blocked")).toHaveTextContent(
      "Укажите тип партнёра в профиле, чтобы создавать ссылки",
    );
  });

  it("creates invite via POST with intended type, note and terms", async () => {
    render(<MiniAppLinkInviteFlow onBack={() => {}} />);
    await screen.findByTestId("mini-invite-start-create");
    await userEvent.click(screen.getByTestId("mini-invite-start-create"));
    await userEvent.type(screen.getByLabelText(/Имя или название/i), "Новый партнёр");
    await userEvent.selectOptions(screen.getByLabelText(/Предполагаемый тип/i), "STORE");
    await userEvent.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    fireEvent.change(screen.getByLabelText(/Текст приглашения/i), { target: { value: "Приглашаю" } });
    await userEvent.click(screen.getByRole("button", { name: /Далее: проверить/i }));
    await userEvent.click(screen.getByTestId("mini-invite-create-submit"));
    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith(
        "/api/partnership/link-invite",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            intendedPartnerType: "STORE",
            recipientLabel: "Новый партнёр",
            note: "Приглашаю",
          }),
        }),
      );
    });
    expect(await screen.findByTestId("mini-invite-created-url")).toHaveValue("https://prof.remcard.ru/invite/new");
  });

  it("copies invite text on active row", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: write } });
    render(<MiniAppLinkInviteFlow onBack={() => {}} />);
    await userEvent.click(await screen.findByTestId("mini-invite-copy-text"));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(String(write.mock.calls[0]?.[0])).toContain("https://prof.remcard.ru/invite/abc-token");
  });

  it("revokes active invite after confirmation", async () => {
    render(<MiniAppLinkInviteFlow onBack={() => {}} />);
    await userEvent.click(await screen.findByTestId("mini-invite-revoke"));
    await userEvent.click(await screen.findByTestId("mini-invite-revoke-confirm"));
    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/partnership/link-invite/inv-1", { method: "DELETE" });
    });
  });

  it("archive tab has no copy or revoke actions", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path, opts) => {
      if (path === "/api/auth/me") return { user: { id: "u1", partnerType: "COMPANY" } };
      if (path === "/api/partnership/link-invite" && !opts?.method) {
        return listPayload([], [{ ...baseRow, id: "arch-1", status: "ACCEPTED", statusLabel: "Принято" }]);
      }
      return listPayload();
    });
    render(<MiniAppLinkInviteFlow onBack={() => {}} />);
    await userEvent.click(await screen.findByTestId("mini-invite-tab-archive"));
    expect(await screen.findByTestId("mini-invite-archive-readonly")).toBeInTheDocument();
    expect(screen.queryByTestId("mini-invite-copy-text")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mini-invite-revoke")).not.toBeInTheDocument();
  });
});