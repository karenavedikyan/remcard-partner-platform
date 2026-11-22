import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MiniAppInvitePartner } from "./MiniAppInvitePartner";
import { remcardFetch } from "@/lib/api-client";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {},
}));

vi.mock("@/lib/config", () => ({
  getAppUrl: () => "https://prof.remcard.ru",
}));

describe("MiniAppInvitePartner", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("requests link-invite listVersion=2 and uses active copyable row", async () => {
    vi.mocked(remcardFetch).mockResolvedValue({
      listVersion: 2,
      resurfaceEnabled: true,
      active: {
        items: [
          {
            id: "inv-1",
            status: "PENDING",
            statusLabel: "Активно",
            expiresAt: "2099-01-01T00:00:00.000Z",
            legacyTtl: false,
            createdAt: "2026-01-01T00:00:00.000Z",
            acceptedAt: null,
            intendedPartnerType: null,
            note: null,
            partnershipId: null,
            previewPath: "/invite/abc-token",
            canCopyLink: true,
            canReissue: false,
            createdBy: { userId: "u1", displayName: "Owner", at: "2026-01-01T00:00:00.000Z" },
            acceptedBy: null,
            terms: [],
          },
        ],
        nextCursor: null,
      },
      archive: { items: [], nextCursor: null },
      activeLimit: 50,
    });

    render(<MiniAppInvitePartner partnersSearchUrl="https://prof.remcard.ru/partners" onBack={() => {}} />);

    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/partnership/link-invite", {
        searchParams: { listVersion: "2" },
      });
    });
    expect(await screen.findByTestId("mini-invite-link")).toHaveValue(
      "https://prof.remcard.ru/invite/abc-token",
    );
  });
});