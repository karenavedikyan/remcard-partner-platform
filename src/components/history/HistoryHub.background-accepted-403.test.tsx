import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryHub } from "./HistoryHub";
import { ACCEPTED_STORE_ACCESS_DENIED_NOTE } from "@/lib/history-labels";
import type { PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { WALLET_VISIBLE_REFRESH_DEBOUNCE_MS } from "@/lib/wallet-data-refresh";

const user: AuthUser = {
  id: "dual-1",
  role: "PRO",
  partnerType: "MASTER",
  displayName: "Dual",
};

const acceptedPage1: PurchaseRow = {
  id: "acc-1",
  source: "accepted-order",
  orderId: "acc-1",
  bonusId: null,
  createdAt: "2026-10-02T10:00:00.000Z",
  promoCode: "RC-ACCEPTED-1",
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

const acceptedPage2: PurchaseRow = {
  ...acceptedPage1,
  id: "acc-2",
  orderId: "acc-2",
  promoCode: "RC-ACCEPTED-2",
  createdAt: "2026-10-01T10:00:00.000Z",
};

const issuedRow: PurchaseRow = {
  id: "iss-1",
  source: "issued-order",
  orderId: "iss-1",
  bonusId: null,
  createdAt: "2026-09-30T10:00:00.000Z",
  promoCode: "RC-ISSUED-1",
  partnerName: "Store",
  direction: "issued",
  totalAmount: 500,
  discountAmount: 0,
  payableAmount: 500,
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

vi.mock("@/lib/history-loader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/history-loader")>();
  return {
    ...actual,
    fetchHistoryData: vi.fn(),
    fetchAcceptedPurchasePage: vi.fn(),
  };
});

import { fetchAcceptedPurchasePage, fetchHistoryData } from "@/lib/history-loader";

describe("HistoryHub background refresh accepted 403", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [acceptedPage1],
      accruals: [],
      sources: { acceptedOrders: true, issuedOrders: false },
      acceptedPagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" },
      acceptedAccessDenied: false,
    });
    vi.mocked(fetchAcceptedPurchasePage).mockResolvedValue({
      purchases: [acceptedPage2],
      pagination: { limit: 1, hasMore: false, nextCursor: null },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("drops paginated accepted tail when background refresh reports accepted 403", async () => {
    const ui = userEvent.setup();
    render(<HistoryHub user={user} scopeKey="history:dual-1:PRO" />);

    await screen.findByRole("link", { name: /RC-ACCEPTED-1/i });
    await ui.click(screen.getByRole("button", { name: /показать ещё/i }));
    await waitFor(() => expect(screen.getByRole("link", { name: /RC-ACCEPTED-2/i })).toBeInTheDocument());

    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [issuedRow],
      accruals: [],
      sources: { acceptedOrders: false, issuedOrders: true },
      acceptedPagination: null,
      acceptedAccessDenied: true,
    });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(WALLET_VISIBLE_REFRESH_DEBOUNCE_MS + 50);
    vi.useRealTimers();

    await waitFor(() => expect(fetchHistoryData).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("link", { name: /RC-ACCEPTED-2/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /RC-ACCEPTED-1/i })).toBeNull();
    expect(screen.getByRole("link", { name: /RC-ISSUED-1/i })).toBeInTheDocument();
    expect(screen.getByText(ACCEPTED_STORE_ACCESS_DENIED_NOTE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /показать ещё/i })).toBeNull();
  });
});
