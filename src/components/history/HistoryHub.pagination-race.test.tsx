import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import { HistoryHub } from "./HistoryHub";
import type { PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";
import { WALLET_VISIBLE_REFRESH_DEBOUNCE_MS } from "@/lib/wallet-data-refresh";

const user: AuthUser = {
  id: "race-1",
  role: "PRO",
  partnerType: "STORE",
  displayName: "Store",
};

const acceptedPage1: PurchaseRow = {
  id: "acc-p1",
  source: "accepted-order",
  orderId: "acc-p1",
  bonusId: null,
  createdAt: "2026-10-02T10:00:00.000Z",
  promoCode: "RC-PAGE1",
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
  id: "acc-p2",
  orderId: "acc-p2",
  promoCode: "RC-PAGE2",
  createdAt: "2026-10-01T10:00:00.000Z",
};

const issuedRow: PurchaseRow = {
  ...acceptedPage1,
  id: "iss-1",
  orderId: "iss-1",
  promoCode: "RC-ISS",
  direction: "issued",
  source: "issued-order",
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

describe("HistoryHub pagination race guards", () => {
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("invalidates pending load-more when background refresh closes accepted source", async () => {
    const ui = userEvent.setup();
    let releasePage2!: (value: { purchases: PurchaseRow[]; pagination: object }) => void;
    const page2Deferred = new Promise<{ purchases: PurchaseRow[]; pagination: object }>(
      (resolve) => {
        releasePage2 = resolve;
      },
    );
    vi.mocked(fetchAcceptedPurchasePage).mockReturnValue(page2Deferred);

    render(<HistoryHub user={user} scopeKey="history:race-1:PRO" />);
    await screen.findByRole("link", { name: /RC-PAGE1/i });

    await ui.click(screen.getByRole("button", { name: /показать ещё/i }));
    await waitFor(() => expect(fetchAcceptedPurchasePage).toHaveBeenCalled());

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
    await waitFor(() => expect(fetchHistoryData).toHaveBeenCalledTimes(2));
    vi.useRealTimers();

    releasePage2({
      purchases: [acceptedPage2],
      pagination: { limit: 1, hasMore: false, nextCursor: null },
    });

    await waitFor(() => expect(screen.queryByRole("link", { name: /RC-PAGE2/i })).toBeNull());
    expect(screen.queryByRole("link", { name: /RC-PAGE1/i })).toBeNull();
  });

  it("drops stale background snapshot after pagination 403", async () => {
    const ui = userEvent.setup();
    let releaseBackground!: () => void;
    const backgroundDeferred = new Promise<{
      purchases: PurchaseRow[];
      accruals: [];
      sources: { acceptedOrders: boolean; issuedOrders: boolean };
      acceptedPagination: { limit: number; hasMore: boolean; nextCursor: string } | null;
      acceptedAccessDenied: boolean;
    }>((resolve) => {
      releaseBackground = () =>
        resolve({
          purchases: [acceptedPage1, acceptedPage2],
          accruals: [],
          sources: { acceptedOrders: true, issuedOrders: false },
          acceptedPagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" },
          acceptedAccessDenied: false,
        });
    });

    vi.mocked(fetchHistoryData)
      .mockResolvedValueOnce({
        purchases: [acceptedPage1, issuedRow],
        accruals: [],
        sources: { acceptedOrders: true, issuedOrders: true },
        acceptedPagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" },
        acceptedAccessDenied: false,
      })
      .mockImplementationOnce(() => backgroundDeferred);

    vi.mocked(fetchAcceptedPurchasePage).mockRejectedValue(new RemcardApiError(403, "Forbidden"));

    render(<HistoryHub user={user} scopeKey="history:race-1:PRO" />);
    await screen.findByRole("link", { name: /RC-PAGE1/i });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(WALLET_VISIBLE_REFRESH_DEBOUNCE_MS + 50);
    await waitFor(() => expect(fetchHistoryData).toHaveBeenCalledTimes(2));
    vi.useRealTimers();

    await ui.click(screen.getByRole("button", { name: /показать ещё/i }));
    await waitFor(() =>
      expect(screen.queryByRole("link", { name: /RC-PAGE1/i })).toBeNull(),
    );

    releaseBackground();
    await waitFor(() => expect(screen.queryByRole("link", { name: /RC-PAGE2/i })).toBeNull());
    expect(screen.queryByRole("link", { name: /RC-PAGE1/i })).toBeNull();
    expect(screen.getByRole("link", { name: /RC-ISS/i })).toBeInTheDocument();
  });
});
