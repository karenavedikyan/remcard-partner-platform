import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryHub } from "./HistoryHub";
import type { PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { WALLET_VISIBLE_REFRESH_DEBOUNCE_MS } from "@/lib/wallet-data-refresh";

const user: AuthUser = {
  id: "store-1",
  role: "PRO",
  partnerType: "STORE",
  displayName: "Store",
};

const page1: PurchaseRow = {
  id: "ord-page-1",
  source: "accepted-order",
  orderId: "ord-page-1",
  bonusId: null,
  createdAt: "2026-10-02T10:00:00.000Z",
  promoCode: "RC-PAGE-1",
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

const page2: PurchaseRow = {
  ...page1,
  id: "ord-page-2",
  orderId: "ord-page-2",
  promoCode: "RC-PAGE-2",
  createdAt: "2026-10-01T10:00:00.000Z",
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

describe("HistoryHub background refresh keeps paginated accepted tail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    const initialPayload = {
      purchases: [page1],
      accruals: [],
      sources: { acceptedOrders: true, issuedOrders: false },
      acceptedPagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" },
      acceptedAccessDenied: false,
    };
    vi.mocked(fetchHistoryData).mockResolvedValue(initialPayload);
    vi.mocked(fetchAcceptedPurchasePage).mockResolvedValue({
      purchases: [page2],
      pagination: { limit: 1, hasMore: false, nextCursor: null },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retains page-2 rows after visible background refresh updates page-1 head", async () => {
    const ui = userEvent.setup();
    render(<HistoryHub user={user} scopeKey="history:store-1:PRO" />);

    await screen.findByRole("link", { name: /RC-PAGE-1/i });
    await ui.click(screen.getByRole("button", { name: /показать ещё/i }));
    await waitFor(() => expect(screen.getByRole("link", { name: /RC-PAGE-2/i })).toBeInTheDocument());

    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [{ ...page1, payableAmount: 999 }],
      accruals: [],
      sources: { acceptedOrders: true, issuedOrders: false },
      acceptedPagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" },
      acceptedAccessDenied: false,
    });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(WALLET_VISIBLE_REFRESH_DEBOUNCE_MS + 50);
    vi.useRealTimers();

    await waitFor(() => expect(fetchHistoryData).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("link", { name: /RC-PAGE-2/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /RC-PAGE-1/i })).toBeInTheDocument();
    expect(screen.getByText(/999/)).toBeInTheDocument();
  });
});
