import { describe, expect, it } from "vitest";
import { cert } from "../../../scripts/reward-lifecycle-qa/purchase-fixtures";
import {
  deriveRecipientStatus,
  mapPurchaseAccrualReceiptView,
  resolveRecipientAccess,
} from "@/lib/purchase-accrual-receipt-view";
import type { RewardResponse } from "@/lib/reward-lifecycle-types";

const confirmedOrder = cert.orders![0]!;
const cancelledOrder = cert.orders![1]!;

type SummaryInput = {
  amount: number;
  pending?: number;
  confirmed?: number;
  paid?: number;
  suspended?: number;
  review?: number;
};

function rewardFixture(summary: SummaryInput, recipient = true): RewardResponse {
  return {
    actorId: "actor-qa",
    permissions: recipient
      ? { recipient: true, payerOwner: false, sellerAllowed: false, cash: false, transfer: false, canSuspend: false }
      : { recipient: false, payerOwner: true, sellerAllowed: false, cash: false, transfer: false, canSuspend: false },
    reward: {
      version: 1,
      summary: {
        original: summary.amount,
        amount: summary.amount,
        pending: summary.pending ?? 0,
        confirmed: summary.confirmed ?? 0,
        suspended: summary.suspended ?? 0,
        paid: summary.paid ?? 0,
        review: summary.review ?? 0,
      },
      nextConfirmationAt: null,
      lines: [
        {
          id: "line-1",
          categoryLabel: "Двери",
          days: 14,
          kind: "GOODS",
          grossKopecks: 12_000_000,
          returnedGrossKopecks: 0,
          fulfilledAt: "2026-11-02T12:00:00Z",
          confirmationAt: null,
          confirmedAt: null,
          canResume: false,
          amount: summary.amount,
          pending: summary.pending ?? 0,
          confirmed: summary.confirmed ?? 0,
          suspended: summary.suspended ?? 0,
          paid: summary.paid ?? 0,
          review: summary.review ?? 0,
          originalKopecks: summary.amount,
        },
      ],
      payments: [],
      history: [],
    },
  };
}

describe("resolveRecipientAccess", () => {
  it("marks non-recipient after load", () => {
    const access = resolveRecipientAccess(rewardFixture({ amount: 120_000 }, false), true);
    expect(access.recipient).toBe(false);
  });
});

