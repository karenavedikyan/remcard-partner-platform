import { describe, expect, it } from "vitest";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import {
  PARTNER_SEARCH_LIFECYCLE_ACTION,
  adminSearchOverrideSettingLabel,
  effectivePartnerSearchPrimaryLabel,
  partnerSearchActionControl,
} from "./partnerSearchControl";

function row(overrides: Partial<PartnerRegistryItem> = {}): PartnerRegistryItem {
  return {
    id: "p1",
    publicId: null,
    displayName: "Demo",
    partnerType: "STORE",
    city: "Moscow",
    registrationLabel: "DEMO",
    lifecycle: null,
    ...overrides,
  };
}

describe("partnerSearchControl", () => {
  it("labels admin-visible demo without implying registration", () => {
    const r = row({
      registrationLabel: "DEMO",
      catalogVisibility: "VISIBLE",
      partnerSearchVisibility: {
        visible: true,
        reasonCode: "admin_show",
        reasonLabel: "",
        adminOverride: "SHOW",
      },
    });
    expect(effectivePartnerSearchPrimaryLabel(r)).toBe("Виден партнёрам по решению администратора");
    expect(adminSearchOverrideSettingLabel(r.partnerSearchVisibility)).toContain("Показывать");
  });

  it("explains hard gate when admin SHOW cannot take effect", () => {
    const r = row({
      partnerSearchVisibility: {
        visible: false,
        reasonCode: "project_archived",
        reasonLabel: "Профиль в архиве проекта",
        adminOverride: "SHOW",
      },
    });
    expect(effectivePartnerSearchPrimaryLabel(r)).toContain("ограничение");
    expect(partnerSearchActionControl(r, PARTNER_SEARCH_LIFECYCLE_ACTION.show).disabled).toBe(true);
  });

  it("disables reset when already on AUTO policy", () => {
    const r = row({
      partnerSearchVisibility: {
        visible: false,
        reasonCode: "demo_account",
        reasonLabel: "Демо",
        adminOverride: "AUTO",
      },
    });
    expect(partnerSearchActionControl(r, PARTNER_SEARCH_LIFECYCLE_ACTION.reset).disabled).toBe(true);
  });

  it("falls back when visibility DTO is absent", () => {
    expect(effectivePartnerSearchPrimaryLabel(row())).toBeNull();
    expect(adminSearchOverrideSettingLabel(undefined)).toBe("По правилам регистрации");
  });
});
