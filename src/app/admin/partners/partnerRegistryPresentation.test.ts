import { describe, expect, it } from "vitest";
import type { PartnerRegistryItem } from "@/lib/prof-admin-partners-api";
import {
  catalogDetailCopy,
  catalogVisibilityToken,
} from "./partnerRegistryPresentation";

function row(partial: Partial<PartnerRegistryItem> = {}): PartnerRegistryItem {
  return {
    id: "p1",
    publicId: "P001",
    displayName: "Test",
    partnerType: "AGENT",
    city: "City",
    registrationLabel: "ACTIVE",
    lifecycle: null,
    ...partial,
  };
}

describe("catalogVisibilityToken unknown handling", () => {
  it("keeps unknown when catalogVisibility and lifecycle signals are absent", () => {
    const token = catalogVisibilityToken(row({ catalogVisibility: undefined, lifecycle: null }));
    expect(token).toEqual({ label: "Нет данных", visible: null });
    expect(catalogDetailCopy(token)).toBe("Нет данных с сервера");
  });

  it("does not treat missing optional fields as hidden catalog", () => {
    const token = catalogVisibilityToken(row({ catalogVisibility: undefined }));
    expect(token.visible).toBeNull();
    expect(catalogDetailCopy(token)).not.toBe("Не отображается на сайте");
  });

  it("maps explicit VISIBLE / HIDDEN / catalogHiddenAt", () => {
    expect(catalogVisibilityToken(row({ catalogVisibility: "VISIBLE" })).visible).toBe(true);
    expect(catalogVisibilityToken(row({ catalogVisibility: "HIDDEN" })).visible).toBe(false);
    expect(
      catalogVisibilityToken(
        row({
          catalogVisibility: undefined,
          lifecycle: { catalogHiddenAt: "2026-01-01", projectArchivedAt: null },
        }),
      ).visible,
    ).toBe(false);
  });
});
