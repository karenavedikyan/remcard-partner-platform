import { describe, expect, it } from "vitest";
import {
  coerceProfAppealsFromP149ListWire,
  filterProfAppealsClient,
  isP149ListContractWire,
  isProfAppealListItemWire,
  mapProfAppealListItemWire,
  mergeProfCapabilities,
  parseProfFilterCounts,
  profListQueryParams,
  profRowCanBulkSelect,
  type ReceivingAppealListItemWire,
} from "./prof-appeals-adapter";
import { mapReceivingAppealListRowFromWire } from "./receiving-appeals-api";

const P149_CAPS = {
  canSelectForBulkWrite: true,
  canPrepareCommercialProposal: true,
  canSendCommercialProposal: false,
} as const;

const LIST_ITEM: ReceivingAppealListItemWire = {
  id: "a1",
  appealTitle: "Отделка",
  clientDisplayName: "Анна",
  requestText: "Двери",
  stageKey: "ws_work",
  stageLabel: "В работе",
  certificatePromoCode: "RC-1",
  erpDocumentNumber: "1C-9",
  externalRefs: [{ key: "x", label: "Поле", value: "v" }],
  manualSourceKey: "phone",
  manualSourceLabel: "Звонок",
  responsible: { userId: "u1", displayLabel: "Мария" },
  receivingBranchId: "b1",
  originKind: "MANUAL",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  remCard: { inCabinet: true },
  capabilities: { canManageLeads: true, canScan: true },
  p149Capabilities: { ...P149_CAPS },
};

describe("prof-appeals-adapter", () => {
  it("detects p149 list contract via filterCounts", () => {
    expect(isP149ListContractWire({ filterCounts: { remCardMatchCount: 0 } })).toBe(true);
    expect(isP149ListContractWire({ filterCounts: { remCardMatchCount: 3 } })).toBe(true);
    expect(isP149ListContractWire({ appeals: [] })).toBe(false);
  });

  it("detects p149 list item wire", () => {
    expect(isProfAppealListItemWire(LIST_ITEM)).toBe(true);
    expect(isProfAppealListItemWire({ id: "x", remCard: { inCabinet: false } })).toBe(false);
    const legacy = mapReceivingAppealListRowFromWire({
      id: "l1",
      clientDisplayName: "Legacy",
      stageKey: "sys_new",
      createdAt: LIST_ITEM.createdAt,
      updatedAt: LIST_ITEM.updatedAt,
    });
    expect(legacy.id).toBe("l1");
    expect(isProfAppealListItemWire(legacy)).toBe(false);
  });

  it("merges legacy capabilities with p149 additive", () => {
    expect(
      mergeProfCapabilities(
        { canManageLeads: true, canScan: false },
        { canSelectForBulkWrite: false, canPrepareCommercialProposal: true, canSendCommercialProposal: false },
      ).canSelectForBulkWrite,
    ).toBe(false);
  });

  it("maps list item without aliasing title to client name", () => {
    const row = mapProfAppealListItemWire(LIST_ITEM);
    expect(row.appealTitle).toBe("Отделка");
    expect(row.clientDisplayName).toBe("Анна");
    expect(row.clientName).toBe("Анна");
    expect(row.remCard.inCabinet).toBe(true);
    expect(row.remCard).not.toHaveProperty("registeredAt");
  });

  it("remCardOnly query param matches server contract", () => {
    const p = profListQueryParams({ remCardOnly: true });
    expect(p.get("remCardOnly")).toBe("1");
  });

  it("reads filterCounts.remCardMatchCount only with contract", () => {
    expect(parseProfFilterCounts({ filterCounts: { remCardMatchCount: 3 } })).toBe(3);
    expect(parseProfFilterCounts({})).toBeNull();
  });

  it("bulk select follows p149 canSelectForBulkWrite", () => {
    const row = mapProfAppealListItemWire({
      ...LIST_ITEM,
      p149Capabilities: { ...P149_CAPS, canSelectForBulkWrite: false },
    });
    expect(profRowCanBulkSelect(row)).toBe(false);
  });

  it("does not synthesize prof rows from legacy wire", () => {
    const rows = coerceProfAppealsFromP149ListWire([
      LIST_ITEM,
      {
        id: "legacy",
        clientDisplayName: "Old",
        stageKey: "sys_new",
        createdAt: LIST_ITEM.createdAt,
        updatedAt: LIST_ITEM.updatedAt,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe("a1");
  });

  it("client remCardOnly filter", () => {
    const rows = coerceProfAppealsFromP149ListWire([
      LIST_ITEM,
      { ...LIST_ITEM, id: "a2", remCard: { inCabinet: false } },
    ]);
    const only = filterProfAppealsClient(rows, { remCardOnly: true, q: "" });
    expect(only).toHaveLength(1);
    expect(only[0]!.id).toBe("a1");
  });
});