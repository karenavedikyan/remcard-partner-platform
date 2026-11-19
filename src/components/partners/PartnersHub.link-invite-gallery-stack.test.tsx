import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersCabinetPage } from "./PartnersCabinetPage";
import { emptyLinkInviteList } from "@/lib/link-invite-list";
import { resolvePartnersHubPresentation } from "@/lib/partners-hub-presentation";
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

const presentation = resolvePartnersHubPresentation({
  r04: null,
  r06: null,
  business: { eligible: true, partnerType: "STORE" },
});

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

describe("Partners link invite gallery stack", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    mockHubApi();
  });

  it("shows page-heading CTA without expanding waiting zone", async () => {
    render(
      <PartnersCabinetPage
        presentation={presentation}
        meId="store-me"
        partnershipSubjectUserId="store-me"
        organizationReadContext={null}
        initialProfile={storeProfile}
        proContextReady
        proContext={{
          viewerUserId: "store-me",
          canEditCertificatePolicy: false,
          canViewCertificatePolicy: false,
        }}
      />,
    );

    const headerCta = await screen.findByTestId("partners-page-heading-cta-link-invites");
    expect(headerCta).toBeVisible();
    expect(screen.queryByTestId("partners-overview-cta-link-invites")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partners-zone-waiting")).not.toBeInTheDocument();
  });

  it("opens gallery from header and restores focus to the CTA", async () => {
    render(
      <PartnersCabinetPage
        presentation={presentation}
        meId="store-me"
        partnershipSubjectUserId="store-me"
        organizationReadContext={null}
        initialProfile={storeProfile}
        proContextReady
        proContext={{
          viewerUserId: "store-me",
          canEditCertificatePolicy: false,
          canViewCertificatePolicy: false,
        }}
      />,
    );

    const headerCta = await screen.findByTestId("partners-page-heading-cta-link-invites");
    await userEvent.click(headerCta);
    const gallery = await screen.findByTestId("link-invite-gallery");
    expect(gallery).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByTestId("link-invite-gallery")).not.toBeInTheDocument());
    await waitFor(() => expect(document.activeElement).toBe(headerCta));
  });

  it("pauses hub modal while gallery is open from the link wizard with draft data", async () => {
    render(
      <PartnersCabinetPage
        presentation={presentation}
        meId="store-me"
        partnershipSubjectUserId="store-me"
        organizationReadContext={null}
        initialProfile={storeProfile}
        proContextReady
        proContext={{
          viewerUserId: "store-me",
          canEditCertificatePolicy: false,
          canViewCertificatePolicy: false,
        }}
      />,
    );

    await userEvent.click(await screen.findByTestId("partners-onboarding-cta-link"));
    await screen.findByTestId("agent-partner-hub-modal");

    const recipient = await screen.findByLabelText(/Имя или название партнёра/i);
    await userEvent.type(recipient, "Тестовый партнёр");

    const galleryBtn = screen.getByTestId("link-invite-open-gallery");
    await userEvent.click(galleryBtn);

    const hubModal = screen.getByTestId("agent-partner-hub-modal");
    expect(hubModal).toHaveAttribute("data-overlay-paused", "true");
    expect(screen.getByTestId("link-invite-gallery")).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape", bubbles: true });
    await waitFor(() => expect(screen.queryByTestId("link-invite-gallery")).not.toBeInTheDocument());
    expect(hubModal).toHaveAttribute("data-overlay-paused", "false");
    expect(recipient).toHaveValue("Тестовый партнёр");
    await waitFor(() => expect(document.activeElement).toBe(galleryBtn));
    expect(screen.queryByTestId("partner-invite-discard-confirm")).not.toBeInTheDocument();
  });
});