import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CertificatePurchases } from "./CertificatePurchases";
import { cert } from "../../../scripts/reward-lifecycle-qa/purchase-fixtures";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

const orderA = cert.orders![0]!;
const orderB = cert.orders![1]!;

function lifecycle(confirmedKopecks: number, extra: Record<string, number> = {}) {
  return {
    actorId: "qa",
    permissions: { recipient: true, payerOwner: false, sellerAllowed: false, cash: false, transfer: false, canSuspend: false },
    reward: {
      version: 1,
      summary: {
        original: confirmedKopecks,
        amount: confirmedKopecks,
        pending: extra.pending ?? 0,
        confirmed: extra.confirmed ?? confirmedKopecks,
        suspended: extra.suspended ?? 0,
        paid: extra.paid ?? 0,
        review: extra.review ?? 0,
      },
      lines: [],
      payments: [],
      history: [],
      nextConfirmationAt: null,
    },
  };
}

describe("CertificatePurchases receipt modal", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    resetBodyScrollLockForTests();
    window.location.hash = "";
    remcardFetch.mockImplementation((path: string) => {
      if (path.includes(orderA.id)) {
        return Promise.resolve(lifecycle(600_000));
      }
      if (path.includes(orderB.id)) {
        return Promise.resolve(
          lifecycle(0, { amount: 0, confirmed: 0, pending: 0, paid: 0 }),
        );
      }
      return Promise.reject(new Error(`unexpected ${path}`));
    });
  });

  it("opens accrual receipt from list button and swaps purchase without stale hero", async () => {
    const user = userEvent.setup();
    render(
      <CertificatePurchases
        orders={cert.orders}
        hasPurchases
        promoCode={cert.promoCode}
        clientName="Синтетический клиент"
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "Начисление · Подробнее" })[0]!);
    const dialog1 = await screen.findByTestId("purchase-accrual-receipt-dialog");
    await waitFor(() => {
      expect(dialog1).toHaveAttribute("data-order-id", orderA.id);
      expect(within(dialog1).getByText("Начислено")).toBeVisible();
      expect(within(dialog1).getByText(/Выплата ещё не проведена/)).toBeVisible();
    });

    await user.click(within(dialog1).getByRole("button", { name: "Закрыть" }));
    await user.click(screen.getAllByRole("button", { name: "Начисление · Подробнее" })[1]!);
    const dialog2 = await screen.findByTestId("purchase-accrual-receipt-dialog");
    await waitFor(() => {
      expect(dialog2).toHaveAttribute("data-order-id", orderB.id);
      expect(within(dialog2).getByText(/Покупка отменена · Нет начисления/)).toBeVisible();
    });
    expect(within(dialog2).queryByText(/\+6\s?000 ₽/)).toBeNull();
  });
});
