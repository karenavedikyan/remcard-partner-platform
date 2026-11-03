/**
 * Regression: closing the wallet accrual dialog must restore focus to the opener
 * exactly once (not fall back to the shell root after a second restore).
 */
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WalletAccrualsShell } from "./WalletAccrualsShell";

vi.mock("./wallet-accruals.global.css", () => ({}));
vi.mock("@/components/ui/Button.module.css", () => ({
  default: { primary: "primary", secondary: "secondary" },
}));
vi.mock("@/components/payout/payout-record.module.css", () => ({ default: {} }));

vi.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/lib/payout-record", () => ({
  payoutConfirmLabel: (m: string) =>
    m === "CASH" ? "Подтвердить выплату наличными" : "Подтвердить перевод",
  PAYOUT_EXTERNAL_FACT_NOTE: "note",
  newPayoutIdempotencyKey: (id: string) => `key-${id}`,
  getOrCreatePayoutAttemptIdempotencyKey: (id: string) => `stable-${id}`,
  clearPayoutAttemptIdempotencyKey: vi.fn(),
  isLikelyUnknownPayoutNetworkOutcome: vi.fn(() => false),
  recordBonusPayoutFact: vi.fn().mockResolvedValue({ replay: false }),
}));

const receivableRow = {
  id: "bonus-recv-1",
  orderId: "order-recv-1",
  accrualType: "bonus" as const,
  counterpartyId: "cp-1",
  counterpartyName: "Partner In",
  amount: 1500,
  basis: "Отделка",
  status: "CONFIRMED",
  createdAt: "2026-10-01T10:00:00.000Z",
};

const payableRow = {
  id: "bonus-pay-1",
  orderId: "order-pay-1",
  accrualType: "bonus" as const,
  counterpartyId: "cp-2",
  counterpartyName: "Partner Out",
  amount: 900,
  basis: "Отделка",
  status: "CONFIRMED",
  createdAt: "2026-10-01T10:00:00.000Z",
  payoutActions: { canRecordCash: true, canRecordTransfer: false },
};

const fullData = {
  receivable: [receivableRow],
  payable: [payableRow],
  completed: [],
};

const QUICK_TABS = ["waiting", "schedule", "paid"] as const;
const DIRECTIONS = ["in", "out"] as const;
const CLOSE_VIA = ["escape", "x", "footer"] as const;

type CloseVia = (typeof CLOSE_VIA)[number];

function presentationFor(role: string) {
  return { ribbonLabel: role, cardIdentifier: null as string | null };
}

/** Mirror real dialog.close() ordering: handler runs, then the native `close` event. */
function dispatchDialogClose() {
  const dialog = document.querySelector("dialog.wallet-accrual-dialog");
  expect(dialog).toBeTruthy();
  act(() => {
    dialog!.dispatchEvent(new Event("close", { bubbles: false }));
  });
}

async function closeDialogVia(user: ReturnType<typeof userEvent.setup>, via: CloseVia) {
  const dialog = document.querySelector("dialog.wallet-accrual-dialog") as HTMLDialogElement;
  expect(dialog).toBeTruthy();

  if (via === "escape") {
    await act(async () => {
      dialog.dispatchEvent(new Event("cancel", { bubbles: true, cancelable: true }));
    });
    // onCancel preventDefault + closeDialog → polyfill close does not fire `close`
    dispatchDialogClose();
    return;
  }

  if (via === "x") {
    const xBtn = dialog.querySelector(
      "button.wallet-accrual-dialog__close",
    ) as HTMLButtonElement;
    expect(xBtn).toBeTruthy();
    await user.click(xBtn);
    dispatchDialogClose();
    return;
  }

  const bottom = Array.from(dialog.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Закрыть" && !b.classList.contains("wallet-accrual-dialog__close"),
  );
  expect(bottom).toBeTruthy();
  await user.click(bottom!);
  dispatchDialogClose();
}

