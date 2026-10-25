import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AgentClientDetail } from "./AgentClientDetail";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const fetchAgentClient = vi.fn();
vi.mock("@/lib/agent-r03/api", () => ({
  fetchAgentClient: (...args: unknown[]) => fetchAgentClient(...args),
  patchAgentClient: vi.fn(),
  deleteAgentClient: vi.fn(),
}));

describe("AgentClientDetail race guards", () => {
  beforeEach(() => {
    fetchAgentClient.mockReset();
  });

  it("ignores stale detail response after clientId change", async () => {
    let resolveA: (v: unknown) => void = () => undefined;
    let resolveB: (v: unknown) => void = () => undefined;
    const promiseA = new Promise((r) => {
      resolveA = r;
    });
    const promiseB = new Promise((r) => {
      resolveB = r;
    });

    fetchAgentClient.mockImplementation((id: string) => {
      if (id === "client-a") return promiseA;
      return promiseB;
    });

    const { rerender } = render(
      <AgentClientDetail clientId="client-a" accessMode="business" />,
    );
    rerender(<AgentClientDetail clientId="client-b" accessMode="business" />);

    resolveB({
      client: { id: "client-b", displayName: "Client B", certificateCount: 0 },
      certificates: [],
      recommendationPurchases: [],
      receivingPurchases: [],
    });
    await waitFor(() => expect(screen.getByText("Client B")).toBeInTheDocument());

    resolveA({
      client: { id: "client-a", displayName: "Stale A", certificateCount: 0 },
      certificates: [],
      recommendationPurchases: [],
      receivingPurchases: [],
    });
    await waitFor(() => expect(screen.queryByText("Stale A")).not.toBeInTheDocument());
  });

  it("shows error then succeeds on retry via reload", async () => {
    fetchAgentClient
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        client: { id: "c1", displayName: "Recovered", certificateCount: 0 },
        certificates: [],
        recommendationPurchases: [],
        receivingPurchases: [],
      });

    render(<AgentClientDetail clientId="c1" accessMode="business" />);
    await waitFor(() => expect(screen.getByText(/Ошибка загрузки|network/i)).toBeInTheDocument());
  });
});
