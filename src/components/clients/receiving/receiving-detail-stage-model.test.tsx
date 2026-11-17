import { describe, expect, it } from "vitest";
import {
  appealHasPurchase,
  buildNextStepModel,
  buildStageStepper,
  canRefuseFromStage,
  canTransitionStage,
  stagePickOptions,
} from "./receiving-detail-stage-model";

const TWO = [
  { id: "ws_measure", label: "Замер" },
  { id: "ws_offer", label: "Коммерческое предложение" },
];

describe("canTransitionStage mirrors the server guards", () => {
  it("never offers NEW -> SHIPPED/RETURN without a purchase/shipment", () => {
    const f = { stageId: "sys_new", hasPurchase: false, shippedAt: null };
    expect(canTransitionStage(f, "sys_shipped")).toMatchObject({ ok: false, code: "REQUIRES_PAID" });
    expect(canTransitionStage(f, "sys_return")).toMatchObject({ ok: false, code: "REQUIRES_SHIPPED" });
  });

  it("direct sys_paid is always routed to the order pipeline", () => {
    expect(canTransitionStage({ stageId: "sys_new", hasPurchase: false }, "sys_paid")).toMatchObject({
      ok: false,
      code: "REQUIRES_ORDER_PIPELINE",
    });
    expect(canTransitionStage({ stageId: "ws_offer", hasPurchase: true }, "sys_paid")).toMatchObject({
      ok: false,
      code: "REQUIRES_ORDER_PIPELINE",
    });
  });

  it("shipped needs a purchase; return needs a shipment; terminal stays closed", () => {
    expect(canTransitionStage({ stageId: "sys_paid", hasPurchase: true }, "sys_shipped")).toEqual({ ok: true });
    expect(
      canTransitionStage({ stageId: "sys_shipped", hasPurchase: true, shippedAt: "2026-11-01T10:00:00Z" }, "sys_return"),
    ).toEqual({ ok: true });
    expect(canTransitionStage({ stageId: "sys_refused", hasPurchase: false }, "sys_new")).toEqual({ ok: true });
    expect(canTransitionStage({ stageId: "sys_refused", hasPurchase: false }, "ws_measure")).toMatchObject({
      code: "TERMINAL",
    });
    expect(canTransitionStage({ stageId: "sys_return", hasPurchase: true }, "sys_new")).toMatchObject({
      code: "TERMINAL",
    });
    expect(canTransitionStage({ stageId: "sys_new", hasPurchase: false }, "sys_new")).toMatchObject({
      code: "UNCHANGED",
    });
  });

  it("appealHasPurchase uses the order id or the payment time only", () => {
    expect(appealHasPurchase({ purchaseOrderId: " ", paidAt: null })).toBe(false);
    expect(appealHasPurchase({ purchaseOrderId: "ord_1" })).toBe(true);
    expect(appealHasPurchase({ paidAt: "2026-11-01T00:00:00Z" })).toBe(true);
  });
});

describe("buildNextStepModel", () => {
  it("without own stages the primary step after NEW is the payment flow, never a direct PATCH", () => {
    const m = buildNextStepModel({ stageId: "sys_new", hasPurchase: false }, []);
    expect(m.kind).toBe("work");
    if (m.kind !== "work") return;
    expect(m.title).toBe("Следующий шаг: Оплата");
    expect(m.primary).toEqual({ kind: "pay", label: "Отметить оплату" });
    expect(m.canPay).toBe(false);
    expect(m.canRefuse).toBe(true);
    expect(m.pickOptions).toEqual([]);
  });

  it("with two configured stages the next working stage is a stage move and payment stays available", () => {
    const m = buildNextStepModel({ stageId: "sys_new", hasPurchase: false }, TWO);
    if (m.kind !== "work") throw new Error("work");
    expect(m.primary).toEqual({ kind: "stage", stageId: "ws_measure", label: "Перевести в «Замер»" });
    expect(m.canPay).toBe(true);
    expect(m.pickOptions.map((o) => o.id)).toEqual(["ws_measure", "ws_offer"]);
  });

  it("after the last working stage the primary step is payment; refusal closes once a purchase exists", () => {
    const m = buildNextStepModel({ stageId: "ws_offer", hasPurchase: false }, TWO);
    if (m.kind !== "work") throw new Error("work");
    expect(m.primary).toEqual({ kind: "pay", label: "Отметить оплату" });
    expect(canRefuseFromStage({ stageId: "ws_offer", hasPurchase: true }, TWO)).toBe(false);
  });

  it("paid -> ship when a purchase exists; terminal states offer no way back", () => {
    const paid = buildNextStepModel({ stageId: "sys_paid", hasPurchase: true }, TWO);
    expect(paid).toMatchObject({ kind: "paid", primary: { kind: "ship" } });
    const paidNoPurchase = buildNextStepModel({ stageId: "sys_paid", hasPurchase: false }, TWO);
    expect(paidNoPurchase).toMatchObject({ kind: "paid", primary: null });
    expect((paidNoPurchase as { blockedReason: string | null }).blockedReason).toMatch(/оплату/);
    expect(buildNextStepModel({ stageId: "sys_refused", hasPurchase: false }, TWO).kind).toBe("terminal");
    expect(buildNextStepModel({ stageId: "sys_return", hasPurchase: true, shippedAt: "x" }, TWO).kind).toBe("terminal");
  });

  it("shipped offers the return only on the server basis (shipment recorded)", () => {
    const withBasis = buildNextStepModel({ stageId: "sys_shipped", hasPurchase: true, shippedAt: "2026-11-01" }, []);
    expect(withBasis).toMatchObject({ kind: "shipped", returnAction: { kind: "return" } });
    const noBasis = buildNextStepModel({ stageId: "sys_shipped", hasPurchase: true, shippedAt: null }, []);
    expect(noBasis).toMatchObject({ kind: "shipped", returnAction: null });
  });

  it("pick options never contain paid, refused, or unreachable financial stages", () => {
    const opts = stagePickOptions({ stageId: "ws_measure", hasPurchase: false, shippedAt: null }, TWO).map((o) => o.id);
    expect(opts).toEqual(["sys_new", "ws_offer"]);
  });
});

