import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PartnerLinkInviteGallery } from "./PartnerLinkInviteGallery";
import { emptyLinkInviteList, type LinkInviteListRow } from "@/lib/link-invite-list";
import type { ProProfileResponse } from "@/lib/types";
import { rememberLinkInviteRecipientLabel } from "@/lib/link-invite-gallery-storage";

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
  } as unknown as ProProfileResponse;
}

function activeInviteRow(overrides: Partial<LinkInviteListRow> = {}): LinkInviteListRow {
  return {
    id: "inv-copy",
    status: "PENDING",
    statusLabel: "Активно",
    expiresAt: "2099-06-01T00:00:00.000Z",
    legacyTtl: false,
    createdAt: "2026-11-19T10:00:00.000Z",
    acceptedAt: null,
    intendedPartnerType: "MASTER",
    note: "Persisted invite note",
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

describe("PartnerLinkInviteGallery", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  it("copies invitation text with blank line before url from card footer", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow());
    remcardFetch.mockResolvedValue(list);

    render(
      <PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />,
    );

    await screen.findByTestId("link-invite-card-inv-copy");
    rememberLinkInviteRecipientLabel("inv-copy", "Илья Лебедев");
    fireEvent.click(screen.getByTestId("link-invite-copy"));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const copied = writeText.mock.calls[0]?.[0] as string;
    expect(copied).toMatch(/Persisted invite note\n\nhttp:\/\/127\.0\.0\.1:4312\/invite\/copy-me/);
    expect(await screen.findByTestId("link-invite-gallery-hint-inv-copy")).toHaveTextContent(
      /скопирован/i,
    );
  });

  it("shows empty search state without clearing query when switching view", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push(activeInviteRow({ note: "Alpha" }));
    remcardFetch.mockResolvedValue(list);

    render(
      <PartnerLinkInviteGallery open onClose={() => {}} meProfile={storeSenderProfile()} />,
    );

    const search = await screen.findByTestId("link-invite-gallery-search");
    fireEvent.change(search, { target: { value: "нет-такого" } });
    expect(await screen.findByTestId("link-invite-gallery-empty")).toHaveTextContent(/Ничего не найдено/);
    fireEvent.click(screen.getByRole("button", { name: "Список" }));
    expect(search).toHaveValue("нет-такого");
  });
});