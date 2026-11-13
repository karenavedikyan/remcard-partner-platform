import { describe, expect, it, vi } from "vitest";
import {
  RECEIVING_PAID_REVIEW_PARENT_CALLBACK,
  buildReceivingAppealDetailReady,
} from "./receiving-detail-actions-contract";

describe("P4.receiving-detail-actions-contract", () => {
  it("builds actions with paidReview absent and shipped on sys_paid", async () => {
    const mutateStage = vi.fn().mockResolvedValue({ ok: true as const });
    const ready = buildReceivingAppealDetailReady({
      appealId: "a1",
      readOnly: false,
      mapped: {
        status: "ready",
        appeal: {
          id: "a1",
          clientName: "X",
          stageId: "sys_paid",
          stageLabel: "Оплачено",
          updatedAt: "2026-11-10T10:00:00Z",
        },
        history: [],
        revision: 4,
        workingStages: [{ id: "ws1", label: "Согласование" }],
        refusalReasons: ["Дорого"],
      },
      mutateProfile: vi.fn(),
      mutateStage,
      reloadDetail: vi.fn(),
    });
    expect(ready.actions?.paidReview?.supported).toBe(false);
    if (ready.actions?.paidReview && !ready.actions.paidReview.supported) {
      expect(ready.actions.paidReview.reason).toContain(RECEIVING_PAID_REVIEW_PARENT_CALLBACK);
    }
    expect(ready.actions?.shippedConfirm?.supported).toBe(true);
    if (ready.actions?.shippedConfirm?.supported) {
      ready.actions.shippedConfirm.onMarkShipped();
    }
    expect(mutateStage).toHaveBeenCalledWith({
      stageKey: "sys_shipped",
      expectedRevision: 4,
    });
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
