import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cert } from "../../../scripts/reward-lifecycle-qa/purchase-fixtures";
import { PurchaseAccrualReceiptModal, selectRewardForOrder } from "./PurchaseAccrualReceiptModal";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

const order = cert.orders![0]!;

function lifecycleMock(confirmedKopecks: number, paidKopecks = 0) {
  return {
    actorId: "qa",
    permissions: { recipient: true },
    reward: {
      version: 1,
      summary: {
        original: confirmedKopecks,
        amount: confirmedKopecks,
        pending: 0,
        confirmed: confirmedKopecks,
        suspended: 0,
        paid: paidKopecks,
        review: 0,
      },
      lines: [
        {
          id: "line-1",
          categoryLabel: "Двери",
          days: 14,
          kind: "GOODS",
          grossKopecks: 12_000_000,
          returnedGrossKopecks: 0,
          fulfilledAt: null,
          confirmationAt: null,
          confirmedAt: null,
          canResume: false,
          amount: confirmedKopecks,
          pending: 0,
          confirmed: confirmedKopecks,
          suspended: 0,
          paid: paidKopecks,
          review: 0,
          originalKopecks: confirmedKopecks,
        },
      ],
      payments: [],
      history: [],
      nextConfirmationAt: null,
    },
  };
}

describe("PurchaseAccrualReceiptModal", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    resetBodyScrollLockForTests();
    remcardFetch.mockResolvedValue(lifecycleMock(600_000));
  });

  it("renders actor-scoped hero and resets scroll on reopen", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <PurchaseAccrualReceiptModal
        open
        order={{ ...order, proBonus: 3_450 }}
        promoCode={cert.promoCode}
        clientName="Синтетический клиент"
        onClose={() => {}}
      />,
    );

    const dialog = await screen.findByTestId("purchase-accrual-receipt-dialog");
    await waitFor(() => {
      expect(within(dialog).getByText(/Выплата ещё не проведена/)).toBeVisible();
    });
    expect(within(dialog).getByText(/\+6\s?000 ₽/)).toBeVisible();

    const body = document.getElementById("purchase-accrual-receipt-body");
    expect(body).toBeTruthy();
    if (body) body.scrollTop = 400;

    rerender(
      <PurchaseAccrualReceiptModal
        open={false}
        order={order}
        promoCode={cert.promoCode}
        clientName="Синтетический клиент"
        onClose={() => {}}
      />,
    );
    rerender(
      <PurchaseAccrualReceiptModal
        open
        order={order}
        promoCode={cert.promoCode}
        clientName="Синтетический клиент"
        onClose={() => {}}
      />,
    );
    await waitFor(() => {
      const el = document.getElementById("purchase-accrual-receipt-body");
      expect(el?.scrollTop).toBe(0);
    });
    await user.click(within(screen.getByTestId("purchase-accrual-receipt-dialog")).getByRole("button", { name: "Понятно" }));
  });

  it("shows recipient calc from lifecycle lines, not purchase issuer split", async () => {
    render(
      <PurchaseAccrualReceiptModal open order={order} promoCode={cert.promoCode} onClose={() => {}} />,
    );
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    const dialog = screen.getByTestId("purchase-accrual-receipt-dialog");
    await userEvent.click(within(dialog).getByText("Как рассчитано"));
    expect(within(dialog).queryByText(/5%/)).toBeNull();
    expect(within(dialog).getByText(/по вашей позиции/)).toBeVisible();
  });

  it("does not paint order A hero when B opened before A lifecycle resolves", async () => {
    const orderA = cert.orders![0]!;
    const orderB = cert.orders![1]!;

    let resolveA: (value: unknown) => void = () => {};
    const delayedA = new Promise((resolve) => {
      resolveA = resolve;
    });

    remcardFetch.mockImplementation((path: string) => {
      if (path.includes(orderA.id)) return delayedA;
      if (path.includes(orderB.id)) return Promise.resolve(lifecycleMock(50_000));
      return Promise.reject(new Error("unexpected"));
    });

    const { rerender } = render(
      <PurchaseAccrualReceiptModal
        key={orderA.id}
        open
        order={orderA}
        promoCode={cert.promoCode}
        onClose={() => {}}
      />,
    );

    rerender(
      <PurchaseAccrualReceiptModal
        key={orderB.id}
        open
        order={orderB}
        promoCode={cert.promoCode}
        onClose={() => {}}
      />,
    );

    const dialog = await screen.findByTestId("purchase-accrual-receipt-dialog");
    await waitFor(() => {
      expect(dialog).toHaveAttribute("data-order-id", orderB.id);
      expect(within(dialog).getByText(/\+500 ₽/)).toBeVisible();
    });

    resolveA(lifecycleMock(600_000));
    await waitFor(() => expect(remcardFetch).toHaveBeenCalled());
    expect(within(dialog).queryByText(/\+6\s?000 ₽/)).toBeNull();
    expect(within(dialog).getByText(/\+500 ₽/)).toBeVisible();
  });

  it("selectRewardForOrder drops cache when order id differs", () => {
    const cache = { orderId: "a", reward: lifecycleMock(1), loaded: true };
    const scoped = selectRewardForOrder(cache, "b");
    expect(scoped.orderId).toBe("b");
    expect(scoped.loaded).toBe(false);
    expect(scoped.reward).toBeNull();
  });
});
