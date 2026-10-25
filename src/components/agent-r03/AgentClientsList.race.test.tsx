import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RemcardApiError } from "@/lib/api-client";
import type { AgentClientRow } from "@/lib/agent-r03/types";
import { AgentClientsList } from "./AgentClientsList";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/agent-r03/viewModeStorage", () => ({
  readAgentR03ViewMode: () => "list" as const,
  writeAgentR03ViewMode: vi.fn(),
}));

const fetchAgentClients = vi.fn();
vi.mock("@/lib/agent-r03/api", () => ({
  fetchAgentClients: (...args: unknown[]) => fetchAgentClients(...args),
  createAgentClient: vi.fn(),
  patchAgentClient: vi.fn(),
  batchAgentClients: vi.fn(),
  deleteAgentClient: vi.fn(),
}));

function clientRow(id: string, displayName: string): AgentClientRow {
  const now = new Date().toISOString();
  return {
    id,
    displayName,
    phone: null,
    email: null,
    city: null,
    need: null,
    note: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    certificateCount: 0,
  };
}

const emptyMeta = {
  page: 1,
  pageSize: 25,
  totalCount: 0,
  totalPages: 1,
  activeCount: 0,
  archivedCount: 0,
  hasNextPage: false,
  hasPrevPage: false,
  sort: "updated_desc" as const,
};

function listResponse(clients: AgentClientRow[]) {
  return {
    ...emptyMeta,
    clients,
    totalCount: clients.length,
    activeCount: clients.length,
  };
}

describe("AgentClientsList load race (mounted)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchAgentClients.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps newer search rows when an older fetch resolves later", async () => {
    let resolveAlpha: (v: unknown) => void = () => undefined;
    const alphaPromise = new Promise((resolve) => {
      resolveAlpha = resolve;
    });
    let resolveGamma: (v: unknown) => void = () => undefined;
    const gammaPromise = new Promise((resolve) => {
      resolveGamma = resolve;
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    fetchAgentClients.mockImplementation((params?: { q?: string }) => {
      if (params?.q === "beta-query") {
        return Promise.resolve(listResponse([clientRow("b", "Beta client")]));
      }
      if (params?.q === "alpha-query") return alphaPromise;
      if (params?.q === "gamma-query") return gammaPromise;
      return Promise.resolve(listResponse([]));
    });

    render(<AgentClientsList accessMode="business" />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const search = screen.getByPlaceholderText("Имя, контакт, город или задача");
    fireEvent.change(search, { target: { value: "alpha-query" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    fireEvent.change(search, { target: { value: "beta-query" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await waitFor(() =>
      expect(screen.getAllByText("Beta client").length).toBeGreaterThan(0),
    );

    const desktopRow = document.querySelector('[data-parity-client-id="b"]') as HTMLElement;
    expect(desktopRow).toBeTruthy();
    const checkbox = within(desktopRow).getByRole("checkbox");
    await user.click(checkbox);
    expect(screen.getByText("Выбрано: 1")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "gamma-query" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(screen.queryByText("Выбрано: 1")).not.toBeInTheDocument();

    await act(async () => {
      resolveAlpha(listResponse([clientRow("a", "Stale alpha client")]));
      await vi.runOnlyPendingTimersAsync();
    });
    void resolveGamma;

    await waitFor(() => expect(screen.queryByText("Stale alpha client")).not.toBeInTheDocument());
    expect(screen.getAllByText("Beta client").length).toBeGreaterThan(0);
  });

  it("ignores stale fetch error after a newer search succeeded", async () => {
    let rejectAlpha: (reason: unknown) => void = () => undefined;
    const alphaPromise = new Promise((_resolve, reject) => {
      rejectAlpha = reject;
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    fetchAgentClients.mockImplementation((params?: { q?: string }) => {
      if (params?.q === "beta-query") {
        return Promise.resolve(listResponse([clientRow("b", "Beta client")]));
      }
      if (params?.q === "alpha-query") return alphaPromise;
      return Promise.resolve(listResponse([]));
    });

    render(<AgentClientsList accessMode="business" />);
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    const search = screen.getByPlaceholderText("Имя, контакт, город или задача");
    fireEvent.change(search, { target: { value: "alpha-query" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    fireEvent.change(search, { target: { value: "beta-query" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    await waitFor(() =>
      expect(screen.getAllByText("Beta client").length).toBeGreaterThan(0),
    );

    await act(async () => {
      rejectAlpha(new RemcardApiError("Stale list error", 500));
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("Beta client").length).toBeGreaterThan(0);
  });
});
