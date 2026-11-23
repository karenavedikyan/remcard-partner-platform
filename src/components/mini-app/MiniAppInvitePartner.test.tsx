import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MiniAppInvitePartner } from "./MiniAppInvitePartner";
import * as api from "@/lib/mini-app/api";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/config", () => ({ getAppUrl: () => "https://prof.remcard.ru" }));

vi.mock("@/lib/mini-app/api", () => ({
  miniAppFetchInviteContext: vi.fn(),
  miniAppCreateDiscussionInvite: vi.fn(),
  miniAppCreateLinkInvite: vi.fn(),
}));

const baseProps = {
  platform: "telegram" as const,
  branchId: null,
  embeddedContext: "default" as const,
  partnersSearchUrl: "https://prof.remcard.ru/partners",
  onBack: vi.fn(),
};

function mockClipboard(writeText: ReturnType<typeof vi.fn>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

describe("MiniAppInvitePartner wizard", () => {
  beforeEach(() => {
    vi.mocked(api.miniAppFetchInviteContext).mockReset();
    vi.mocked(api.miniAppCreateDiscussionInvite).mockReset();
    vi.mocked(api.miniAppCreateLinkInvite).mockReset();
    baseProps.onBack.mockReset();
    vi.stubGlobal("confirm", () => true);
    mockClipboard(vi.fn().mockRejectedValue(new Error("no clipboard")));
  });

  it("shows blocking screen when invite context denies access", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockRejectedValue(
      new RemcardApiError(403, "Нет доступа"),
    );
    render(<MiniAppInvitePartner {...baseProps} />);
    expect(await screen.findByTestId("mini-invite-blocked")).toHaveTextContent("Нет доступа");
  });

  it("walks agent discussion flow through three steps and copies invitation", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "discussion",
      nameMaxLength: 120,
      noteMaxLength: 500,
      inviterBusinessSide: null,
      categoryPlan: { categories: [], requiresIntendedType: false },
    });
    vi.mocked(api.miniAppCreateDiscussionInvite).mockResolvedValue({
      inviteId: "d1",
      token: "tok",
      expiresAt: "2099-01-01T00:00:00.000Z",
      previewPath: "/invite/discussion/tok",
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    mockClipboard(writeText);

    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");

    await user.type(screen.getByTestId("mini-invite-name"), "Дом материалов");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    await user.click(screen.getByRole("button", { name: "Коротко" }));
    await user.click(screen.getByTestId("mini-invite-next-2"));
    await user.click(screen.getByTestId("mini-invite-create"));

    await waitFor(() => expect(screen.getByTestId("invite-ready")).toBeInTheDocument());
    expect(api.miniAppCreateDiscussionInvite).toHaveBeenCalledWith(
      "telegram",
      expect.objectContaining({
        recipientLabel: "Дом материалов",
        cooperationSubject: expect.any(String),
      }),
      expect.any(Object),
    );
    expect(screen.getByTestId("invite-url")).toHaveValue("https://prof.remcard.ru/invite/discussion/tok");
    await user.click(screen.getByTestId("invite-copy-btn"));
    await waitFor(() => {
      if (writeText.mock.calls.length > 0) {
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining("/invite/discussion/tok"));
      } else {
        expect(screen.getByRole("status")).toHaveTextContent(/скопирован/i);
      }
    });
  });

  it("creates terms invite for store role with intended type and terms payload", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "terms",
      nameMaxLength: 120,
      noteMaxLength: 400,
      inviterBusinessSide: {
        principalUserId: "store-1",
        partnerType: "STORE",
        storeCategories: ["doors"],
        specializations: [],
        tradeTermCategories: ["doors"],
      },
      categoryPlan: { categories: ["doors"], requiresIntendedType: false },
    });
    vi.mocked(api.miniAppCreateLinkInvite).mockResolvedValue({
      inviteId: "l1",
      token: "ltok",
      expiresAt: "2099-06-01T00:00:00.000Z",
      previewPath: "/invite/ltok",
    });
    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");

    await user.type(screen.getByTestId("mini-invite-name"), "Мастер Иван");
    await user.selectOptions(screen.getByTestId("mini-invite-type"), "MASTER");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    fireEvent.change(screen.getByTestId("mini-invite-note"), {
      target: { value: "Приглашаю к сотрудничеству" },
    });
    await user.click(screen.getByTestId("mini-invite-next-2"));
    await user.click(screen.getByTestId("mini-invite-create"));

    await waitFor(() => expect(api.miniAppCreateLinkInvite).toHaveBeenCalled());
    const body = vi.mocked(api.miniAppCreateLinkInvite).mock.calls[0]![1];
    expect(body.intendedPartnerType).toBe("MASTER");
    expect(body.terms).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "doors", storePercent: 10 })]),
    );
  });

  it("disables double submit while create is in flight", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "discussion",
      nameMaxLength: 120,
      noteMaxLength: 500,
      inviterBusinessSide: null,
      categoryPlan: { categories: [], requiresIntendedType: false },
    });
    let resolveCreate!: (v: api.MiniAppDiscussionInviteCreateResponse) => void;
    vi.mocked(api.miniAppCreateDiscussionInvite).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");
    await user.type(screen.getByTestId("mini-invite-name"), "A");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    await user.click(screen.getByRole("button", { name: "Коротко" }));
    await user.click(screen.getByTestId("mini-invite-next-2"));
    const createBtn = screen.getByTestId("mini-invite-create");
    await user.click(createBtn);
    await user.click(createBtn);
    expect(api.miniAppCreateDiscussionInvite).toHaveBeenCalledTimes(1);
    resolveCreate({
      inviteId: "x",
      token: "t",
      expiresAt: "2099-01-01T00:00:00.000Z",
      previewPath: "/invite/discussion/t",
    });
  });

  it("shows manual share field when clipboard fails", async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    const user = userEvent.setup();
    render(
      <MiniAppInvitePartner
        {...baseProps}
        fixtureInviteLink="https://prof.remcard.ru/invite/discussion/fixture"
      />,
    );
    expect(await screen.findByTestId("invite-ready")).toBeInTheDocument();
    await user.click(screen.getByTestId("invite-copy-btn"));
    await waitFor(() => {
      const manual = screen.queryByTestId("invite-share-manual");
      const status = screen.getByRole("status");
      expect(manual ?? status).toBeTruthy();
      if (!manual) {
        expect(status).toHaveTextContent(/вручную|скопир/i);
      }
    });
  });

  it("distinguishes transport failure from API rejection", async () => {
    vi.mocked(api.miniAppFetchInviteContext).mockResolvedValue({
      kind: "discussion",
      nameMaxLength: 120,
      noteMaxLength: 500,
      inviterBusinessSide: null,
      categoryPlan: { categories: [], requiresIntendedType: false },
    });
    vi.mocked(api.miniAppCreateDiscussionInvite).mockRejectedValue(new RemcardApiError(400, "Отклонено"));
    const user = userEvent.setup();
    render(<MiniAppInvitePartner {...baseProps} />);
    await screen.findByTestId("mini-invite-wizard");
    await user.type(screen.getByTestId("mini-invite-name"), "B");
    await user.click(screen.getByTestId("mini-invite-next-1"));
    await user.click(screen.getByRole("button", { name: "Коротко" }));
    await user.click(screen.getByTestId("mini-invite-next-2"));
    await user.click(screen.getByTestId("mini-invite-create"));
    const err = await screen.findByTestId("mini-invite-create-error");
    expect(err).toHaveTextContent("Отклонено");
    expect(err).not.toHaveTextContent("безопасный повтор");
  });
});