import { describe, expect, it } from "vitest";
import {
  formatStaffBranchLine,
  staffAccessScopeBranchLines,
  staffAccessScopeHeadline,
  staffWorkingBranchLine,
} from "./profile-staff-cabinet";
import type { ProContextSnapshot } from "./profile-cabinet-access";

describe("profile-staff-cabinet access scope labels", () => {
  const base: ProContextSnapshot = {
    role: "BRANCH_EMPLOYEE",
    organization: { id: "o1", name: "ОПТОВИК" },
  };

  it("HEAD_OFFICE with six branches shows head office summary, not active branch only", () => {
    const branches = Array.from({ length: 6 }, (_, i) => ({
      id: `b${i}`,
      name: `F${i + 1}`,
      city: "Krasnodar",
      address: `ул. ${i}`,
    }));
    const ctx: ProContextSnapshot = {
      ...base,
      membershipKind: "HEAD_OFFICE",
      branches,
      activeBranch: branches[0]!,
    };
    expect(staffAccessScopeHeadline(ctx)).toBe("Головной офис и 6 филиалов");
    expect(staffAccessScopeBranchLines(ctx)).toHaveLength(6);
    expect(staffWorkingBranchLine(ctx)).toBe("F1 — ул. 0");
  });

  it("switching active branch changes working line only", () => {
    const branches = [
      { id: "b1", name: "ОПТОВИК", city: "K", address: "ул. 40 лет Победы, 168" },
      { id: "b2", name: "Склад", city: "K", address: "ул. 2" },
    ];
    const ctxA: ProContextSnapshot = {
      ...base,
      membershipKind: "HEAD_OFFICE",
      branches,
      activeBranch: branches[0]!,
    };
    const ctxB: ProContextSnapshot = { ...ctxA, activeBranch: branches[1]! };
    expect(staffAccessScopeHeadline(ctxA)).toBe(staffAccessScopeHeadline(ctxB));
    expect(staffAccessScopeBranchLines(ctxA)).toEqual(staffAccessScopeBranchLines(ctxB));
    expect(staffWorkingBranchLine(ctxA)).toBe("ОПТОВИК — ул. 40 лет Победы, 168");
    expect(staffWorkingBranchLine(ctxB)).toBe("Склад — ул. 2");
  });

  it("BRANCH_STAFF lists only assigned branches", () => {
    const ctx: ProContextSnapshot = {
      ...base,
      membershipKind: "BRANCH_STAFF",
      branches: [
        { id: "b1", name: "A", city: "C", address: "1" },
        { id: "b2", name: "B", city: "C", address: "2" },
      ],
      activeBranch: { id: "b2", name: "B", city: "C", address: "2" },
    };
    expect(staffAccessScopeHeadline(ctx)).toBe("2 филиала");
    expect(staffAccessScopeBranchLines(ctx).map((x) => x.line)).toEqual(["A — 1", "B — 2"]);
  });

  it("HEAD_OFFICE without branches shows head office only", () => {
    const ctx: ProContextSnapshot = {
      role: "ORG_TEAM_MEMBER",
      membershipKind: "HEAD_OFFICE",
      organization: { id: "o1", name: "Org" },
      branches: [],
      activeBranch: null,
    };
    expect(staffAccessScopeHeadline(ctx)).toBe("Головной офис");
  });

  it("formatStaffBranchLine does not duplicate address embedded in branch name", () => {
    expect(
      formatStaffBranchLine({
        name: "ОПТОВИК — ул. 40 лет Победы, 168",
        city: "Краснодар",
        address: "ул. 40 лет Победы, 168",
      }),
    ).toBe("ОПТОВИК — ул. 40 лет Победы, 168");
  });

  it("legacy employee without membershipKind does not mention head office", () => {
    const ctx: ProContextSnapshot = {
      ...base,
      branches: [{ id: "b1", name: "Only", city: "C", address: "1" }],
      activeBranch: { id: "b1", name: "Only", city: "C", address: "1" },
    };
    expect(staffAccessScopeHeadline(ctx)).toBe("Only — 1");
    expect(staffAccessScopeHeadline(ctx)).not.toMatch(/головной/i);
  });
});
