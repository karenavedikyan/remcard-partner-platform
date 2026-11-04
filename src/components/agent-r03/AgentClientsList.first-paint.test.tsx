import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentClientsList } from "./AgentClientsList";
import { OwnerClientsModeProvider } from "@/components/clients/OwnerClientsModeContext";
import { fetchAgentClients } from "@/lib/agent-r03/api";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/agent-r03/viewModeStorage", () => ({
  readAgentR03ViewMode: () => "list" as const,
  writeAgentR03ViewMode: vi.fn(),
}));

vi.mock("@/lib/agent-r03/api", () => ({
  fetchAgentClients: vi.fn(),
  createAgentClient: vi.fn(),
  patchAgentClient: vi.fn(),
  batchAgentClients: vi.fn(),
  deleteAgentClient: vi.fn(),
}));

const emptyList = {
  clients: [],
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

describe("AgentClientsList first paint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows pending shell with no legacy chrome or welcome until fetch resolves empty", async () => {
    let resolveFetch!: (value: typeof emptyList) => void;
    vi.mocked(fetchAgentClients).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <OwnerClientsModeProvider mode="agent">
        <AgentClientsList accessMode="agent" />
      </OwnerClientsModeProvider>,
    );

    expect(screen.getByTestId("clients-welcome-decision-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("clients-page-add")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-r03-collection-toolbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();

    resolveFetch(emptyList);
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.queryByTestId("clients-welcome-decision-pending")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clients-page-add")).not.toBeInTheDocument();
  });

  it("resolves to ordinary list chrome when data is populated", async () => {
    let resolveFetch!: (value: typeof emptyList & { clients: { id: string }[] }) => void;
    vi.mocked(fetchAgentClients).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    render(
      <OwnerClientsModeProvider mode="agent">
        <AgentClientsList accessMode="agent" />
      </OwnerClientsModeProvider>,
    );

    expect(screen.getByTestId("clients-welcome-decision-pending")).toBeInTheDocument();

    resolveFetch({
      ...emptyList,
      activeCount: 1,
      totalCount: 1,
      clients: [
        {
          id: "c1",
          displayName: "Client",
          phone: null,
          email: null,
          city: null,
          need: null,
          note: null,
          archivedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          certificateCount: 0,
        },
      ],
    });

    await waitFor(() => expect(screen.getByTestId("clients-page-add")).toBeInTheDocument());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows error and retry without welcome when fetch rejects", async () => {
    vi.mocked(fetchAgentClients).mockRejectedValue(new Error("network"));

    render(
      <OwnerClientsModeProvider mode="agent">
        <AgentClientsList accessMode="agent" />
      </OwnerClientsModeProvider>,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByTestId("clients-welcome-decision-pending")).not.toBeInTheDocument();
  });
});
