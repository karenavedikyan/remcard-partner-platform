import { describe, expect, it } from "vitest";
import {
  businessOrgProfileSectionNav,
  orgStaffWorkplaceSectionAllowed,
  profileSectionNavLabels,
} from "./profile-section-access";
import { PROFILE_SECTION_NAV } from "./profile-sections";

describe("profile-section-access", () => {
  it("uses the same canonical nav labels for business owner and org staff chrome", () => {
    expect(profileSectionNavLabels(businessOrgProfileSectionNav())).toEqual(
      profileSectionNavLabels(PROFILE_SECTION_NAV),
    );
  });

  it("allows overview always and team only with capability", () => {
    expect(orgStaffWorkplaceSectionAllowed("overview", { canOpenTeamSection: false })).toBe(true);
    expect(orgStaffWorkplaceSectionAllowed("team", { canOpenTeamSection: false })).toBe(false);
    expect(orgStaffWorkplaceSectionAllowed("team", { canOpenTeamSection: true })).toBe(true);
    expect(orgStaffWorkplaceSectionAllowed("catalog", { canOpenTeamSection: true })).toBe(false);
  });
});
