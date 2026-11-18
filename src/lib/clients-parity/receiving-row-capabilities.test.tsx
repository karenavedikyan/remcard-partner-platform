import { describe, expect, it } from "vitest";
import {
  mapReceivingAppealListRowFromWire,
  parseReceivingRowCapabilities,
  receivingDetailWireReadOnly,
  receivingRowCanManageLeads,
} from "./receiving-appeals-api";

const base = { id: "x", stageKey: "sys_new", originKind: "manual", createdAt: "2026-11-14T00:00:00.000Z" };

describe("per-appeal capabilities (display only)", () => {
  it("parses only complete boolean flags", () => {
    expect(parseReceivingRowCapabilities({ canManageLeads: true, canScan: false })).toEqual({ canManageLeads: true, canScan: false });
    expect(parseReceivingRowCapabilities({ canManageLeads: true })).toBeUndefined();
    expect(parseReceivingRowCapabilities("yes")).toBeUndefined();
    expect(parseReceivingRowCapabilities(null)).toBeUndefined();
  });

  it("the list row keeps the server flags; a row without them has none", () => {
    expect(mapReceivingAppealListRowFromWire({ ...base, capabilities: { canManageLeads: false, canScan: true } }).capabilities).toEqual({
      canManageLeads: false,
      canScan: true,
    });
    expect(mapReceivingAppealListRowFromWire(base).capabilities).toBeUndefined();
  });

  it("row flag wins over the list aggregate; without it only a single-branch answer is trusted", () => {
    const own = (canManageLeads: boolean) => ({ capabilities: { canManageLeads, canScan: false } });
    expect(receivingRowCanManageLeads(own(false), { listAllowsLeads: true, scopeAll: true })).toBe(false);
    expect(receivingRowCanManageLeads(own(true), { listAllowsLeads: false, scopeAll: true })).toBe(true);
    expect(receivingRowCanManageLeads({}, { listAllowsLeads: true, scopeAll: true })).toBe(false);
    expect(receivingRowCanManageLeads({}, { listAllowsLeads: true, scopeAll: false })).toBe(true);
    expect(receivingRowCanManageLeads({}, { listAllowsLeads: false, scopeAll: false })).toBe(false);
  });

  it("card read-only: per-card flags decide; general read without them is read-only; explicit branch keeps envelope", () => {
    expect(receivingDetailWireReadOnly({ capabilities: { canManageLeads: false, canScan: true }, readOnly: false })).toBe(true);
    expect(receivingDetailWireReadOnly({ capabilities: { canManageLeads: true, canScan: true }, readOnly: true }, { scopeAll: true })).toBe(false);
    expect(receivingDetailWireReadOnly({ access: { mutationsAllowed: true, canManageLeads: true } }, { scopeAll: true })).toBe(true);
    expect(receivingDetailWireReadOnly({ access: { mutationsAllowed: true, canManageLeads: true } })).toBe(false);
    expect(receivingDetailWireReadOnly({ readOnly: true })).toBe(true);
    expect(receivingDetailWireReadOnly({ access: { canManageLeads: false } })).toBe(true);
    expect(receivingDetailWireReadOnly({})).toBe(false);
  });
});
