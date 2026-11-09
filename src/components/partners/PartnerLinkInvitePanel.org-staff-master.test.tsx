import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

describe("PartnerLinkInvitePanel org COMPANY + MASTER", () => {
  it("shows editable category rows when inviterSide carries org storeCategories", async () => {
    const user = userEvent.setup();
    const orgCtx = organizationPartnershipReadContextFromProContext({
      proContext: fixtureSergeyOrgEmployeeContext(),
      contextReady: true,
      actorUserId: "client-sergey",
    });
    const inviterSide = partnerSideFromOrganizationReadContext(orgCtx!);
    expect(inviterSide.id).toBe(FIXTURE_OPTOVIK_OWNER_PRO_ID);

    render(
      <PartnerLinkInvitePanel
        meProfile={emptyClientProfile}
        inviterSide={inviterSide}
        wizard
        showSectionTitle={false}
      />,
    );

    await user.type(screen.getByLabelText(/Имя или название партнёра/i), "Проверка");
    const typeSelect = screen.getByRole("combobox", { name: /Предполагаемый тип партнёра/i });
    await user.selectOptions(typeSelect, "MASTER");
    await user.click(screen.getByRole("button", { name: /Далее: сообщение/i }));
    await user.click(screen.getByRole("button", { name: /Далее: проверить/i }));

    expect(screen.getByTestId("link-invite-category-doors")).toBeInTheDocument();
    expect(screen.getByTestId("link-invite-category-handles")).toBeInTheDocument();
    expect(screen.queryByText(/1 направление/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Создать приглашение/i })).not.toBeDisabled();
  });
});
