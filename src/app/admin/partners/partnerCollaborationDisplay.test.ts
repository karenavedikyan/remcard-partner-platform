import { describe, expect, it } from "vitest";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import {
  collaborationVisibilityPresentation,
  collaborationVisibilityPrimaryLabel,
  formatRegistryCount,
  partnershipCountsSummary,
} from "./partnerCollaborationDisplay";
import { catalogStatusLabel } from "./partnerRegistryDisplay";

function baseRow(overrides: Partial<PartnerRegistryItem> = {}): PartnerRegistryItem {
  return {
    id: "p1",
    publicId: null,
    displayName: "Partner",
    partnerType: "STORE",
    city: "Moscow",
    registrationLabel: "ACTIVE",
    lifecycle: null,
    ...overrides,
  };
}

describe("partnerCollaborationDisplay", () => {
  it("shows visible for registered partner with server visibility true (independent of catalog)", () => {
    const row = baseRow({
      registrationLabel: "ACTIVE",
      catalogVisibility: "NOT_PUBLISHED",
      partnerSearchVisibility: { visible: true, reasonCode: "ok", reasonLabel: "" },
    });
    expect(collaborationVisibilityPrimaryLabel(collaborationVisibilityPresentation(row))).toBe(
      "Виден партнёрам",
    );
    expect(catalogStatusLabel(row)).toBe("Не опубликован");
  });

  it("shows hidden with reason for demo partner that is public in catalog", () => {
    const row = baseRow({
      registrationLabel: "DEMO",
      catalogVisibility: "VISIBLE",
      partnerSearchVisibility: {
        visible: false,
        reasonCode: "demo_account",
        reasonLabel: "Демо-аккаунт не участвует в поиске",
      },
    });
    const vis = collaborationVisibilityPresentation(row);
    expect(collaborationVisibilityPrimaryLabel(vis)).toBe("Не виден партнёрам");
    expect(vis.kind === "hidden" && vis.reasonLabel).toBe("Демо-аккаунт не участвует в поиске");
    expect(vis.kind === "hidden" && vis.adminSettingLabel).toBe("По правилам регистрации");
    expect(catalogStatusLabel(row)).toBe("Виден в каталоге");
  });

  it("does not infer visibility or counts from registration/catalog when server fields absent", () => {
    const row = baseRow({
      registrationLabel: "DEMO",
      catalogVisibility: "VISIBLE",
    });
    expect(collaborationVisibilityPrimaryLabel(collaborationVisibilityPresentation(row))).toBe("Нет данных");
    expect(partnershipCountsSummary(row)).toEqual({
      active: "Нет данных",
      total: "Нет данных",
      hasData: false,
    });
  });

  it("distinguishes numeric zero from missing count fields", () => {
    expect(formatRegistryCount(0)).toBe("0");
    expect(formatRegistryCount(undefined)).toBe("—");
    const row = baseRow({
      partnershipCounts: {
        active: 0,
        invited: 2,
        pending: 0,
        paused: 0,
        ended: 1,
        total: 3,
      },
    });
    expect(partnershipCountsSummary(row).active).toBe("0");
    expect(partnershipCountsSummary(row).total).toBe("3");
    const partial = baseRow({
      partnershipCounts: {
        active: 0,
        invited: 0,
        pending: 0,
        paused: 0,
        ended: 0,
        total: undefined as unknown as number,
      },
    });
    expect(partnershipCountsSummary(partial).total).toBe("—");
  });
});
