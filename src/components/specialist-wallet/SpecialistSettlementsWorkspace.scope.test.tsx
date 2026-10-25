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

vi.mock("@/lib/specialist-settlements/export-xlsx", () => ({
  downloadMasterSettlementsXlsx: vi.fn().mockResolvedValue(undefined),
}));

import { fetchSettlements } from "@/lib/settlements-loader";

const rowForOwner = (suffix: string, amount: number) => ({
  id: `bonus-${suffix}`,
  orderId: `order-${suffix}`,
  accrualType: "bonus" as const,
  counterpartyId: `cp-${suffix}`,
  counterpartyName: `Partner ${suffix}`,
  amount,
  basis: "Сертификат RC-GATE",
  status: "CONFIRMED" as const,
  createdAt: "2026-10-01T10:00:00.000Z",
  payoutActions: { canRecordCash: true, canRecordTransfer: false },
});

describe("SpecialistSettlementsWorkspace scope / load generation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not apply a late settlements response after scope switches between two owners", async () => {
    let resolveSlow: (value: Awaited<ReturnType<typeof fetchSettlements>>) => void;
    const slowPromise = new Promise<Awaited<ReturnType<typeof fetchSettlements>>>((resolve) => {
      resolveSlow = resolve;
    });
    vi.mocked(fetchSettlements)
      .mockReturnValueOnce(slowPromise)
      .mockResolvedValueOnce({
        coverageNote: "",
        receivable: [],
        payable: [rowForOwner("b", 999)],
        completed: [],
      });

    const { rerender } = render(<SpecialistSettlementsWorkspace scopeKey="store:owner-a" />);
    rerender(<SpecialistSettlementsWorkspace scopeKey="store:owner-b" />);

    await screen.findByTestId("specialist-settlements-workspace");
    await waitFor(() =>
      expect(screen.getByTestId("specialist-wallet-payable-total")).toHaveTextContent(/999/),
    );

    resolveSlow!({
      coverageNote: "",
      receivable: [],
      payable: [rowForOwner("a", 111)],
      completed: [],
    });

    await waitFor(() =>
      expect(screen.getByTestId("specialist-wallet-payable-total")).toHaveTextContent(/999/),
    );
    expect(screen.getByTestId("specialist-wallet-payable-total")).not.toHaveTextContent(/111/);
  });

  it("keeps access denied when an older success arrives after a newer 403", async () => {
    let resolveLate: (value: Awaited<ReturnType<typeof fetchSettlements>>) => void;
    const latePromise = new Promise<Awaited<ReturnType<typeof fetchSettlements>>>((resolve) => {
      resolveLate = resolve;
    });
    vi.mocked(fetchSettlements)
      .mockReturnValueOnce(latePromise)
      .mockRejectedValueOnce(new RemcardApiError(403, "Forbidden"));

    const { rerender } = render(<SpecialistSettlementsWorkspace scopeKey="company:owner-1" />);
    rerender(<SpecialistSettlementsWorkspace scopeKey="company:owner-revoked" />);

    expect(await screen.findByText(/недоступен для этого аккаунта/i)).toBeInTheDocument();

    resolveLate!({
      coverageNote: "",
      receivable: [],
      payable: [rowForOwner("stale", 500)],
      completed: [],
    });

    await waitFor(() =>
      expect(screen.queryByTestId("specialist-wallet-payable-total")).toBeNull(),
    );
    expect(screen.getByText(/недоступен для этого аккаунта/i)).toBeInTheDocument();
  });

  it("retries after error without resurrecting stale modal state on scope change", async () => {
    vi.mocked(fetchSettlements)
      .mockRejectedValueOnce(new RemcardApiError(500, "Сбой сервера"))
      .mockResolvedValueOnce({
        coverageNote: "",
        receivable: [],
        payable: [rowForOwner("ok", 1200)],
        completed: [],
      });

    const user = userEvent.setup();
    const { rerender } = render(<SpecialistSettlementsWorkspace scopeKey="store:retry-owner" />);
    expect(await screen.findByText(/сбой сервера/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /повторить/i }));
    await screen.findByTestId("specialist-wallet-payable-total");

    await user.click(screen.getByTestId("specialist-wallet-payable-total"));
    await user.click(screen.getByTestId("specialist-partner-group-cp-ok"));
    await user.click(screen.getByTestId("specialist-settlements-record-payout-bonus-ok"));
    expect(screen.getByRole("heading", { name: "Зафиксировать выплату" })).toBeInTheDocument();

    rerender(<SpecialistSettlementsWorkspace scopeKey="store:other-owner" />);
    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Зафиксировать выплату" })).toBeNull(),
    );
  });

  it("ignores in-flight load after unmount", async () => {
    let resolveLate: (value: Awaited<ReturnType<typeof fetchSettlements>>) => void;
    const latePromise = new Promise<Awaited<ReturnType<typeof fetchSettlements>>>((resolve) => {
      resolveLate = resolve;
    });
    vi.mocked(fetchSettlements).mockReturnValueOnce(latePromise);

    const { unmount } = render(<SpecialistSettlementsWorkspace scopeKey="store:unmount" />);
    unmount();

    resolveLate!({
      coverageNote: "",
      receivable: [],
      payable: [rowForOwner("ghost", 1)],
      completed: [],
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(fetchSettlements).toHaveBeenCalledTimes(1);
  });
});
