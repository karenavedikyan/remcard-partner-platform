import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccrualDetail } from "./AccrualDetail";
import type { AccrualRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

const profUser: AuthUser = {
  id: "prof-1",
  role: "PRO",
  partnerType: null,
  displayName: "PROF",
};

const bonusRow: AccrualRow = {
  id: "shared-id",
  orderId: "order-bonus",
  accrualType: "bonus",
  createdAt: "2026-10-01T10:00:00.000Z",
  amount: 100,
  status: "CONFIRMED",
  paidAt: null,
  counterpartyName: "Shop",
  promoCode: "RC-1",
  isSelfScan: false,
  walletRole: "MASTER",
  scope: "earned",
  items: [],
};

const agentRow: AccrualRow = {
  ...bonusRow,
  orderId: "order-agent",
  accrualType: "agentBonus",
  amount: 200,
};

vi.mock("@/lib/history-loader", () => ({
  fetchAccrualById: vi.fn(),
  fetchPurchaseByOrderId: vi.fn(),
  fetchPurchaseRows: vi.fn(),
}));

import { fetchAccrualById, fetchPurchaseByOrderId } from "@/lib/history-loader";

describe("AccrualDetail accrualType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPurchaseByOrderId).mockResolvedValue(null);
  });

  it("loads bonus and agentBonus separately for shared test id", async () => {
    vi.mocked(fetchAccrualById).mockImplementation(async (_id, type) => {
      if (type === "bonus") return bonusRow;
      if (type === "agentBonus") return agentRow;
      return null;
    });

    const { rerender } = render(
      <AccrualDetail user={profUser} accrualId="shared-id" accrualType="bonus" />,
    );
    expect(await screen.findByText(/100 ₽/)).toBeInTheDocument();
    expect(fetchAccrualById).toHaveBeenCalledWith("shared-id", "bonus");

    rerender(
      <AccrualDetail user={profUser} accrualId="shared-id" accrualType="agentBonus" />,
    );
    expect(await screen.findByText(/200 ₽/)).toBeInTheDocument();
    expect(fetchAccrualById).toHaveBeenCalledWith("shared-id", "agentBonus");
  });
});
