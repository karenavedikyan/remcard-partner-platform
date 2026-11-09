import { describe, expect, it } from "vitest";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import {
  appendStoreOrderBranchQuery,
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
