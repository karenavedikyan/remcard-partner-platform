import { describe, expect, it } from "vitest";
import {
  ADMIN_R1_HIDDEN_VIEWS,
  ADMIN_R1_NAV,
  ADMIN_R1_RELEASE,
  adminR1NavForRelease,
  adminR1NavActive,
} from "@/lib/admin-r1/nav";
import { adminR1PartnerKindLabel, formatAdminR1Money } from "@/lib/admin-r1/api";

describe("Admin R1 nav + adapters", () => {
  it("keeps R1 screens and hides tasks/R2", () => {
    const ids = adminR1NavForRelease(ADMIN_R1_RELEASE).map((i) => i.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "overview",
        "partners",
        "clients",
        "team",
        "analytics",
        "results",
        "notifications",
        "settings",
        "moderation",
      ]),
    );
    expect(ids).not.toContain("tasks");
    expect(ADMIN_R1_HIDDEN_VIEWS).toContain("tasks");
    expect(ADMIN_R1_NAV.every((i) => i.release === 1)).toBe(true);
  });

  it("marks nested partner routes active", () => {
    expect(adminR1NavActive("/admin/partners/abc", "/admin/partners")).toBe(true);
    expect(adminR1NavActive("/admin", "/admin/overview")).toBe(true);
  });

  it("labels kinds from DTO adapter without local AGENT classifier", () => {
    expect(adminR1PartnerKindLabel("agent")).toBe("Агент");
    expect(adminR1PartnerKindLabel("company")).toBe("Компания");
    expect(formatAdminR1Money(1000)).toMatch(/₽/);
  });
});
