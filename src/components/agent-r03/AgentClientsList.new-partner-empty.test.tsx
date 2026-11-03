import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentClientRow } from "@/lib/agent-r03/types";
import { AgentClientsList } from "./AgentClientsList";
import { OwnerClientsModeProvider } from "@/components/clients/OwnerClientsModeContext";
import { createAgentClient, fetchAgentClients } from "@/lib/agent-r03/api";

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

function clientRow(id: string): AgentClientRow {
  const now = new Date().toISOString();
  return {
    id,
    displayName: "Client",
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

const emptyList = {
  clients: [] as AgentClientRow[],
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

function renderList(
  accessMode: "agent" | "specialist" | "business",
  businessPartnerType?: "STORE" | "COMPANY",
) {
  return render(
    <OwnerClientsModeProvider mode={accessMode} businessPartnerType={businessPartnerType}>
      <AgentClientsList accessMode={accessMode} />
    </OwnerClientsModeProvider>,
  );
}

describe.each([
  ["agent", undefined] as const,
  ["specialist", undefined] as const,
  ["business", "STORE"] as const,
  ["business", "COMPANY"] as const,
])("AgentClientsList new-partner empty (%s)", (accessMode, partnerType) => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAgentClients).mockResolvedValue(emptyList);
  });

  it("shows onboarding on true zero with page add + hero secondary", async () => {
    renderList(accessMode, partnerType);
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.getByTestId("clients-page-add")).toBeVisible();
    expect(screen.getByTestId("es-client-add")).toBeVisible();
    expect(screen.queryByTestId("es-show-demo")).not.toBeInTheDocument();
  });

  it("does not show onboarding for filtered-empty search", async () => {
    vi.mocked(fetchAgentClients).mockImplementation(async (params) => {
      if (params?.q) {
        return { ...emptyList, totalCount: 0, activeCount: 3 };
      }
      return { ...emptyList, activeCount: 3, totalCount: 3, clients: [clientRow("x")] };
    });
    const user = userEvent.setup();
    renderList(accessMode, partnerType);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    await user.type(screen.getByPlaceholderText("Имя, контакт, город или задача"), "no-match");
    await waitFor(() => expect(fetchAgentClients).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.getByText("Добавьте первого клиента.")).toBeInTheDocument();
  });
});

describe("AgentClientsList new-partner empty flows", () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.mocked(fetchAgentClients).mockResolvedValue(emptyList);
  });

  it("unknown counts: legacy empty, no onboarding", async () => {
    vi.mocked(fetchAgentClients).mockResolvedValue({
      ...emptyList,
      activeCount: undefined,
      archivedCount: undefined,
    } as unknown as typeof emptyList);
    renderList("agent");
    await waitFor(() => expect(screen.getByText("Добавьте первого клиента.")).toBeVisible());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("archive tab empty with known active clients: archive copy only", async () => {
    vi.mocked(fetchAgentClients).mockImplementation(async (params) => {
      if (params?.archived) {
        return { ...emptyList, clients: [], activeCount: 2, archivedCount: 0 };
      }
      return { ...emptyList, clients: [clientRow("a")], activeCount: 2, archivedCount: 0, totalCount: 1 };
    });
    const user = userEvent.setup();
    renderList("agent");
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    await user.selectOptions(screen.getByTestId("agent-r03-show-filter"), "archived");
    await waitFor(() => expect(screen.getByText("Архив пуст.")).toBeVisible());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("page>1 empty page does not show onboarding", async () => {
    vi.mocked(fetchAgentClients).mockImplementation(async (params) => {
      if (params?.page === 2) {
        return { ...emptyList, page: 2, clients: [], hasPrevPage: true };
      }
      return {
        ...emptyList,
        clients: [clientRow("only")],
        totalCount: 26,
        activeCount: 26,
        totalPages: 2,
        hasNextPage: true,
      };
    });
    const user = userEvent.setup();
    renderList("agent");
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    await user.click(screen.getByRole("button", { name: "Далее" }));
    await waitFor(() => expect(fetchAgentClients).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("AGENT: CTAs — cert link, dialog on add, keyboard, no POST", async () => {
    const user = userEvent.setup();
    renderList("agent");
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.getByTestId("es-action-recommend")).toHaveAttribute(
      "href",
      "/certificates/new",
    );
    screen.getByTestId("es-client-add").focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(createAgentClient).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Отмена" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByTestId("clients-page-add"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(createAgentClient).not.toHaveBeenCalled();
  });

  it("STORE: scan primary + secondary add opens dialog", async () => {
    const user = userEvent.setup();
    renderList("business", "STORE");
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
    expect(screen.getByTestId("es-action-scan")).toHaveAttribute("href", "/scanner");
    await user.click(screen.getByTestId("es-client-add"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(createAgentClient).not.toHaveBeenCalled();
  });

  it("loading keeps legacy shell without onboarding", async () => {
    let resolve!: (v: typeof emptyList) => void;
    vi.mocked(fetchAgentClients).mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    renderList("agent");
    expect(screen.getByText("Загрузка…")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    resolve(emptyList);
    await waitFor(() => expect(screen.getByTestId("empty-state")).toBeVisible());
  });

  it("error keeps legacy shell without onboarding", async () => {
    vi.mocked(fetchAgentClients).mockRejectedValue(new Error("network"));
    renderList("agent");
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("non-empty list preserves table UI", async () => {
    vi.mocked(fetchAgentClients).mockResolvedValue({
      ...emptyList,
      clients: [clientRow("c1")],
      totalCount: 1,
      activeCount: 1,
    });
    renderList("specialist");
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(within(screen.getByRole("table")).getByText("Client")).toBeInTheDocument();
  });
});
