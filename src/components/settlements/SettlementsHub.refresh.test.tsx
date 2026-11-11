import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettlementsHub } from "./SettlementsHub";
import { RemcardApiError } from "@/lib/api-client";
import { WALLET_STALE_DATA_NOTICE, WALLET_VISIBLE_REFRESH_DEBOUNCE_MS } from "@/lib/wallet-data-refresh";

vi.mock("./settlements.module.css", () => ({ default: {} }));
vi.mock("@/components/ui/Button.module.css", () => ({ default: {} }));
vi.mock("@/components/payout/payout-record.module.css", () => ({ default: {} }));
vi.mock("@/components/wallet-empty/wallet-empty.module.css", () => ({ default: {} }));

vi.mock("@/components/ui/Button", () => ({
  Button: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props} />
  ),
}));

vi.mock("@/components/settlements/RewardLifecyclePanel", () => ({
  RewardLifecyclePanel: () => null,
}));

vi.mock("@/lib/settlements-loader", () => ({
  fetchSettlements: vi.fn(),
  isSettlementsAccessDenied: vi.fn(() => false),
}));

import { fetchSettlements } from "@/lib/settlements-loader";

const sampleResponse = {
  coverageNote: "",
  receivable: [
    {
      id: "b-pending",
      orderId: "o1",
      accrualType: "agentBonus" as const,
      counterpartyId: "store-1",
      counterpartyName: "Shop",
      amount: 0,
      pendingAmount: 26750,
      basis: "Покупка",
      status: "CALCULATED" as const,
      createdAt: "2026-10-01T10:00:00.000Z",
    },
  ],
  payable: [],
  completed: [],
};

describe("SettlementsHub visible refresh", () => {
  beforeEach(() => {
    vi.mocked(fetchSettlements).mockReset();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });

  it("keeps last good data with stale notice when background refresh fails", async () => {
    vi.mocked(fetchSettlements)
      .mockResolvedValueOnce(sampleResponse)
      .mockRejectedValueOnce(new RemcardApiError(500, "Сбой"));

    render(<SettlementsHub walletEmptyViewerRole="agent" />);

    expect(await screen.findByTestId("settlements-hub")).toBeInTheDocument();
    expect(screen.getAllByText(/ожидает подтверждения.*26/i).length).toBeGreaterThan(0);

    vi.useFakeTimers({ shouldAdvanceTime: true });
    await actPollRefresh();
    vi.useRealTimers();

    expect(await screen.findByTestId("settlements-refresh-notice")).toHaveTextContent(
      WALLET_STALE_DATA_NOTICE,
    );
    expect(screen.getAllByText(/ожидает подтверждения.*26/i).length).toBeGreaterThan(0);
  });

  it("clears sensitive data on 401 and stops treating zeros as success", async () => {
    vi.mocked(fetchSettlements).mockRejectedValue(new RemcardApiError(401, "Unauthorized"));

    render(<SettlementsHub walletEmptyViewerRole="agent" />);

    expect(await screen.findByText(/сессия завершилась/i)).toBeInTheDocument();
    expect(screen.queryByTestId("settlements-hub")).toBeNull();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

async function actPollRefresh() {
  await waitFor(() => expect(fetchSettlements).toHaveBeenCalledTimes(1));
  window.dispatchEvent(new Event("focus"));
  await vi.advanceTimersByTimeAsync(WALLET_VISIBLE_REFRESH_DEBOUNCE_MS + 50);
  await waitFor(() => expect(fetchSettlements).toHaveBeenCalledTimes(2));
}
