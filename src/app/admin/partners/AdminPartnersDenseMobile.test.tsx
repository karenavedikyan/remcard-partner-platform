/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PARTNERS_MOBILE_DENSE_MQ } from "./adminPartnersViewMode";

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("registration=active"),
}));

import { AdminPartnersClient } from "./AdminPartnersClient";

const rowA = {
  id: "a",
  publicId: "RC-A",
  displayName: "Короткое имя A",
  partnerType: "AGENT",
  partnerKind: "agent",
  city: "Москва",
  registrationLabel: "LIVE",
  lifecycle: null,
  catalogVisibility: "VISIBLE",
  publicCatalogLinks: [],
  organizations: [],
};

const rowB = {
  id: "b",
  publicId: "RC-B",
  displayName: "Длинное имя партнёра B для проверки переноса на две строки в плотном списке",
  partnerType: "COMPANY",
  partnerKind: "company",
  city: "Краснодар",
  registrationLabel: "DEMO",
  lifecycle: null,
  catalogVisibility: "HIDDEN",
  publicCatalogLinks: [],
  organizations: [],
};

function mockMobileDense() {
  const listeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>();
  const mql: MediaQueryList = {
    media: PARTNERS_MOBILE_DENSE_MQ,
    matches: true,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (type, fn) => {
      if (type !== "change") return;
      const set = listeners.get(type) ?? new Set();
      set.add(fn as (e: MediaQueryListEvent) => void);
      listeners.set(type, set);
    },
    removeEventListener: (type, fn) => {
      listeners.get(type)?.delete(fn as (e: MediaQueryListEvent) => void);
    },
    dispatchEvent: () => true,
  };
  vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    if (query === PARTNERS_MOBILE_DENSE_MQ) return mql;
    return {
      media: query,
      matches: false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    } as MediaQueryList;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  window.localStorage.setItem("prof-admin-partners-registry-view", "cards");
  api.fetchPartnerRegistry.mockResolvedValue({
    items: [rowA, rowB],
    total: 2,
    nextCursor: null,
    facets: null,
  });
  api.previewPartnerLifecycle.mockResolvedValue({
    preview: { effects: [], warnings: [], confirmToken: "t" },
  });
});

describe("Admin partners mobile dense registry", () => {
  it("uses dense list on mobile even when cards mode is stored", async () => {
    mockMobileDense();
    render(<AdminPartnersClient />);
    await screen.findByText("Короткое имя A");
    expect(screen.getByRole("list", { name: "Реестр партнёров" })).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Реестр партнёров" })).toBeNull();
  });

  it("checkbox does not expand row details", async () => {
    mockMobileDense();
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Короткое имя A");
    await ui.click(screen.getByRole("checkbox", { name: /Выбрать Короткое имя A/ }));
    expect(screen.queryByRole("region", { name: /Управление партнёром/i })).toBeNull();
  });

  it("expands one row at a time from the row button", async () => {
    mockMobileDense();
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Короткое имя A");
    const expandA = screen.getByRole("button", { name: /Короткое имя A/i });
    await ui.click(expandA);
    await waitFor(() =>
      expect(screen.getByRole("region", { name: /Управление партнёром Короткое имя A/i })).toBeTruthy(),
    );
    const expandB = screen.getByRole("button", { name: /Длинное имя партнёра B/i });
    await ui.click(expandB);
    await waitFor(() =>
      expect(screen.queryByRole("region", { name: /Управление партнёром Короткое имя A/i })).toBeNull(),
    );
  });

  it("honors registration=active from URL on first fetch", async () => {
    mockMobileDense();
    render(<AdminPartnersClient />);
    await waitFor(() => expect(api.fetchPartnerRegistry).toHaveBeenCalled());
    expect(api.fetchPartnerRegistry.mock.calls[0][0].get("registration")).toBe("active");
  });

  it("shows filter toggle with active count on mobile", async () => {
    mockMobileDense();
    render(<AdminPartnersClient />);
    await screen.findByText("Короткое имя A");
    expect(screen.getByRole("button", { name: "Фильтры (1)" })).toBeTruthy();
  });

  it("reset clears optional filters but keeps search", async () => {
    mockMobileDense();
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Короткое имя A");
    await ui.type(screen.getByLabelText("Поиск партнёров"), "demo");
    fireEvent.click(screen.getByRole("button", { name: "Сбросить" }));
    await waitFor(() => {
      const reg = api.fetchPartnerRegistry.mock.calls.at(-1)?.[0].get("registration");
      expect(reg === "" || reg == null).toBe(true);
    });
    expect(screen.getByLabelText("Поиск партнёров")).toHaveValue("demo");
  });
});