describe("mapPurchaseAccrualReceiptView", () => {
  it("uses actor lifecycle amount not purchase snapshot proBonus", () => {
    const order = { ...confirmedOrder, proBonus: 3_450 };
    const reward = rewardFixture({ amount: 120_000, confirmed: 120_000 });
    const view = mapPurchaseAccrualReceiptView(order, reward, true);
    expect(view.amountText).toContain("1");
    expect(view.amountText).toContain("200");
    expect(view.amountText).not.toContain("3");
    expect(view.amountText).not.toContain("450");
    expect(view.lifecycleNote).toMatch(/снимке покупки/i);
  });

  it("never labels full payout when only partial paid", () => {
    const order = { ...confirmedOrder, proBonus: 3_450 };
    const reward = rewardFixture({ amount: 120_000, confirmed: 70_000, paid: 50_000 });
    const view = mapPurchaseAccrualReceiptView(order, reward, true);
    expect(view.statusBadge).toBe("Частично выплачено");
    expect(view.headline).toBe("Ваше вознаграждение");
    expect(view.amountText).toMatch(/1\s?200/);
    expect(deriveRecipientStatus(reward.reward!.summary).badge).not.toBe("Выплачено");
  });

  it("marks fully paid only when paid covers actor amount", () => {
    const reward = rewardFixture({ amount: 120_000, confirmed: 0, paid: 120_000 });
    const view = mapPurchaseAccrualReceiptView(confirmedOrder, reward, true);
    expect(view.statusBadge).toBe("Выплачено");
    expect(view.headline).toBe("Выплачено");
  });

  it("handles mixed pending and confirmed", () => {
    const reward = rewardFixture({ amount: 150_000, confirmed: 70_000, pending: 80_000 });
    const view = mapPurchaseAccrualReceiptView(confirmedOrder, reward, true);
    expect(view.showBreakdown).toBe(true);
    expect(view.breakdown?.pendingRub).toBe(800);
    expect(view.breakdown?.confirmedRub).toBe(700);
  });

  it("omits issuer-rate calc; uses recipient line amounts only", () => {
    const reward = rewardFixture({ amount: 120_000, confirmed: 120_000 });
    const view = mapPurchaseAccrualReceiptView(confirmedOrder, reward, true);
    expect(view.showCalc).toBe(true);
    expect(view.calcLines[0]).toMatch(/по вашей позиции/);
    expect(view.calcLines.join(" ")).not.toMatch(/issuer/i);
    expect(view.calcLines.join(" ")).not.toContain("5%");
  });

  it("does not present snapshot proBonus as hero when recipient data missing", () => {
    const view = mapPurchaseAccrualReceiptView(confirmedOrder, null, true);
    expect(view.amountText).toBe("—");
    expect(view.statusBadge).toBe("Статус недоступен");
    expect(view.lifecycleNote).toMatch(/снимке покупки/i);
  });

  it("shows zero actor amount honestly", () => {
    const reward = rewardFixture({ amount: 0, confirmed: 0, pending: 0, paid: 0 });
    const order = { ...confirmedOrder, proBonus: 3_450 };
    const view = mapPurchaseAccrualReceiptView(order, reward, true);
    expect(view.amountTone).toBe("muted");
    expect(view.statusBadge).toBe("Нет начисления");
  });

  it("shows blanket cancel only when lifecycle has no recipient activity", () => {
    const cancelled = mapPurchaseAccrualReceiptView(
      cancelledOrder,
      rewardFixture({ amount: 0, confirmed: 0, pending: 0, paid: 0 }),
      true,
    );
    expect(cancelled.statusBadge).toBe("Покупка отменена · Нет начисления");
    expect(cancelled.amountText).toBe("0 ₽");
  });

  it.each(["CANCELLED", "RETURNED"] as const)(
    "treats missing lifecycle on %s as unknown amount, not zero",
    (status) => {
      const order = { ...confirmedOrder, status };
      const view = mapPurchaseAccrualReceiptView(order, null, true);
      expect(view.amountText).toBe("—");
      expect(view.statusBadge).toBe("Покупка отменена · Статус недоступен");
      expect(view.helperText).toMatch(/недоступен/i);
      expect(view.helperText).toMatch(/не означает нулевое/i);
      expect(view.amountText).not.toBe("0 ₽");
    },
  );

  it.each(["CANCELLED", "RETURNED"] as const)(
    "treats non-recipient lifecycle on %s as unknown, not zero",
    (status) => {
      const order = { ...cancelledOrder, status };
      const view = mapPurchaseAccrualReceiptView(
        order,
        rewardFixture({ amount: 180_000, paid: 180_000, confirmed: 0 }, false),
        true,
      );
      expect(view.amountText).toBe("—");
      expect(view.statusBadge).toBe("Покупка отменена · Статус недоступен");
      expect(view.helperText).toMatch(/недоступен/i);
    },
  );

  it("shows paid on cancelled order when summary still has payout", () => {
    const reward = rewardFixture({ amount: 0, paid: 180_000, confirmed: 0, pending: 0 });
    const view = mapPurchaseAccrualReceiptView(cancelledOrder, reward, true);
    expect(view.statusBadge).toMatch(/Покупка отменена/);
    expect(view.statusBadge).toMatch(/Частично выплачено/);
    expect(view.amountText).toMatch(/1\s?800/);
    expect(view.helperText).toMatch(/отменена/i);
    expect(view.history.some((e) => e.label.includes("выплат"))).toBe(true);
  });

  it("reconciles paid greater than amount", () => {
    const reward = rewardFixture({ amount: 100_000, paid: 150_000, confirmed: 100_000 });
    const view = mapPurchaseAccrualReceiptView(confirmedOrder, reward, true);
    expect(view.statusBadge).toBe("Частично выплачено");
    expect(view.breakdown?.paidRub).toBe(1500);
  });

  it("surfaces review with paid context", () => {
    const reward = rewardFixture({ amount: 120_000, paid: 50_000, review: 30_000, confirmed: 40_000 });
    const view = mapPurchaseAccrualReceiptView(confirmedOrder, reward, true);
    expect(deriveRecipientStatus(reward.reward!.summary).badge).toMatch(/сверк/i);
    expect(view.breakdown?.reviewRub).toBe(300);
    expect(view.history.some((e) => e.label.includes("сверк"))).toBe(true);
  });

  it("shows suspended-only lifecycle", () => {
    const reward = rewardFixture({ amount: 0, suspended: 200_000, confirmed: 0, pending: 0, paid: 0 });
    const view = mapPurchaseAccrualReceiptView(confirmedOrder, reward, true);
    expect(view.statusBadge).toBe("Приостановлено");
    expect(view.breakdown?.suspendedRub).toBe(2000);
  });

  it("handles self-scan", () => {
    const self = mapPurchaseAccrualReceiptView(
      { ...confirmedOrder, isSelfScan: true },
      rewardFixture({ amount: 120_000 }, true),
      true,
    );
    expect(self.statusBadge).toBe("Самосканирование");
    expect(self.showCalc).toBe(false);
  });

  it("returns loading view while lifecycle fetch pending", () => {
    const view = mapPurchaseAccrualReceiptView(confirmedOrder, null, false);
    expect(view.loading).toBe(true);
    expect(view.amountText).toBe("—");
  });
});
