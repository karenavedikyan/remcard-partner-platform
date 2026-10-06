import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryHub } from "./HistoryHub";
import type { PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

const profUser: AuthUser = {
  id: "prof-1",
  role: "PRO",
  partnerType: null,
  displayName: "PROF",
};

const issuedPurchase: PurchaseRow = {
  id: "ord-issued",
  source: "issued-order",
  orderId: "ord-issued",
  bonusId: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  promoCode: "RC-ISSUED-1",
  partnerName: "Shop",
  direction: "issued",
  totalAmount: 1000,
  discountAmount: 100,
  payableAmount: 900,
  orderStatus: "CONFIRMED",
  bonusStatus: null,
  isSelfScan: false,
  clientName: null,
  branchName: null,
  executorName: null,
  proBonus: 100,
  linkedAccruals: [],
  linkedAccrualIds: [],
  items: [],
};

vi.mock("@/lib/history-loader", () => ({
  fetchHistoryData: vi.fn(),
  fetchAcceptedPurchasePage: vi.fn(),
}));

import { fetchHistoryData } from "@/lib/history-loader";

describe("HistoryHub store access denied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [issuedPurchase],
      accruals: [],
      sources: { acceptedOrders: false, issuedOrders: true },
      acceptedPagination: null,
      acceptedAccessDenied: true,
    });
  });

  it("shows access note and issued purchases when store API returns 403", async () => {
    render(<HistoryHub user={profUser} />);

    expect(
      await screen.findByText(/покупки «принято у меня» недоступны/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/RC-ISSUED-1/)).toBeInTheDocument();
    expect(screen.queryByText(/нет доступных покупок/i)).toBeNull();
  });
});
