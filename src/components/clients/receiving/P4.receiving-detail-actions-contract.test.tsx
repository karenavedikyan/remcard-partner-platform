import { describe, expect, it, vi } from "vitest";
import {
  RECEIVING_MARK_PAID_ABSENT_REASON,
  RECEIVING_MARK_PAID_ABSENT_TECH,
  buildReceivingAppealDetailReady,
  filterStageOptionsForDirectPatch,
  receivingAppealPurchaseDetailHref,
} from "./receiving-detail-actions-contract";
import { RECEIVING_DETAIL_MARK_PAID_UNAVAILABLE } from "./receiving-detail-user-copy";

describe("P4.receiving-detail-actions-contract", () => {
  it("excludes sys_paid from direct PATCH stage picker options", () => {
    const filtered = filterStageOptionsForDirectPatch([
      { id: "sys_new", label: "Новое" },
      { id: "sys_paid", label: "Оплачено" },
      { id: "ws1", label: "Согласование" },
    ]);
    expect(filtered.map((o) => o.id)).toEqual(["sys_new", "ws1"]);
  });

  it("purchase href matches wallet history route", () => {
    expect(receivingAppealPurchaseDetailHref("ord-9")).toBe("/history/purchases/ord-9");
  });

  it("mark paid unavailable user copy is not technical", () => {
    expect(RECEIVING_MARK_PAID_ABSENT_REASON).toBe(RECEIVING_DETAIL_MARK_PAID_UNAVAILABLE);
    expect(RECEIVING_MARK_PAID_ABSENT_REASON).not.toMatch(/PATCH|P6|onOpen/i);
    expect(RECEIVING_MARK_PAID_ABSENT_TECH).toMatch(/STAGE_REQUIRES_ORDER_PIPELINE/);
  });

  it("builds shipped only when paid projection exists", () => {
    const mutateStage = vi.fn();
    const withPaid = buildReceivingAppealDetailReady({
      appealId: "a1",
      readOnly: false,
      mapped: {
        status: "ready",
        appeal: {
          id: "a1",
          clientName: "X",
          stageId: "sys_paid",
          stageLabel: "Оплачено",
          updatedAt: "x",
          purchaseOrderId: "ord-1",
        },
        history: [],
        revision: 1,
        workingStages: [],
        refusalReasons: [],
      },
      mutateProfile: vi.fn(),
      mutateStage,
      reloadDetail: vi.fn(),
    });
    expect(withPaid.actions?.shippedConfirm?.supported).toBe(true);

    const withoutPaid = buildReceivingAppealDetailReady({
      appealId: "a2",
      readOnly: false,
      mapped: {
        status: "ready",
        appeal: {
          id: "a2",
          clientName: "Y",
          stageId: "sys_paid",
          stageLabel: "Оплачено",
          updatedAt: "x",
        },
        history: [],
        revision: 1,
        workingStages: [],
        refusalReasons: [],
      },
      mutateProfile: vi.fn(),
      mutateStage: vi.fn(),
      reloadDetail: vi.fn(),
    });
    expect(withoutPaid.actions?.shippedConfirm?.supported).toBe(false);
  });

  it("readOnly omits actions (observer/list-only redaction path)", () => {
    const ready = buildReceivingAppealDetailReady({
      appealId: "a1",
      readOnly: true,
      mapped: {
        status: "ready",
        appeal: { id: "a1", clientName: "X", stageId: "sys_new", stageLabel: "Новое", updatedAt: "x" },
        history: [],
        revision: 1,
        workingStages: [],
        refusalReasons: [],
      },
      mutateProfile: vi.fn(),
      mutateStage: vi.fn(),
      reloadDetail: vi.fn(),
    });
    expect(ready.actions).toBeUndefined();
    expect(ready.readOnly).toBe(true);
  });
});
