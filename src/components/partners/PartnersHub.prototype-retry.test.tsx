import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import type { ProProfileResponse } from "@/lib/types";

const api = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api-client", () => ({ remcardFetch: api, RemcardApiError: class extends Error {} }));
vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: async () => ({ products: [{ kind: "product", id: "doors", label: "Двери" }],
    services: [], stages: [{ kind: "stage", id: "L1-10", label: "Чистовая отделка" }] }),
}));
const profile = {
  user: { id: "owned-me", displayName: "Проверка", partnerType: "STORE", partnerActivities: ["STORE"],
    storeCategories: ["doors"], specializations: [], badges: [], areas: [] },
  organization: null, programs: [],
} as unknown as ProProfileResponse;
const partner = (id: string) => ({
  id, displayName: `Партнёр ${id}`, city: "Сочи", partnerType: "STORE",
  partnerActivities: ["STORE"], specializations: [], storeCategories: ["doors"],
  branches: [], badges: [], partnershipStatus: null, workingProductLabels: ["Двери"],
});
const facets = (total: number) => ({
  total, baseTotal: total, stageTotal: total, products: { doors: total }, services: {}, stages: { "L1-10": total },
});
function mount() {
  return render(<PartnersHub meId="owned-me" initialProfile={profile} variant="agent-r04"
    agentModalSurface="find" forcedTab="find" partnersAudience="business-store-r04" />);
}
beforeEach(() => { api.mockReset(); });

describe("prototype showcase retry boundaries", () => {
  it("retries the failed next cursor without dropping or duplicating loaded cards", async () => {
    let appendAttempts = 0;
    api.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/partnership/search")) {
        if (new URL(path, "http://owned.invalid").searchParams.has("cursor")) {
          if (++appendAttempts === 1) throw new Error("Owned append failure");
          return { partners: [partner("1"), partner("2")], nextCursor: null, facets: facets(2) };
        }
        return { partners: [partner("1")], nextCursor: "owned-next", facets: facets(2) };
      }
      if (path === "/api/pro/profile") return profile;
      return { partnerships: [], invites: [], items: [] };
    });
    mount();
    expect(await screen.findByText("Партнёр 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Показать ещё" }));
    expect(await screen.findByTestId("agent-partner-search-error")).toHaveTextContent("Не удалось выполнить поиск");
    expect(screen.getAllByText("Партнёр 1")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByText("Партнёр 2")).toBeInTheDocument();
    expect(screen.getAllByText("Партнёр 1")).toHaveLength(1);
    expect(screen.queryByTestId("agent-partner-search-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-partner-search-count")).toHaveTextContent(/2 партнёра · 2 открыты к сотрудничеству/);
    const queries = api.mock.calls.map(([p]) => String(p)).filter(p => p.startsWith("/api/partnership/search"));
    expect(queries).toHaveLength(3);
    expect(queries[2]).toBe(queries[1]);
    expect(new URL(queries[2], "http://owned.invalid").searchParams.get("cursor")).toBe("owned-next");
  });

  it("reports actual zero aggregates after initial failure and retries current filters", async () => {
    let requests = 0;
    api.mockImplementation(async (path: string) => {
      if (path.startsWith("/api/partnership/search")) {
        if (++requests === 1) throw new Error("Owned reset failure");
        return { partners: [], nextCursor: null, facets: facets(0) };
      }
      if (path === "/api/pro/profile") return profile;
      return { partnerships: [], invites: [], items: [] };
    });
    mount();
    await screen.findByTestId("agent-partner-search-error");
    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));
    await waitFor(() => expect(screen.getByTestId("agent-partner-search-count")).toHaveTextContent("0 партнёров"));
    expect(screen.queryByTestId("agent-partner-search-error")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-partner-search-empty")).toBeInTheDocument();
  });
});
