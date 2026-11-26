import { describe, expect, it } from "vitest";
import type { CabinetPresentationSnapshot } from "@/lib/cabinet-presentation/types";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import { COMPANY_DESKTOP_NAV } from "@/lib/business-nav/sections";
import {
  DOORS_CALCULATOR_HREF,
  doorCalculatorFeatureVisible,
  filterBusinessDesktopNav,
  organizationHasDoorsCategory,
} from "./access";

function presentation(
  navMode: CabinetPresentationSnapshot["navMode"],
  proContext: ProContextSnapshot | null,
): Pick<CabinetPresentationSnapshot, "navMode" | "proContext"> {
  return { navMode, proContext };
}

const ORG_DOORS: ProContextSnapshot = {
  role: "ORG_OWNER",
  organization: { id: "1", name: "Co", partnerType: "COMPANY", storeCategories: ["doors"] },
};

const EMPLOYEE_DOORS: ProContextSnapshot = {
  role: "ORG_EMPLOYEE",
  organization: { id: "1", name: "Co", partnerType: "COMPANY", storeCategories: ["doors"] },
};

const EMPLOYEE_NO_DOORS: ProContextSnapshot = {
  role: "ORG_EMPLOYEE",
  organization: { id: "1", name: "Shop", partnerType: "STORE", storeCategories: ["flooring"] },
};

function navHasDoorCalc(p: Pick<CabinetPresentationSnapshot, "navMode" | "proContext">): boolean {
  return filterBusinessDesktopNav(COMPANY_DESKTOP_NAV, p).some((i) => i.href === DOORS_CALCULATOR_HREF);
}

describe("door calculator access", () => {
  it("detects doors category on organization", () => {
    expect(organizationHasDoorsCategory(ORG_DOORS)).toBe(true);
    expect(organizationHasDoorsCategory(EMPLOYEE_NO_DOORS)).toBe(false);
  });

  it("owner with doors sees feature and nav item", () => {
    const p = presentation("business-company", ORG_DOORS);
    expect(doorCalculatorFeatureVisible(p)).toBe(true);
    expect(navHasDoorCalc(p)).toBe(true);
  });

  it("employee with doors sees feature and nav item (same org category)", () => {
    const p = presentation("business-company", EMPLOYEE_DOORS);
    expect(doorCalculatorFeatureVisible(p)).toBe(true);
    expect(navHasDoorCalc(p)).toBe(true);
  });

  it("company/store without doors category hides feature and nav", () => {
    const p = presentation("business-store", EMPLOYEE_NO_DOORS);
    expect(doorCalculatorFeatureVisible(p)).toBe(false);
    expect(navHasDoorCalc(p)).toBe(false);
  });

  it("master workplace never shows feature", () => {
    const p = presentation("master", {
      role: "SOLO_PARTNER",
      organization: { id: "1", name: "M", storeCategories: ["doors"] },
    });
    expect(doorCalculatorFeatureVisible(p)).toBe(false);
    expect(navHasDoorCalc(p)).toBe(false);
  });

  it("agent workplace never shows feature", () => {
    const p = presentation("agent", {
      role: "SOLO_PARTNER",
      partnerActivities: ["AGENT"],
      organization: null,
    });
    expect(doorCalculatorFeatureVisible(p)).toBe(false);
    expect(navHasDoorCalc(p)).toBe(false);
  });
});