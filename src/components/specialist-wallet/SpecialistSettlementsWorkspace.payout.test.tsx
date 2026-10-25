import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistSettlementsWorkspace } from "./SpecialistSettlementsWorkspace";
import { RemcardApiError } from "@/lib/api-client";

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn((error: unknown) =>
    error instanceof RemcardApiError && (error.status === 403 || error.status === 404),
  ),
}));

vi.mock("@/lib/payout-record", () => ({
  payoutConfirmLabel: (m: string) => (m === "CASH" ? "Подтвердить выплату наличными" : "Подтвердить перевод"),
  PAYOUT_EXTERNAL_FACT_NOTE: "note",
  newPayoutIdempotencyKey: (id: string) => `key-${id}`,
  recordBonusPayoutFact: vi.fn().mockResolvedValue({ replay: false }),
}));

import { fetchSettlements } from "@/lib/settlements-loader";
import { recordBonusPayoutFact } from "@/lib/payout-record";

const payableRow = {
  id: "bonus-gate-1",
  orderId: "order-gate-1",
  accrualType: "bonus" as const,
  counterpartyId: "cp-1",
  counterpartyName: "Partner One",
  amount: 1200,
  basis: "Сертификат RC-GATE",
  status: "CONFIRMED" as const,
  createdAt: "2026-10-01T10:00:00.000Z",
  payoutActions: { canRecordCash: true, canRecordTransfer: false },
};

describe("SpecialistSettlementsWorkspace payout path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSettlements).mockResolvedValue({
      coverageNote: "",
      receivable: [],
      payable: [payableRow],
      completed: [],
    });
  });

  it("records payout via modal and reloads settlements", async () => {
    const user = userEvent.setup();
    render(<SpecialistSettlementsWorkspace />);
    await screen.findByTestId("specialist-settlements-workspace");
    await user.click(screen.getByTestId("specialist-wallet-payable-total"));
    await user.click(screen.getByTestId("specialist-partner-group-cp-1"));
    await user.click(screen.getByTestId("specialist-settlements-record-payout-bonus-gate-1"));
    await user.click(screen.getByRole("button", { name: /Подтвердить выплату наличными/i }));
    await waitFor(() => expect(recordBonusPayoutFact).toHaveBeenCalled());
    expect(fetchSettlements.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("clears payout dialog state when scopeKey changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SpecialistSettlementsWorkspace scopeKey="store:owner-a" />);
    await screen.findByTestId("specialist-settlements-workspace");
    await user.click(screen.getByTestId("specialist-wallet-payable-total"));
    await user.click(screen.getByTestId("specialist-partner-group-cp-1"));
    await user.click(screen.getByTestId("specialist-settlements-record-payout-bonus-gate-1"));
    expect(screen.getByRole("heading", { name: "Зафиксировать выплату" })).toBeInTheDocument();
    rerender(<SpecialistSettlementsWorkspace scopeKey="company:owner-b" />);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Зафиксировать выплату" })).toBeNull(),
    );
  });
});
