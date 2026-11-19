import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PartnerLinkInvitePanel } from "./PartnerLinkInvitePanel";
import { emptyLinkInviteList, type LinkInviteListRow } from "@/lib/link-invite-list";
import type { ProProfileResponse } from "@/lib/types";

function storeSenderProfile(): ProProfileResponse {
  return {
    user: {
      id: "sender",
      displayName: "Оптовик",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
      storeCategories: ["doors"],
      specializations: [],
    },
    organization: null,
  } as unknown as ProProfileResponse;
}

const { remcardFetch } = vi.hoisted(() => ({
  remcardFetch: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch,
  RemcardApiError: class extends Error {},
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "http://127.0.0.1:4312",
}));

function activeInviteRow(overrides: Partial<LinkInviteListRow> = {}): LinkInviteListRow {
  return {
    id: "inv-1",
    status: "PENDING",
    statusLabel: "Активно",
    expiresAt: "2099-06-01T00:00:00.000Z",
    legacyTtl: false,
    createdAt: "2026-11-19T10:00:00.000Z",
    acceptedAt: null,
    intendedPartnerType: "MASTER",
    note: "Тест",
    partnershipId: null,
    previewPath: "/invite/copy-me",
    canCopyLink: true,
    canReissue: false,
    createdBy: { userId: "u1", displayName: "Автор", at: "2026-11-19T10:00:00.000Z" },
    acceptedBy: null,
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
    ...overrides,
  };
}

describe("PartnerLinkInvitePanel list resurface", () => {
  it("shows active invite with copyable url after expand", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow());

    remcardFetch.mockResolvedValue(list);
    render(<PartnerLinkInvitePanel meProfile={storeSenderProfile()} />);

    expect(await screen.findByText("Активные")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Открыть" }));
    await waitFor(() => {
      expect(screen.getByTestId("link-invite-list-url")).toHaveValue(
        "http://127.0.0.1:4312/invite/copy-me",
      );
    });
    expect(screen.getByTestId("link-invite-active-list")).toBeInTheDocument();
  });

  it("archive rows do not show copy controls", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.archive.items.push({
      id: "inv-2",
      status: "ACCEPTED",
      statusLabel: "Принято",
      expiresAt: "2099-06-01T00:00:00.000Z",
      legacyTtl: false,
      createdAt: "2026-11-18T10:00:00.000Z",
      acceptedAt: "2026-11-18T12:00:00.000Z",
      intendedPartnerType: "MASTER",
      note: null,
      partnershipId: "p1",
      previewPath: null,
      canCopyLink: false,
      canReissue: false,
      createdBy: { userId: "u1", displayName: "Автор", at: "2026-11-18T10:00:00.000Z" },
      acceptedBy: {
        userId: "u2",
        displayName: "Партнёр",
        at: "2026-11-18T12:00:00.000Z",
      },
      terms: [],
    });
    remcardFetch.mockResolvedValue(list);
    render(<PartnerLinkInvitePanel meProfile={storeSenderProfile()} />);

    expect(await screen.findByText(/Принял: Партнёр/i)).toBeInTheDocument();
    expect(screen.queryByTestId("link-invite-list-url")).not.toBeInTheDocument();
    expect(screen.queryByText(/без срока до принятия или отзыва/i)).not.toBeInTheDocument();
  });

  it("shows row-scoped status after copy link in expanded history card", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow({ id: "inv-copy" }));
    remcardFetch.mockResolvedValue(list);
    render(<PartnerLinkInvitePanel meProfile={storeSenderProfile()} />);

    await screen.findByText("Активные");
    fireEvent.click(screen.getByRole("button", { name: "Открыть" }));
    await screen.findByTestId("link-invite-list-url");

    fireEvent.click(screen.getByRole("button", { name: "Скопировать ссылку" }));

    await waitFor(() => {
      expect(screen.getByTestId("link-invite-row-share-hint-inv-copy")).toHaveTextContent(
        "Ссылка скопирована",
      );
    });
    expect(screen.getByTestId("link-invite-row-share-hint-inv-copy")).toHaveAttribute("role", "status");
    expect(writeText).toHaveBeenCalledWith("http://127.0.0.1:4312/invite/copy-me");
  });

  it("shows row-scoped fallback when list copy fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow({ id: "inv-fail" }));
    remcardFetch.mockResolvedValue(list);
    render(<PartnerLinkInvitePanel meProfile={storeSenderProfile()} />);

    await screen.findByText("Активные");
    fireEvent.click(screen.getByRole("button", { name: "Открыть" }));
    fireEvent.click(screen.getByRole("button", { name: "Скопировать ссылку" }));

    await waitFor(() => {
      expect(screen.getByTestId("link-invite-row-share-hint-inv-fail")).toHaveTextContent(
        /Скопируйте ссылку вручную/i,
      );
    });
  });

  it("copy invitation from list uses persisted note, not draft form comment", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(
      activeInviteRow({
        id: "inv-persist",
        note: "Persisted invite note",
        intendedPartnerType: "STORE",
      }),
    );
    remcardFetch.mockResolvedValue(list);
    render(<PartnerLinkInvitePanel meProfile={storeSenderProfile()} />);

    await screen.findByText("Активные");
    const draftField = screen.getByLabelText(/Комментарий или исключения/i);
    fireEvent.change(draftField, { target: { value: "DRAFT_FORM_LEAK" } });

    fireEvent.click(screen.getByRole("button", { name: "Открыть" }));
    fireEvent.click(screen.getByRole("button", { name: "Скопировать приглашение" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls.at(-1)?.[0] as string;
    expect(copied).toContain("Persisted invite note");
    expect(copied).not.toContain("DRAFT_FORM_LEAK");
    expect(copied).toContain("http://127.0.0.1:4312/invite/copy-me");
  });

  it("copy invitation without row note uses default formatter with persisted intended type", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(
      activeInviteRow({
        id: "inv-default",
        note: null,
        intendedPartnerType: "STORE",
      }),
    );
    remcardFetch.mockResolvedValue(list);
    render(<PartnerLinkInvitePanel meProfile={storeSenderProfile()} />);

    await screen.findByText("Активные");
    fireEvent.change(screen.getByLabelText(/Предполагаемый тип партнёра/i), {
      target: { value: "MASTER" },
    });
    fireEvent.change(screen.getByLabelText(/Комментарий или исключения/i), {
      target: { value: "DRAFT_FORM_LEAK" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Открыть" }));
    fireEvent.click(screen.getByRole("button", { name: "Скопировать приглашение" }));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls.at(-1)?.[0] as string;
    expect(copied).not.toContain("DRAFT_FORM_LEAK");
    expect(copied).toContain("Покупки по рекомендациям специалистов");
  });
});