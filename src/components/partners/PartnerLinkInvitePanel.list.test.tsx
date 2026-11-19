import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PartnerLinkInvitePanel } from "./PartnerLinkInvitePanel";
import { emptyLinkInviteList } from "@/lib/link-invite-list";
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

describe("PartnerLinkInvitePanel list resurface", () => {
  it("shows active invite with copyable url after expand", async () => {
    const list = { ...emptyLinkInviteList(), resurfaceEnabled: true };
    list.active.items.push({
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
    });

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
  });
});