import { describe, expect, it } from "vitest";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import {
  appendStoreOrderBranchQuery,
  isHeadOfficeNullContourOperator,
  isStorePurchaseBranchScoped,
  resolveScannerBranchContext,
  scannerAccessibleOperationBranches,
} from "@/lib/scanner-branch-context";

function sixBranchEmployeeContext(): ProContextSnapshot {
  const branches = [
    { id: "br_krd_rostov", name: "Ростов", city: "Краснодар" },
    { id: "br_krd_40let", name: "40 лет", city: "Краснодар" },
    { id: "br_krd_partizan", name: "Партизан", city: "Краснодар" },
    { id: "br_krd_novoross", name: "Новоросс", city: "Краснодар" },
    { id: "br_krd_rossiyskaya", name: "Российская", city: "Краснодар" },
    { id: "br_nvr_isaeva", name: "Исаева", city: "Новороссийск" },
  ];
  return {
    role: "BRANCH_EMPLOYEE",
    membershipKind: "HEAD_OFFICE",
    organization: { id: "org-opt", name: "ОПТОВИК", partnerType: "STORE" },
    branches,
    activeBranch: branches[0]!,
    branchAssignments: branches.map((b) => ({
      branchId: b.id,
      status: "ACTIVE" as const,
      effectivePermissions: {
        canActivateCertificates: b.id !== "br_krd_rossiyskaya",
      },
    })),
    effectivePermissions: { canActivateCertificates: true },
  };
}

describe("scanner-branch-context", () => {
  it("defaults operating branch to active accessible branch for multi-branch staff", () => {
    const resolution = resolveScannerBranchContext({
      contextReady: true,
      proContext: sixBranchEmployeeContext(),
    });
    expect(resolution).toMatchObject({
      kind: "ready",
      branchId: "br_krd_rostov",
      explicitChoice: false,
    });
    if (resolution.kind === "ready") {
      expect(resolution.options).toHaveLength(5);
    }
  });

  it("falls back to first permitted branch when active branch is not eligible", () => {
    const ctx = sixBranchEmployeeContext();
    const resolution = resolveScannerBranchContext({
      contextReady: true,
      proContext: {
        ...ctx,
        activeBranch: { id: "br_krd_rossiyskaya", name: "Российская", city: "Краснодар" },
      },
    });
    expect(resolution).toMatchObject({ kind: "ready", branchId: "br_krd_rostov" });
  });

  it("auto-resolves single accessible branch", () => {
    const ctx = sixBranchEmployeeContext();
    const only = ctx.branches![0]!;
    const resolution = resolveScannerBranchContext({
      contextReady: true,
      proContext: {
        ...ctx,
        branches: [only],
        branchAssignments: [
          { branchId: only.id, status: "ACTIVE", effectivePermissions: { canActivateCertificates: true } },
        ],
      },
    });
    expect(resolution).toMatchObject({ kind: "ready", branchId: only.id });
  });

  it("owner-like roles do not require branch", () => {
    const resolution = resolveScannerBranchContext({
      contextReady: true,
      proContext: { role: "ORG_OWNER", branches: [], organization: { id: "o", name: "O" } },
    });
    expect(resolution.kind).toBe("not_required");
  });

  it("encodes branch query for preview and order paths", () => {
    expect(appendStoreOrderBranchQuery("/api/store/order/preview", "br_krd_rostov")).toBe(
      "/api/store/order/preview?branchId=br_krd_rostov",
    );
    expect(appendStoreOrderBranchQuery("/api/store/order", "a b")).toBe(
      "/api/store/order?branchId=a%20b",
    );
  });

  it("filters inaccessible branches by per-branch permission", () => {
    const options = scannerAccessibleOperationBranches(sixBranchEmployeeContext());
    expect(options.map((o) => o.id)).not.toContain("br_krd_rossiyskaya");
    expect(options).toHaveLength(5);
  });
});

describe("AB-12: head-office / direct employee NULL contour (saved rights only)", () => {
  const org = { id: "o", name: "S", ownerId: "ow", partnerType: "STORE" as const };
  const ctx = (over: Record<string, unknown>) =>
    ({ organization: org, branches: [], activeBranch: null, ...over }) as unknown as ProContextSnapshot;
  const activate = { role: "MANAGER", flags: { canActivateCertificates: true } };

  it("ORG_EMPLOYEE with saved canActivateCertificates and HEAD_OFFICE member without assignments: not_required, not branch-scoped", () => {
    for (const proContext of [
      ctx({ role: "ORG_EMPLOYEE", rights: activate }),
      ctx({ role: "ORG_TEAM_MEMBER", membershipKind: "HEAD_OFFICE", branchAssignments: [], rights: activate }),
    ]) {
      expect(resolveScannerBranchContext({ contextReady: true, proContext })).toEqual({ kind: "not_required" });
      expect(isStorePurchaseBranchScoped(proContext)).toBe(false);
      expect(isHeadOfficeNullContourOperator(proContext)).toBe(true);
    }
  });

  it("no saved right / flag off / VIEWER / unknown flag: blocked as before, role alone never grants", () => {
    for (const rights of [
      undefined,
      { role: "MANAGER", flags: { canActivateCertificates: false } },
      { role: "MANAGER", flags: {} },
      { role: "VIEWER", flags: { canActivateCertificates: true } },
    ]) {
      for (const role of ["ORG_EMPLOYEE", "ORG_TEAM_MEMBER"]) {
        const r = resolveScannerBranchContext({ contextReady: true, proContext: ctx({ role, rights }) });
        expect(r.kind).toBe("blocked");
      }
    }
  });

  it("a head-office member WITH branch assignments keeps the branch flow: only permitted active branches, no NULL shortcut", () => {
    const proContext = ctx({
      role: "ORG_TEAM_MEMBER",
      membershipKind: "HEAD_OFFICE",
      branches: [{ id: "b1", name: "A", city: "C" }, { id: "b2", name: "B", city: "C" }],
      activeBranch: { id: "b1", name: "A", city: "C" },
      branchAssignments: [
        { branchId: "b1", status: "ACTIVE", effectivePermissions: { canActivateCertificates: true } },
        { branchId: "b2", status: "ACTIVE", effectivePermissions: { canActivateCertificates: false } },
      ],
      rights: activate,
    });
    expect(isStorePurchaseBranchScoped(proContext)).toBe(true);
    const r = resolveScannerBranchContext({ contextReady: true, proContext });
    expect(r).toMatchObject({ kind: "ready", branchId: "b1" });
    if (r.kind === "ready") expect(r.options.map((o) => o.id)).toEqual(["b1"]);
  });

  it("branch employees, owners and solo employees are unchanged", () => {
    expect(isHeadOfficeNullContourOperator(ctx({ role: "BRANCH_EMPLOYEE", rights: activate }))).toBe(false);
    expect(resolveScannerBranchContext({ contextReady: true, proContext: ctx({ role: "ORG_OWNER" }) }).kind).toBe("not_required");
    expect(resolveScannerBranchContext({ contextReady: true, proContext: ctx({ role: "PARTNER_MANAGER" }) }).kind).toBe("not_required");
  });
});
