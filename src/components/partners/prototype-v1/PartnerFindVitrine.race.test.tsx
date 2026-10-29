/** @vitest-environment jsdom */
/**
 * Independent race regression: local only, no production requests.
 * Abort alone is insufficient — sequence must gate replace AND append.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerFindVitrine } from "./PartnerFindVitrine";
import type { PartnerSearchResult } from "@/lib/types";

const remcardFetch = vi.fn();

vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class extends Error {
    status = 400;
  },
  remcardFetch: (...args: unknown[]) => remcardFetch(...args),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [],
    services: [],
    stages: [],
  }),
}));

function partner(id: string): PartnerSearchResult {
  return {
    id,
    displayName: `Partner ${id}`,
    city: "Краснодар",
    photoUrl: null,
    description: null,
    specializations: [],
    badges: [],
    storeCategories: [],
    partnerType: "STORE",
    branches: [],
    rating: null,
    ratingCount: 0,
    partnershipStatus: null,
  };
}

describe("PartnerFindVitrine search race", () => {
  beforeEach(() => {
    remcardFetch.mockReset();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps newer q cards/cursor when older q resolves later (replace)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const deferred: Array<{
      q: string;
      resolve: (value: unknown) => void;
    }> = [];

    remcardFetch.mockImplementation(async (path: string) => {
      if (!String(path).includes("/api/partnership/search")) {
        return { products: [], services: [], stages: [] };
      }
      const url = new URL(String(path), "https://local.test");
      const q = url.searchParams.get("q") || "";
      return await new Promise((resolve) => {
        deferred.push({ q, resolve });
      });
    });

    render(
      <PartnerFindVitrine
        searchRole="pro"
        partnerType=""
        onPartnerTypeChange={() => undefined}
        onInvite={() => undefined}
      />,
    );

    // Initial empty search (debounce).
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await waitFor(() => expect(deferred.length).toBeGreaterThanOrEqual(1));
    // Resolve initial so UI settles.
    const initial = deferred.shift()!;
    initial.resolve({ partners: [], nextCursor: null });

    const input = await screen.findByTestId("vitrine-query");
    await user.type(input, "old");
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await waitFor(() => expect(deferred.some((d) => d.q === "old")).toBe(true));

    await user.type(input, "new");
    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    await waitFor(() => expect(deferred.some((d) => d.q === "oldnew")).toBe(true));

    const newer = deferred.find((d) => d.q === "oldnew");
    const older = deferred.find((d) => d.q === "old");
    expect(newer).toBeTruthy();
    expect(older).toBeTruthy();

    // Newer q wins first.
    await act(async () => {
      newer!.resolve({
        partners: [partner("new")],
        nextCursor: "cursor-new",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Partner new")).toBeInTheDocument();
      expect(screen.getByTestId("vitrine-page-count").textContent).toMatch(/есть ещё/);
    });

    // Older q resolves later — must not restore stale cards/cursor.
    await act(async () => {
      older!.resolve({
        partners: [partner("old")],
        nextCursor: "cursor-old-stale",
      });
    });
    await waitFor(() => {
      expect(screen.getByText("Partner new")).toBeInTheDocument();
      expect(screen.queryByText("Partner old")).not.toBeInTheDocument();
      expect(screen.getByTestId("vitrine-page-count").textContent).toMatch(/есть ещё/);
    });
  });
});
