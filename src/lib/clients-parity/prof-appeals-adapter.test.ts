import { describe, expect, it } from "vitest";
import {
  coerceProfAppealsFromListWire,
  filterProfAppealsClient,
  isProfAppealListItemWire,
  mapProfAppealListItemWire,
  parseProfFilterCounts,
  profListQueryParams,
  profRowCanBulkSelect,
  type ReceivingAppealListItemWire,
} from "./prof-appeals-adapter";
import { mapReceivingAppealListRowFromWire } from "./receiving-appeals-api";

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
  remCard: { inCabinet: true, registeredAt: "2026-01-01T00:00:00.000Z" },
  capabilities: {
    canManageLeads: true,
    canScan: true,
    canSelectForBulkWrite: true,
    canPrepareCommercialProposal: true,
    canSendCommercialProposal: false,
  },
};

describe("prof-appeals-adapter", () => {
  it("detects p149 list wire", () => {
    expect(isProfAppealListItemWire(LIST_ITEM)).toBe(true);
    expect(isProfAppealListItemWire({ id: "x" })).toBe(false);
  });

  it("maps list item without aliasing title to client name", () => {
    const row = mapProfAppealListItemWire(LIST_ITEM);
    expect(row.appealTitle).toBe("Отделка");
    expect(row.clientDisplayName).toBe("Анна");
    expect(row.clientName).toBe("Анна");
    expect(row.certificatePromoCode).toBe("RC-1");
    expect(row.erpDocumentNumber).toBe("1C-9");
    expect(row.remCard.inCabinet).toBe(true);
  });

  it("remCardOnly query param matches server contract", () => {
    const p = profListQueryParams({ remCardOnly: true });
    expect(p.get("remCardOnly")).toBe("1");
    expect(p.get("onlyWithRemCard")).toBeNull();
  });

  it("reads filterCounts.remCardMatchCount", () => {
    expect(parseProfFilterCounts({ filterCounts: { remCardMatchCount: 3 } })).toBe(3);
    expect(parseProfFilterCounts({})).toBeNull();
  });

  it("bulk select follows canSelectForBulkWrite", () => {
    const row = mapProfAppealListItemWire({
      ...LIST_ITEM,
      capabilities: { ...LIST_ITEM.capabilities, canSelectForBulkWrite: false },
    });
    expect(profRowCanBulkSelect(row)).toBe(false);
  });

  it("client remCardOnly filter", () => {
    const rows = coerceProfAppealsFromListWire(
      [
        LIST_ITEM,
        { ...LIST_ITEM, id: "a2", remCard: { inCabinet: false, registeredAt: null } },
      ],
      mapReceivingAppealListRowFromWire,
    );
    const only = filterProfAppealsClient(rows, { remCardOnly: true, q: "" });
    expect(only).toHaveLength(1);
    expect(only[0]!.id).toBe("a1");
  });
});