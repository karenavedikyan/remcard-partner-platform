import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AgentR03Gate } from "@/components/agent-r03/AgentR03Gate";

const fetchAgentR03Status = vi.hoisted(() => vi.fn());

vi.mock("@/lib/agent-r03/api", () => ({
  fetchAgentR03Status,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AgentR03Gate stale route protection", () => {
  it("does not apply eligibility after unmount when the fetch resolves late", async () => {
    let resolve!: (value: unknown) => void;
    fetchAgentR03Status.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );

    const { unmount } = render(
      <AgentR03Gate>
        <div data-testid="allowed-body">allowed</div>
      </AgentR03Gate>,
    );

    expect(screen.getByTestId("cabinet-gate-loading-body")).toBeInTheDocument();
    unmount();

    resolve({ featureEnabled: true, eligible: true });
    await waitFor(() => expect(fetchAgentR03Status).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("allowed-body")).toBeNull();
  });
});
