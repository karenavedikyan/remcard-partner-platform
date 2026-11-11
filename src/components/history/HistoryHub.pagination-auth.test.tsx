import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemcardApiError } from "@/lib/api-client";
import { ACCEPTED_STORE_ACCESS_DENIED_NOTE } from "@/lib/history-labels";
import { HistoryHub } from "./HistoryHub";
import type { PurchaseRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

const user: AuthUser = {
  id: "store-1",
  role: "PRO",
  partnerType: "STORE",
  displayName: "Store",
};

const acceptedRow: PurchaseRow = {
  id: "acc-1",
  source: "accepted-order",
  orderId: "acc-1",
  bonusId: null,
  createdAt: "2026-10-02T10:00:00.000Z",
  promoCode: "RC-ACC",
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

const issuedRow: PurchaseRow = {
  ...acceptedRow,
  id: "iss-1",
  orderId: "iss-1",
  promoCode: "RC-ISS",
  direction: "issued",
  source: "issued-order",
  createdAt: "2026-09-30T10:00:00.000Z",
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

describe("HistoryHub load-more auth errors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchHistoryData).mockResolvedValue({
      purchases: [acceptedRow, issuedRow],
      accruals: [],
      sources: { acceptedOrders: true, issuedOrders: true },
      acceptedPagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" },
      acceptedAccessDenied: false,
    });
  });

  it("treats pagination 401 as fatal session clear", async () => {
    const ui = userEvent.setup();
    vi.mocked(fetchAcceptedPurchasePage).mockRejectedValue(new RemcardApiError(401, "Unauthorized"));

    render(<HistoryHub user={user} />);
    await screen.findByRole("link", { name: /RC-ACC/i });
    await ui.click(screen.getByRole("button", { name: /показать ещё/i }));

    await waitFor(() =>
      expect(screen.getByText(/сессия завершилась/i)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("link", { name: /RC-ACC/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /RC-ISS/i })).toBeNull();
  });

  it("treats pagination 403 as optional accepted loss, keeps issued", async () => {
    const ui = userEvent.setup();
    vi.mocked(fetchAcceptedPurchasePage).mockRejectedValue(new RemcardApiError(403, "Forbidden"));

    render(<HistoryHub user={user} />);
    await screen.findByRole("link", { name: /RC-ACC/i });
    await ui.click(screen.getByRole("button", { name: /показать ещё/i }));

    await waitFor(() =>
      expect(screen.getByText(ACCEPTED_STORE_ACCESS_DENIED_NOTE)).toBeInTheDocument(),
    );
    expect(screen.queryByRole("link", { name: /RC-ACC/i })).toBeNull();
    expect(screen.getByRole("link", { name: /RC-ISS/i })).toBeInTheDocument();
    expect(screen.queryByText(/сессия завершилась/i)).toBeNull();
  });
});
