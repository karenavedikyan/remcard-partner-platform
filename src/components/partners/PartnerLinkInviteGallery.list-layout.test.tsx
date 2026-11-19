import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerLinkInviteGallery } from "./PartnerLinkInviteGallery";
import { emptyLinkInviteList, type LinkInviteListRow } from "@/lib/link-invite-list";
import type { ProProfileResponse } from "@/lib/types";

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
    programs: [],
  } as ProProfileResponse;
}

function activeInviteRow(overrides: Partial<LinkInviteListRow> = {}): LinkInviteListRow {
  return {
    id: "inv-list",
    status: "PENDING",
    statusLabel: "Активно",
    expiresAt: "2099-01-01T00:00:00.000Z",
    legacyTtl: false,
    createdAt: "2026-11-19T10:00:00.000Z",
    acceptedAt: null,
    intendedPartnerType: "MASTER",
    note: "Мастер Иван",
    recipientLabel: "Мастер Иван",
    partnershipId: null,
    previewPath: "/invite/list",
    canCopyLink: true,
    canReissue: false,
    canEditPersonalLabel: true,
    createdBy: { userId: "u1", displayName: "Автор", at: "2026-11-19T10:00:00.000Z" },
    acceptedBy: null,
    terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
    ...overrides,
  };
}

describe("PartnerLinkInviteGallery list layout", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
  });

  it("keeps conditions, copy and revoke on the same compact row as metadata", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow());
    remcardFetch.mockResolvedValue(list);

    render(<PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />);
    await screen.findByTestId("link-invite-card-inv-list");
    fireEvent.click(screen.getByRole("button", { name: "Список" }));

    const row = screen.getByTestId("link-invite-list-row-inv-list");
    const record = within(row).getByTestId("link-invite-list-record");
    const actions = within(record).getByTestId("link-invite-list-actions");

    expect(within(record).getByText("Мастер Иван")).toBeInTheDocument();
    expect(within(record).getByText("Специалист")).toBeInTheDocument();
    expect(within(record).getByRole("button", { name: "Изменить частное название" })).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: /Условия/i })).toBeInTheDocument();
    expect(within(actions).getByTestId("link-invite-copy")).toBeInTheDocument();
    expect(within(actions).getByRole("button", { name: "Отозвать ссылку" })).toBeInTheDocument();
    expect(within(actions).queryByRole("button", { name: "Изменить частное название" })).toBeNull();
  });

  it("list title pencil hidden for archive even when rename allowed", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.archive.items.push(
      activeInviteRow({
        id: "arch-edit",
        status: "ACCEPTED",
        acceptedAt: "2026-11-20T10:00:00.000Z",
        acceptedBy: { userId: "u2", displayName: "Партнёр", at: "2026-11-20T10:00:00.000Z" },
        canEditPersonalLabel: true,
      }),
    );
    remcardFetch.mockResolvedValue(list);

    render(
      <PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} defaultPhase="archive" />,
    );
    await screen.findByTestId("link-invite-gallery");
    fireEvent.click(screen.getByRole("button", { name: "Список" }));
    await screen.findByTestId("link-invite-list-row-arch-edit");

    const row = screen.getByTestId("link-invite-list-row-arch-edit");
    expect(within(row).queryByRole("button", { name: "Изменить частное название" })).toBeNull();
  });

  it("archive list rows omit invitation actions", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.archive.items.push(
      activeInviteRow({
        id: "arch-1",
        status: "ACCEPTED",
        acceptedAt: "2026-11-20T10:00:00.000Z",
        acceptedBy: { userId: "u2", displayName: "Партнёр", at: "2026-11-20T10:00:00.000Z" },
      }),
    );
    remcardFetch.mockResolvedValue(list);

    render(
      <PartnerLinkInviteGallery
        open
        onClose={() => {}}
        meProfile={storeSenderProfile()}
        defaultPhase="archive"
      />,
    );
    await screen.findByTestId("link-invite-gallery");
    fireEvent.click(screen.getByRole("button", { name: "Список" }));
    await screen.findByTestId("link-invite-gallery-archive-list");

    const row = screen.getByTestId("link-invite-list-row-arch-1");
    expect(within(row).queryByTestId("link-invite-list-actions")).toBeNull();
    expect(within(row).getByText(/Автор/)).toBeInTheDocument();
  });
});