import { describe, expect, it } from "vitest";
import {
  canIssueCertificates,
  certificateIssuedByLabel,
  certificateIssuerBranchIds,
} from "./certificate-issuance-access";
import type { ProContextSnapshot } from "./profile-cabinet-access";

const flags = (canManageCertificates: boolean) =>
  ({ canManageCertificates }) as NonNullable<ProContextSnapshot["effectivePermissions"]>;

function staffCtx(over: Partial<ProContextSnapshot> = {}): ProContextSnapshot {
  return {
    role: "BRANCH_MANAGER",
    branchRole: "MANAGER",
    branchAssignments: [
      { branchId: "b1", status: "ACTIVE", effectivePermissions: flags(true) },
      { branchId: "b2", status: "ACTIVE", effectivePermissions: flags(false) },
    ],
    ...over,
  };
}

describe("canIssueCertificates", () => {
  it("is unchanged (true) for owners, specialists and unknown context", () => {
    expect(canIssueCertificates({ role: "ORG_OWNER" })).toBe(true);
    expect(canIssueCertificates({ role: "SOLO_PARTNER" })).toBe(true);
    expect(canIssueCertificates(null)).toBe(true);
  });

  it("allows an employee who manages certificates on an active branch", () => {
    expect(canIssueCertificates(staffCtx())).toBe(true);
    expect(certificateIssuerBranchIds(staffCtx())).toEqual(["b1"]);
  });

  it("denies an employee without canManageCertificates anywhere", () => {
    const ctx = staffCtx({
      role: "BRANCH_EMPLOYEE",
      branchAssignments: [{ branchId: "b1", status: "ACTIVE", effectivePermissions: flags(false) }],
    });
    expect(canIssueCertificates(ctx)).toBe(false);
  });

  it("denies suspended assignments and VIEWER", () => {
    expect(
      canIssueCertificates(
        staffCtx({
          branchAssignments: [{ branchId: "b1", status: "SUSPENDED", effectivePermissions: flags(true) }],
        }),
      ),
    ).toBe(false);
    expect(canIssueCertificates(staffCtx({ branchRole: "VIEWER" }))).toBe(false);
  });
});

describe("certificateIssuedByLabel", () => {
  it("formats the issuing employee and stays empty for legacy rows", () => {
    expect(certificateIssuedByLabel({ issuedBy: { name: " Иван Петров " } })).toBe("Выпустил: Иван Петров");
    expect(certificateIssuedByLabel({ issuedBy: null })).toBeNull();
    expect(certificateIssuedByLabel({})).toBeNull();
    expect(certificateIssuedByLabel({ issuedBy: { name: "  " } })).toBeNull();
  });
});
