import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PayoutRecordModal } from "./PayoutRecordModal";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/components/payout/payout-record.module.css", () => ({ default: {} }));
vi.mock("@/components/ui/Button.module.css", () => ({ default: { primary: "primary", secondary: "secondary" } }));
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

const recordBonusPayoutFact = vi.fn();
const getOrCreatePayoutAttemptIdempotencyKey = vi.fn((bonusId: string) => `stable-key-${bonusId}`);
const clearPayoutAttemptIdempotencyKey = vi.fn();

vi.mock("@/lib/payout-record", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/payout-record")>();
  return {
    ...actual,
    recordBonusPayoutFact: (...args: unknown[]) => recordBonusPayoutFact(...args),
    getOrCreatePayoutAttemptIdempotencyKey: (bonusId: string) =>
      getOrCreatePayoutAttemptIdempotencyKey(bonusId),
    clearPayoutAttemptIdempotencyKey: (bonusId: string) => clearPayoutAttemptIdempotencyKey(bonusId),
  };
});

const target = {
  bonusId: "bonus-modal-1",
  counterpartyName: "Partner",
  amount: 500,
  basis: "Работы",
  payoutActions: { canRecordCash: true, canRecordTransfer: false },
};

describe("PayoutRecordModal production guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordBonusPayoutFact.mockResolvedValue({ replay: false });
  });

  it("blocks Escape and backdrop close while loading", async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    let resolvePay!: (value: unknown) => void;
    recordBonusPayoutFact.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePay = resolve;
        }),
    );
    render(<PayoutRecordModal target={target} onClose={onClose} onSuccess={onSuccess} />);
    await userEvent.click(screen.getByTestId("payout-record-submit"));

    await waitFor(() => expect(screen.getByRole("button", { name: /Сохраняем/i })).toBeDisabled());

    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByTestId("payout-record-backdrop"));
    expect(onClose).not.toHaveBeenCalled();

    resolvePay({ replay: false });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it("allows Escape close when not loading", async () => {
    const onClose = vi.fn();
    render(<PayoutRecordModal target={target} onClose={onClose} onSuccess={vi.fn()} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("wraps Tab focus inside the dialog", () => {
    render(<PayoutRecordModal target={target} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const dialog = screen.getByTestId("payout-record-modal");
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
    last.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(first);
  });

  it("reuses idempotency key on retry after network error and after remount", async () => {
    const onClose = vi.fn();
    recordBonusPayoutFact.mockRejectedValueOnce(new RemcardApiError(0, "Сетевая ошибка", null));
    const { unmount, rerender } = render(
      <PayoutRecordModal target={target} onClose={onClose} onSuccess={vi.fn()} />,
    );
    await userEvent.click(screen.getByTestId("payout-record-submit"));
    await screen.findByText(/Результат неизвестен/i);

    recordBonusPayoutFact.mockResolvedValueOnce({ replay: false });
    await userEvent.click(screen.getByTestId("payout-record-submit"));
    expect(recordBonusPayoutFact).toHaveBeenLastCalledWith(
      expect.objectContaining({ idempotencyKey: "stable-key-bonus-modal-1" }),
    );

    unmount();
    render(<PayoutRecordModal target={target} onClose={onClose} onSuccess={vi.fn()} />);
    recordBonusPayoutFact.mockResolvedValueOnce({ replay: false });
    await userEvent.click(screen.getByTestId("payout-record-submit"));
    expect(recordBonusPayoutFact).toHaveBeenLastCalledWith(
      expect.objectContaining({ idempotencyKey: "stable-key-bonus-modal-1" }),
    );
    expect(clearPayoutAttemptIdempotencyKey).toHaveBeenCalledWith("bonus-modal-1");
  });

  it("ignores double submit while loading", async () => {
    recordBonusPayoutFact.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ replay: false }), 50)),
    );
    render(<PayoutRecordModal target={target} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const submit = screen.getByTestId("payout-record-submit");
    await userEvent.click(submit);
    await userEvent.click(submit);
    await waitFor(() => expect(recordBonusPayoutFact).toHaveBeenCalledTimes(1));
  });

  it("shows API 409 message without unknown-outcome copy", async () => {
    recordBonusPayoutFact.mockRejectedValueOnce(new RemcardApiError(409, "Конфликт", null));
    render(<PayoutRecordModal target={target} onClose={vi.fn()} onSuccess={vi.fn()} />);
    await userEvent.click(screen.getByTestId("payout-record-submit"));
    await screen.findByText("Конфликт");
    expect(screen.queryByText(/Результат неизвестен/i)).toBeNull();
  });

  it.each([
    ["409 conflict", new RemcardApiError(409, "Конфликт", null)],
    ["504 gateway", new RemcardApiError(504, "Gateway Timeout", null)],
    ["network zero", new RemcardApiError(0, "Сетевая ошибка", null)],
  ])("refocuses enabled submit after record error (%s)", async (_label, error) => {
    recordBonusPayoutFact.mockRejectedValueOnce(error);
    render(<PayoutRecordModal target={target} onClose={vi.fn()} onSuccess={vi.fn()} />);
    const submit = screen.getByTestId("payout-record-submit");
    await userEvent.click(submit);
    await waitFor(() => {
      expect(submit).not.toBeDisabled();
      expect(document.activeElement).toBe(submit);
    });
  });

  it("calls refresh failure handler when payout succeeded but onSuccess failed", async () => {
    const onPostRecordRefreshFailure = vi.fn();
    const onSuccess = vi.fn().mockRejectedValue(new Error("refresh failed"));
    recordBonusPayoutFact.mockResolvedValue({ replay: false });
    render(
      <PayoutRecordModal
        target={target}
        onClose={vi.fn()}
        onSuccess={onSuccess}
        onPostRecordRefreshFailure={onPostRecordRefreshFailure}
      />,
    );
    await userEvent.click(screen.getByTestId("payout-record-submit"));
    await waitFor(() => expect(onPostRecordRefreshFailure).toHaveBeenCalled());
    expect(screen.queryByText(/Не удалось зафиксировать/i)).toBeNull();
    expect(clearPayoutAttemptIdempotencyKey).toHaveBeenCalledWith("bonus-modal-1");
  });
});