describe("WalletAccrualsShell dialog focus restore", () => {
  let focusSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
  });

  afterEach(() => {
    focusSpy.mockRestore();
  });

  function countFocusOn(el: HTMLElement): number {
    return (focusSpy.mock.instances as HTMLElement[]).filter((inst) => inst === el).length;
  }

  for (const role of ["COMPANY", "STORE", "SPECIALIST"] as const) {
    describe(`role ${role}`, () => {
      for (const direction of DIRECTIONS) {
        for (const tab of QUICK_TABS) {
          for (const via of CLOSE_VIA) {
            it(`restores once to wallet-quick-${direction}-${tab} via ${via}`, async () => {
              const user = userEvent.setup();
              render(
                <WalletAccrualsShell
                  data={fullData}
                  presentation={presentationFor(role)}
                />,
              );

              if (direction === "out") {
                await user.click(screen.getByTestId("wallet-direction-out"));
              }

              const trigger = screen.getByTestId(`wallet-quick-${direction}-${tab}`);
              focusSpy.mockClear();
              await user.click(trigger);
              expect(screen.getByTestId("wallet-detail-stat-tiles")).toBeInTheDocument();

              focusSpy.mockClear();
              await closeDialogVia(user, via);

              expect(document.activeElement).toBe(trigger);
              expect(countFocusOn(trigger)).toBe(1);
              expect(countFocusOn(screen.getByTestId("wallet-accruals"))).toBe(0);
            });
          }
        }
      }
    });
  }

  describe("role AGENT (incomingOnly)", () => {
    for (const tab of QUICK_TABS) {
      for (const via of CLOSE_VIA) {
        it(`restores once to wallet-quick-in-${tab} via ${via}`, async () => {
          const user = userEvent.setup();
          render(
            <WalletAccrualsShell
              data={{ receivable: [receivableRow], payable: [], completed: [] }}
              incomingOnly
              presentation={presentationFor("AGENT")}
            />,
          );

          expect(screen.queryByTestId("wallet-direction-out")).toBeNull();
          const trigger = screen.getByTestId(`wallet-quick-in-${tab}`);
          await user.click(trigger);
          focusSpy.mockClear();
          await closeDialogVia(user, via);

          expect(document.activeElement).toBe(trigger);
          expect(countFocusOn(trigger)).toBe(1);
          expect(countFocusOn(screen.getByTestId("wallet-accruals"))).toBe(0);
        });
      }
    }

    it("agent R05 off path: coverage note + focus restore to quick trigger", async () => {
      const user = userEvent.setup();
      render(
        <WalletAccrualsShell
          data={{ receivable: [receivableRow], payable: [], completed: [] }}
          incomingOnly
          coverageNote="R05 off"
          presentation={presentationFor("AGENT")}
        />,
      );

      expect(screen.getByTestId("wallet-coverage-note")).toHaveTextContent("R05 off");
      const trigger = screen.getByTestId("wallet-quick-in-waiting");
      await user.click(trigger);
      focusSpy.mockClear();
      await closeDialogVia(user, "footer");
      expect(document.activeElement).toBe(trigger);
      expect(countFocusOn(trigger)).toBe(1);
    });
  });

  it("returns focus to history row that opened a txn", async () => {
    const user = userEvent.setup();
    render(
      <WalletAccrualsShell data={fullData} presentation={presentationFor("COMPANY")} />,
    );

    const historyRow = screen.getByTestId("wallet-history-row-bonus-recv-1-confirmed");
    await user.click(historyRow);
    expect(screen.getByTestId("wallet-txn-panel")).toBeInTheDocument();

    focusSpy.mockClear();
    await closeDialogVia(user, "x");

    expect(document.activeElement).toBe(historyRow);
    expect(countFocusOn(historyRow)).toBe(1);
    expect(countFocusOn(screen.getByTestId("wallet-accruals"))).toBe(0);
  });

  it("falls back to shell root when the opener was removed", async () => {
    const user = userEvent.setup();
    render(
      <WalletAccrualsShell data={fullData} presentation={presentationFor("STORE")} />,
    );

    const trigger = screen.getByTestId("wallet-quick-in-waiting");
    await user.click(trigger);
    expect(screen.getByTestId("wallet-detail-stat-tiles")).toBeInTheDocument();

    // Remove the opener from the document while the dialog is open
    trigger.remove();

    focusSpy.mockClear();
    const dialog = document.querySelector("dialog.wallet-accrual-dialog") as HTMLDialogElement;
    const bottom = Array.from(dialog.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Закрыть",
    );
    await user.click(bottom!);
    dispatchDialogClose();

    const shell = screen.getByTestId("wallet-accruals");
    expect(document.activeElement).toBe(shell);
    expect(countFocusOn(shell)).toBe(1);
  });
});
