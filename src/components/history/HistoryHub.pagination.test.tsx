import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryHub } from "./HistoryHub";
import type { PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

const user: AuthUser = {
  id: "store-1",
  role: "PRO",
  partnerType: "STORE",
  displayName: "Store",
};

const page1Hidden: PurchaseRow = {
  id: "ord-hidden",
  source: "accepted-order",
  orderId: "ord-hidden",
  bonusId: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  promoCode: "RC-HIDDEN",
  partnerName: "PRO",
  direction: "accepted",
  totalAmount: 1000,
  discountAmount: 0,
  payableAmount: 1000,
  orderStatus: "CONFIRMED",
  bonusStatus: null,
  isSelfScan: false,
  clientName: null,
  branchName: null,
  executorName: null,
  proBonus: 0,
  linkedAccruals: [],
  linkedAccrualIds: [],
  items: [],
};

const page2Match: PurchaseRow = {
  ...page1Hidden,
  id: "ord-match",
  orderId: "ord-match",
  promoCode: "RC-TARGET-999",
};

vi.mock("@/lib/history-loader", () => ({
  fetchHistoryData: vi.fn(),
  fetchAcceptedPurchasePage: vi.fn(),
}));

import { fetchAcceptedPurchasePage, fetchHistoryData } from "@/lib/history-loader";

describe("HistoryHub pagination with active filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [page1Hidden],
      accruals: [],
      sources: { acceptedOrders: true, issuedOrders: false },
      acceptedPagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" },
      acceptedAccessDenied: false,
    });
    vi.mocked(fetchAcceptedPurchasePage).mockResolvedValue({
      purchases: [page2Match],
      pagination: { limit: 1, hasMore: false, nextCursor: null },
    });
  });

  it("shows load-more with empty filter match and reveals purchase on next page", async () => {
    const ui = userEvent.setup();
    render(<HistoryHub user={user} initialPromoCode="RC-TARGET-999" />);

    await screen.findByText(/в загруженных покупках совпадений нет/i);
    expect(screen.getByRole("button", { name: /показать ещё/i })).toBeEnabled();

    await ui.click(screen.getByRole("button", { name: /показать ещё/i }));

    await waitFor(() => {
      expect(screen.getByText(/RC-TARGET-999/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/в загруженных покупках совпадений нет/i)).toBeNull();
    expect(fetchAcceptedPurchasePage).toHaveBeenCalledWith("cursor-2");
  });
});