describe("buildStageStepper", () => {
  it("marks done / current / upcoming for the live pipeline", () => {
    const steps = buildStageStepper({ stageId: "ws_measure", workingStages: TWO });
    expect(steps.map((s) => `${s.id}:${s.state}`)).toEqual([
      "sys_new:done",
      "ws_measure:current",
      "ws_offer:upcoming",
      "sys_paid:upcoming",
      "sys_shipped:upcoming",
      "sys_return:upcoming",
    ]);
  });

  it("works with no own stages: one entry point, payment, shipment, return", () => {
    const steps = buildStageStepper({ stageId: "sys_new", workingStages: [] });
    expect(steps.map((s) => s.label)).toEqual(["Новое обращение", "Оплачено", "Отгружено", "Возврат"]);
    expect(steps[0].state).toBe("current");
    expect(steps.filter((s) => s.state === "current")).toHaveLength(1);
  });

  it("a custom stage that only repeats a system caption never duplicates it in the ribbon", () => {
    const dup = [
      { id: "ws_dup", label: "Новое обращение" },
      { id: "ws_dup2", label: " новое  обращение " },
      { id: "ws_measure", label: "Замер" },
      { id: "ws_paid", label: "Оплачено" },
    ];
    const steps = buildStageStepper({ stageId: "sys_new", workingStages: dup });
    expect(steps.map((s) => s.label)).toEqual(["Новое обращение", "Замер", "Оплачено", "Отгружено", "Возврат"]);
    expect(steps.filter((s) => s.label === "Новое обращение")).toHaveLength(1);
    expect(steps.filter((s) => s.state === "current").map((s) => s.id)).toEqual(["sys_new"]);
  });

  it("an appeal sitting in such a stage is shown as the system entry point, once", () => {
    const dup = [{ id: "ws_dup", label: "Новое обращение" }, { id: "ws_measure", label: "Замер" }];
    const steps = buildStageStepper({ stageId: "ws_dup", workingStages: dup });
    expect(steps.filter((s) => s.state === "current").map((s) => s.id)).toEqual(["sys_new"]);
    expect(steps.filter((s) => s.label === "Новое обращение")).toHaveLength(1);
    const m = buildNextStepModel({ stageId: "ws_dup", hasPurchase: false }, dup);
    if (m.kind !== "work") throw new Error("work");
    expect(m.primary).toEqual({ kind: "stage", stageId: "ws_measure", label: "Перевести в «Замер»" });
  });

  it("refusal is terminal and shows only reached steps, never a fake linear path", () => {
    const steps = buildStageStepper({
      stageId: "sys_refused",
      workingStages: TWO,
      history: [{ text: "Этап изменён: Замер" }],
    });
    expect(steps.map((s) => `${s.id}:${s.state}`)).toEqual([
      "sys_new:done",
      "ws_measure:done",
      "sys_refused:terminal",
    ]);
  });

  it("return is terminal after paid and shipped", () => {
    const steps = buildStageStepper({ stageId: "sys_return", workingStages: [] });
    expect(steps.map((s) => `${s.id}:${s.state}`)).toEqual([
      "sys_new:done",
      "sys_paid:done",
      "sys_shipped:done",
      "sys_return:terminal",
    ]);
  });

  it("an archived custom stage the appeal still sits in stays visible and current", () => {
    const steps = buildStageStepper({
      stageId: "ws_old",
      workingStages: TWO,
      archivedStages: [{ id: "ws_old", label: "Старый этап" }],
    });
    expect(steps[1]).toEqual({ id: "ws_old", label: "Старый этап", state: "current" });
    expect(steps[0].state).toBe("done");
  });
});
