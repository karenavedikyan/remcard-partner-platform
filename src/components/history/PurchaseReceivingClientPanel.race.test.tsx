import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import type { PurchaseRow } from "@/lib/history-types";
import { PurchaseReceivingClientPanel } from "./PurchaseReceivingClientPanel";

const fetchAgentClients = vi.fn();
const patchStoreOrderReceivingClient = vi.fn();

vi.mock("@/lib/agent-r03/api", () => ({
  fetchAgentClients: (...args: unknown[]) => fetchAgentClients(...args),
  createAgentClient: vi.fn(),
}));

vi.mock("@/lib/history-receiving-client-api", () => ({
  patchStoreOrderReceivingClient: (...args: unknown[]) => patchStoreOrderReceivingClient(...args),
}));

function purchase(overrides: Partial<PurchaseRow> = {}): PurchaseRow {
  return {
    id: "order-a",
    source: "accepted-order",
    orderId: "order-a",
    bonusId: null,
    createdAt: new Date().toISOString(),
    promoCode: "RC-1",
    partnerName: "Partner",
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
    proBonus: null,
    linkedAccruals: [],
    linkedAccrualIds: [],
    items: [],
    canManageReceivingClient: true,
    receivingLinkRevision: 0,
    ...overrides,
  };
}

describe("PurchaseReceivingClientPanel race (mounted)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchAgentClients.mockReset();
    patchStoreOrderReceivingClient.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ignores stale client search when order scope changes", async () => {
    let resolveSlow: (v: unknown) => void = () => undefined;
    const slowPromise = new Promise((resolve) => {
      resolveSlow = resolve;
    });
    fetchAgentClients.mockImplementation((params?: { q?: string }) => {
      if (params?.q === "slow") return slowPromise;
      return Promise.resolve({
        clients: [{ id: "fast", displayName: "Fast client", certificateCount: 0 }],
      });
    });

    const onLinked = vi.fn();
    const onReload = vi.fn();
    const { rerender } = render(
      <PurchaseReceivingClientPanel
        purchase={purchase({ orderId: "order-a" })}
        onLinked={onLinked}
        onReload={onReload}
      />,
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    fireEvent.change(screen.getByTestId("receiving-client-search"), {
      target: { value: "slow" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(320);
    });

    rerender(
      <PurchaseReceivingClientPanel
        purchase={purchase({ orderId: "order-b" })}
        onLinked={onLinked}
        onReload={onReload}
      />,
    );

    resolveSlow({
      clients: [{ id: "stale", displayName: "Stale client", certificateCount: 0 }],
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByText("Stale client")).toBeNull();
  });

  it("does not apply PATCH result to a different order", async () => {
    fetchAgentClients.mockResolvedValue({
      clients: [{ id: "c1", displayName: "Client one", certificateCount: 0 }],
    });
    let resolvePatch: (v: unknown) => void = () => undefined;
    patchStoreOrderReceivingClient.mockReturnValue(
      new Promise((resolve) => {
        resolvePatch = resolve;
      }),
    );

    const onLinked = vi.fn();
    const onReload = vi.fn();
    const { rerender } = render(
      <PurchaseReceivingClientPanel
        purchase={purchase({ orderId: "order-a" })}
        onLinked={onLinked}
        onReload={onReload}
      />,
    );

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    fireEvent.click(screen.getByText("Client one"));
    fireEvent.click(screen.getByText("Сохранить привязку"));
    fireEvent.click(screen.getByText("Подтвердить"));

    rerender(
      <PurchaseReceivingClientPanel
        purchase={purchase({ orderId: "order-b" })}
        onLinked={onLinked}
        onReload={onReload}
      />,
    );

    resolvePatch({
      receivingClient: {
        agentClientId: "c1",
        displayName: "Client one",
        version: 1,
        linkedAt: new Date().toISOString(),
        linkedByUserId: "u1",
      },
      receivingLinkRevision: 1,
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onLinked).not.toHaveBeenCalled();
  });
});
