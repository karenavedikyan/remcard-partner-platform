import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PartnerLinkInvitePanel } from "./PartnerLinkInvitePanel";
import {
  fixtureSergeyOrgEmployeeContext,
  FIXTURE_OPTOVIK_OWNER_PRO_ID,
} from "@/lib/employee-workspace-data/fixtures";
import {
  organizationPartnershipReadContextFromProContext,
  partnerSideFromOrganizationReadContext,
} from "@/lib/employee-workspace-data/organization-partnership-read";
import type { ProProfileResponse } from "@/lib/types";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(async () => ({ invites: [] })),
  RemcardApiError: class extends Error {},
}));

const emptyClientProfile: ProProfileResponse = {
  user: {
    id: "client-sergey",
    role: "CLIENT",
    partnerType: null,
    partnerActivities: [],
    storeCategories: [],
    specializations: [],
    displayName: "Sergey",
    city: null,
    photoUrl: null,
    badges: [],
    workingProductCategoryIds: [],
    workingServiceSpecializationIds: [],
    workingNavigatorStageIds: [],
    storeWorkingHours: null,
    isPublic: false,
    publicId: null,
  },
  organization: null,
};

describe("PartnerLinkInvitePanel org staff inviter side", () => {
  it("resolves owner COMPANY categories and shows block reason from empty personal profile", () => {
    const orgCtx = organizationPartnershipReadContextFromProContext({
      proContext: fixtureSergeyOrgEmployeeContext(),
      contextReady: true,
      actorUserId: "client-sergey",
    });
    const inviterSide = partnerSideFromOrganizationReadContext(orgCtx!);
    expect(inviterSide.id).toBe(FIXTURE_OPTOVIK_OWNER_PRO_ID);

    render(
      <PartnerLinkInvitePanel meProfile={emptyClientProfile} inviterSide={inviterSide} />,
    );

    expect(screen.getByText(/Укажите предполагаемый тип партнёра/i)).toBeInTheDocument();
    expect(screen.queryByText(/1 направление/i)).not.toBeInTheDocument();
  });
});
