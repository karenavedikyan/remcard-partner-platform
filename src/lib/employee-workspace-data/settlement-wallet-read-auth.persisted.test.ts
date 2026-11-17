import { describe, expect, it } from "vitest";
import {
  authorizeSettlementWalletPaymentMutations,
  authorizeSettlementWalletRead,
} from "./settlement-wallet-read-auth";
import { fixtureOptovikOwnerProContext, fixtureSergeyAuthUser } from "./fixtures";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

const user = fixtureSergeyAuthUser();

function orgMember(rights?: { role: string; flags: Record<string, boolean> }): ProContextSnapshot {
  const owner = fixtureOptovikOwnerProContext();
  return {
    role: "ORG_TEAM_MEMBER",
    organization: owner.organization,
    branchAssignments: [],
    organizationActiveBranchIds: [],
    ...(rights ? { rights } : {}),
  } as ProContextSnapshot;
}

function solo(role: "PARTNER_MANAGER" | "PARTNER_EMPLOYEE", rights?: { role: string; flags: Record<string, boolean> }) {
  return { role, ...(rights ? { rights } : {}) } as ProContextSnapshot;
}

const read = (proContext: ProContextSnapshot | null) =>
  authorizeSettlementWalletRead({ user, proContext, contextReady: true });

describe("wallet read for an employee without a Branch: persisted flag only", () => {
  it("main-organization member with persisted canViewWallet reads the employer ledger (company staff scope)", () => {
    expect(read(orgMember({ role: "MANAGER", flags: { canViewWallet: true } }))).toEqual({
      allowed: true,
      mode: "org-staff-persisted-ledger",
    });
  });

  it("VIEWER with persisted canViewWallet may READ; the same VIEWER never gets payment mutations", () => {
    const ctx = orgMember({ role: "VIEWER", flags: { canViewWallet: true } });
    expect(read(ctx)).toEqual({ allowed: true, mode: "org-staff-persisted-ledger" });
    expect(authorizeSettlementWalletPaymentMutations({ user, proContext: ctx, contextReady: true }).allowed).toBe(false);
  });

  it("flag false, missing flag or legacy (never saved) member is denied: fail closed", () => {
    for (const ctx of [
      orgMember({ role: "SELLER", flags: { canViewWallet: false } }),
      orgMember({ role: "SELLER", flags: {} }),
      orgMember(undefined),
    ]) {
      expect(read(ctx)).toEqual({ allowed: false, reason: "missing_wallet_permission" });
    }
  });

  it("solo specialist/agent employees (manager and assistant) follow the same rule", () => {
    for (const role of ["PARTNER_MANAGER", "PARTNER_EMPLOYEE"] as const) {
      expect(read(solo(role, { role: "VIEWER", flags: { canViewWallet: true } }))).toEqual({
        allowed: true,
        mode: "solo-staff-persisted-ledger",
      });
      expect(read(solo(role, { role: "SELLER", flags: { canViewWallet: false } }))).toEqual({
        allowed: false,
        reason: "missing_wallet_permission",
      });
      expect(read(solo(role))).toEqual({ allowed: false, reason: "missing_wallet_permission" });
    }
  });

  it("suspended or revoked solo employee is denied even with a stale persisted flag", () => {
    expect(
      read({ role: "PARTNER_EMPLOYEE_SUSPENDED", rights: { role: "MANAGER", flags: { canViewWallet: true } } } as never),
    ).toEqual({ allowed: false, reason: "suspended" });
    expect(read(null).allowed).toBe(false);
  });

  it("solo staff never gets payment mutations from the read right", () => {
    expect(
      authorizeSettlementWalletPaymentMutations({
        user,
        proContext: solo("PARTNER_MANAGER", { role: "MANAGER", flags: { canViewWallet: true } }),
        contextReady: true,
      }).allowed,
    ).toBe(false);
  });

  it("regression: the owner keeps pro-owner access and a plain CLIENT without a workplace stays denied", () => {
    expect(read(fixtureOptovikOwnerProContext())).toMatchObject({ allowed: true });
    expect(
      authorizeSettlementWalletRead({ user, proContext: { role: "NONE" } as never, contextReady: true }).allowed,
    ).toBe(false);
  });
});

describe("AB-07: legacy ORG_EMPLOYEE (PartnerEmployee of an organization owner) wallet read", () => {
  const orgEmployee = (rights?: { role: string; flags: Record<string, boolean> }) =>
    ({ ...orgMember(rights), role: "ORG_EMPLOYEE" }) as ProContextSnapshot;

  it("saved canViewWallet reads, VIEWER reads, never payment mutations", () => {
    expect(read(orgEmployee({ role: "MANAGER", flags: { canViewWallet: true } }))).toEqual({
      allowed: true,
      mode: "org-staff-persisted-ledger",
    });
    const viewer = orgEmployee({ role: "VIEWER", flags: { canViewWallet: true } });
    expect(read(viewer).allowed).toBe(true);
    expect(authorizeSettlementWalletPaymentMutations({ user, proContext: viewer, contextReady: true }).allowed).toBe(false);
  });

  it("flag off, missing flag or never saved: denied", () => {
    for (const ctx of [
      orgEmployee({ role: "MANAGER", flags: { canViewWallet: false } }),
      orgEmployee({ role: "MANAGER", flags: {} }),
      orgEmployee(undefined),
    ]) {
      expect(read(ctx)).toEqual({ allowed: false, reason: "missing_wallet_permission" });
    }
  });
});
