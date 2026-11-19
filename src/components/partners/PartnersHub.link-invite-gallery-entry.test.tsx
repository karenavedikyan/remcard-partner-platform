import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import { emptyLinkInviteList } from "@/lib/link-invite-list";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({ products: [], services: [], stages: [] }),
}));

const remcardFetch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api-client", () => ({
  remcardFetch,
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const storeProfile: ProProfileResponse = {
  organization: {
    id: "org-store",
    name: "Магазин",
    catalogStatus: "APPROVED",
    partnerType: "STORE",
    branchCount: 1,
    storeCategories: ["doors"],
    specializations: [],
  },
  programs: [],
  user: {
    id: "store-me",
    publicId: "RC-STORE",
    displayName: "Оптовик",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "STORE",
    partnerActivities: ["STORE"],
    description: null,
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: ["doors"],
    areas: [],
    website: null,
    telegram: null,
    whatsapp: null,
    instagram: null,
    vk: null,
    max: null,
    yandex: null,
    publicEmail: null,
    publicPhone: null,
    showFullName: false,
  },
};

function mockHubApi() {
  remcardFetch.mockImplementation(async (path: string) => {
    if (path.includes("/api/partnership/link-invite")) {
      return emptyLinkInviteList();
    }
    if (path.includes("/api/partnership/list")) {
      return { partnerships: [], subjectUserId: "store-me" };
    }
    if (path.includes("/api/pro/me")) {
      return storeProfile;
    }
    return {};
  });
}

describe("PartnersHub link invite gallery entry points", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    mockHubApi();
  });

  it("opens gallery from link modal surface (mobile wizard entry)", async () => {
    render(
      <PartnersHub
        meId="store-me"
        initialProfile={storeProfile}
        variant="agent-r04"
        agentModalSurface="link"
        partnersAudience="business-store-r04"
        proContextReady
        proContext={{
          viewerUserId: "store-me",
          canEditCertificatePolicy: false,
          canViewCertificatePolicy: false,
        }}
      />,
    );

    const openGallery = await screen.findByTestId("link-invite-open-gallery");
    await userEvent.click(openGallery);

    const dialog = await screen.findByTestId("link-invite-gallery");
    expect(dialog).toBeVisible();
    expect(screen.getByTestId("agent-r04-modal-link")).toBeInTheDocument();
  });

  it("opens gallery from true-empty overview without outgoing waiting tile", async () => {
    render(
      <PartnersHub
        meId="store-me"
        initialProfile={storeProfile}
        variant="agent-r04"
        agentPresentation="overview"
        partnersAudience="business-store-r04"
        proContextReady
        proContext={{
          viewerUserId: "store-me",
          canEditCertificatePolicy: false,
          canViewCertificatePolicy: false,
        }}
      />,
    );

    await screen.findByTestId("partners-empty");
    expect(screen.queryByTestId("partners-tile-waiting")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("partners-onboarding-cta-link-invites"));
    expect(await screen.findByTestId("link-invite-gallery")).toBeVisible();
  });

  it("keeps gallery open when Escape hits nested revoke confirm", async () => {
    remcardFetch.mockImplementation(async (path: string) => {
      if (path.includes("/api/partnership/link-invite")) {
        return {
          ...emptyLinkInviteList(),
          resurfaceEnabled: true,
          active: {
            items: [
              {
                id: "inv-pending",
                status: "PENDING",
                statusLabel: "Активно",
                expiresAt: "2099-01-01T00:00:00.000Z",
                legacyTtl: false,
                createdAt: "2026-11-19T10:00:00.000Z",
                acceptedAt: null,
                intendedPartnerType: "MASTER",
                note: "note",
                partnershipId: null,
                previewPath: "/invite/x",
                canCopyLink: true,
                canReissue: false,
                canEditPersonalLabel: true,
                createdBy: { userId: "u1", displayName: "Автор", at: "2026-11-19T10:00:00.000Z" },
                acceptedBy: null,
                terms: [
                  { category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false },
                ],
              },
            ],
            nextCursor: null,
          },
        };
      }
      if (path.includes("/api/partnership")) {
        return { partnerships: [], subjectUserId: "store-me" };
      }
      if (path.includes("/api/pro/me")) {
        return storeProfile;
      }
      return {};
    });

    render(
      <PartnersHub
        meId="store-me"
        initialProfile={storeProfile}
        variant="agent-r04"
        agentModalSurface="link"
        partnersAudience="business-store-r04"
        proContextReady
        proContext={{
          viewerUserId: "store-me",
          canEditCertificatePolicy: false,
          canViewCertificatePolicy: false,
        }}
      />,
    );

    await userEvent.click(await screen.findByTestId("link-invite-open-gallery"));
    await screen.findByTestId("link-invite-card-inv-pending");
    await userEvent.click(screen.getByRole("button", { name: "Отозвать ссылку" }));
    await waitFor(() => expect(screen.getByTestId("link-invite-revoke-confirm")).toBeInTheDocument());

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("link-invite-gallery")).toBeVisible();
    await waitFor(() => expect(screen.queryByTestId("link-invite-revoke-confirm")).not.toBeInTheDocument());
  });
});