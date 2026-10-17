import { act } from "react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { AgentReceivablesHub } from "./AgentReceivablesHub";
import { RECEIVABLES_PREFS_KEY } from "@/lib/agent-r05/receivables-prefs";

vi.mock("@/lib/agent-r05/api", () => ({
  downloadAgentReceivablesExport: vi.fn(),
  fetchAgentReceivableOrderDetail: vi.fn(),
  fetchAgentReceivableOrders: vi.fn(),
  fetchAgentReceivablePartners: vi.fn(),
  fetchAgentReceivablesOverview: vi.fn().mockResolvedValue({
    contractVersion: "test",
    confirmedTotalKopecks: 10000,
    openCount: 1,
    pendingCount: 0,
    coverage: { note: "", needsReviewCount: 0, excludedFromConfirmedTotal: 0 },
  }),
}));

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

async function hydrateWithStoredPrefs(stored: { view: string; pageSize: number }) {
  const expectedView =
    stored.view === "list" ||
    stored.view === "small" ||
    stored.view === "medium" ||
    stored.view === "large"
      ? stored.view
      : "list";
  localStorage.clear();
  const container = document.createElement("div");
  container.innerHTML = renderToString(<AgentReceivablesHub />);
  document.body.append(container);
  localStorage.setItem(RECEIVABLES_PREFS_KEY, JSON.stringify(stored));
  let root: ReturnType<typeof hydrateRoot> | undefined;
  await act(async () => {
    root = hydrateRoot(container, <AgentReceivablesHub />);
  });
  await waitFor(() => {
    const effective = container.querySelector("[data-ledger-view]")?.getAttribute("data-ledger-view");
    expect(effective).toBe(expectedView);
  });
  const selected = (container.querySelector("[data-testid=ledger-view]") as HTMLSelectElement).value;
  const effective = container.querySelector("[data-ledger-view]")?.getAttribute("data-ledger-view");
  await act(async () => root?.unmount());
  container.remove();
  return { selected, effective };
}

describe("AgentReceivablesHub hydration prefs", () => {
  it("SSR markup uses list then restores stored large after mount", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<AgentReceivablesHub />);
    expect(container.querySelector("[data-ledger-view]")?.getAttribute("data-ledger-view")).toBe(
      "list",
    );
    document.body.append(container);
    localStorage.setItem(RECEIVABLES_PREFS_KEY, JSON.stringify({ view: "large", pageSize: 25 }));
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <AgentReceivablesHub />);
    });
    await waitFor(() => {
      expect(container.querySelector("[data-ledger-view]")?.getAttribute("data-ledger-view")).toBe(
        "large",
      );
    });
    const selected = (container.querySelector("[data-testid=ledger-view]") as HTMLSelectElement)
      .value;
    expect(selected).toBe("large");
    await act(async () => root?.unmount());
    container.remove();
  });

  it.each([
    { view: "list", pageSize: 25 },
    { view: "small", pageSize: 50 },
    { view: "medium", pageSize: 100 },
    { view: "large", pageSize: 25 },
  ])("restores stored $view / pageSize $pageSize consistently", async (stored) => {
    const { selected, effective } = await hydrateWithStoredPrefs(stored);
    expect(selected).toBe(stored.view);
    expect(effective).toBe(stored.view);
  });

  it("falls back to list for unknown stored view", async () => {
    const { selected, effective } = await hydrateWithStoredPrefs({ view: "unknown", pageSize: 25 });
    expect(selected).toBe("list");
    expect(effective).toBe("list");
  });

  it("falls back pageSize when corrupt storage", async () => {
    localStorage.clear();
    localStorage.setItem(RECEIVABLES_PREFS_KEY, "{");
    const container = document.createElement("div");
    container.innerHTML = renderToString(<AgentReceivablesHub />);
    document.body.append(container);
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, <AgentReceivablesHub />);
    });
    await waitFor(() => {
      expect(
        container.querySelector("[data-ledger-view]")?.getAttribute("data-ledger-view"),
      ).toBe("list");
    });
    await act(async () => root?.unmount());
    container.remove();
  });
});
