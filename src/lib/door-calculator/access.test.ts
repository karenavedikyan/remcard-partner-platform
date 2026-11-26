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

describe("door calculator access", () => {
  it("detects doors category on organization", () => {
    expect(
      organizationHasDoorsCategory({
        role: "ORG_OWNER",
        organization: { id: "1", name: "X", storeCategories: ["doors", "flooring"] },
      }),
    ).toBe(true);
    expect(
      organizationHasDoorsCategory({
        role: "ORG_OWNER",
        organization: { id: "1", name: "X", storeCategories: ["flooring"] },
      }),
    ).toBe(false);
  });

  it("company with doors sees feature", () => {
    const visible = doorCalculatorFeatureVisible(
      presentation("business-company", {
        role: "ORG_OWNER",
        organization: { id: "1", name: "Co", partnerType: "COMPANY", storeCategories: ["doors"] },
      }),
    );
    expect(visible).toBe(true);
  });

  it("store without doors hides feature", () => {
    expect(
      doorCalculatorFeatureVisible(
        presentation("business-store", {
          role: "ORG_OWNER",
          organization: { id: "1", name: "Shop", partnerType: "STORE", storeCategories: ["flooring"] },
        }),
      ),
    ).toBe(false);
  });

  it("master nav mode never shows feature", () => {
    expect(
      doorCalculatorFeatureVisible(
        presentation("master", {
          role: "SOLO_PARTNER",
          organization: null,
        }),
      ),
    ).toBe(false);
  });

  it("filters desktop nav item by category", () => {
    const withDoors = filterBusinessDesktopNav(
      COMPANY_DESKTOP_NAV,
      presentation("business-company", {
        role: "ORG_EMPLOYEE",
        organization: { id: "1", name: "Co", partnerType: "COMPANY", storeCategories: ["doors"] },
      }),
    );
    expect(withDoors.some((i) => i.href === DOORS_CALCULATOR_HREF)).toBe(true);

    const noDoors = filterBusinessDesktopNav(
      COMPANY_DESKTOP_NAV,
      presentation("business-company", {
        role: "ORG_EMPLOYEE",
        organization: { id: "1", name: "Co", partnerType: "COMPANY", storeCategories: [] },
      }),
    );
    expect(noDoors.some((i) => i.href === DOORS_CALCULATOR_HREF)).toBe(false);
  });
});