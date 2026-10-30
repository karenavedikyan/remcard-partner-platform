/** @vitest-environment jsdom */
/**
 * A3a: presentation-only registry header + filter panel.
 * Behavior/hooks/MetricsBar.tsx and post-filters list workflows stay frozen at 05027b0.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";

const ROOT = path.join(__dirname);
const CLIENT = path.join(ROOT, "AdminPartnersClient.tsx");
const METRICS = path.join(ROOT, "AdminPartnersMetricsBar.tsx");
const CSS = path.join(ROOT, "AdminPartners.module.css");

/** Baseline 05027b0 freeze pins (lines 1–403 and from selectionLimitHit JSX). */
const PRE_SHA =
  "af9f5ba522aac2fac15388e4ec9eb3e9ec8312a8ebd4d7bc22a3407de66eb2a6";
const POST_SHA =
  "d7b7bdb57c266dba72efe5712707587e537d61262dd910381c6af10d451d539c";
const METRICS_SHA =
  "f999d067cbd3b1cbf51b889e13608ea5517efaf70829a2b5a208da29478862ae";

function sha256(text: string | Buffer) {
  return createHash("sha256").update(text).digest("hex");
}

function clientRegions() {
  const lines = readFileSync(CLIENT, "utf8").split(/(?<=\n)/);
  const pre = lines.slice(0, 403).join("");
  const postIdx = lines.findIndex((l) => l.includes("{selectionLimitHit ? ("));
  const post = lines.slice(postIdx).join("");
  const mid = lines.slice(403, postIdx).join("");
  return { pre, mid, post, lines, postIdx };
}

const facets = {
  matchedTotal: 12,
  partnerKind: {
    all: 12,
    agent: 3,
    specialist: 4,
    store: 2,
    company: 2,
    unknown: 1,
    facetRule: "ignores_partner_type",
  },
  registration: { active: 8, demo: 4, facetRule: "with_other_filters" },
  catalog: { visible: 5, hidden: 3, notPublic: 4, facetRule: "with_other_filters" },
  archive: { archived: 2, notArchived: 10, facetRule: "with_other_filters" },
};

function registryPayload(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        id: "p1",
        displayName: "Тест Партнёр",
        partnerType: "AGENT",
        registrationLabel: "ACTIVE",
        catalogVisibility: "VISIBLE",
        city: "Краснодар",
        lifecycle: null,
        partnershipCounts: { active: 0, invited: 0, pending: 0, paused: 0, ended: 0, total: 0 },
      },
    ],
    total: 12,
    nextCursor: null,
    facets,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  nav.params = new URLSearchParams();
  window.localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
  api.fetchPartnerRegistry.mockResolvedValue(registryPayload());
});

describe("A3a source freeze (05027b0 whitelist)", () => {
  it("keeps Client hooks/load region (lines 1–403) and post-filters region byte-identical", () => {
    const { pre, post } = clientRegions();
    expect(sha256(pre)).toBe(PRE_SHA);
    expect(sha256(post)).toBe(POST_SHA);
  });

  it("keeps AdminPartnersMetricsBar.tsx byte-identical (appearance via CSS only)", () => {
    expect(sha256(readFileSync(METRICS))).toBe(METRICS_SHA);
  });

  it("limits Client mid-region edits to presentation wrappers (header/filters classNames)", () => {
    const { mid } = clientRegions();
    expect(mid).toContain("registryPageHead");
    expect(mid).toContain("registryPageHeadMeta");
    expect(mid).toContain('aria-label="Поиск и фильтры реестра"');
    expect(mid).toContain("<AdminPartnersMetricsBar");
    // Behavior surface unchanged
    expect(mid).toContain("Партнёры (реестр)");
    expect(mid).toContain("resetOptionalFilters");
    expect(mid).toContain("filtersPanelOpen");
    expect(mid).toContain("activeFilterCount");
    expect(mid).toContain("guardFilterChange");
    expect(mid).not.toMatch(/router\.push/);
    expect(mid).not.toMatch(/sort|manager|curator|export/i);
  });

  it("scopes filter control styles under .filters and does not rewrite shared .field/.heading contract", () => {
    const src = readFileSync(CSS, "utf8");
    expect(src).toMatch(/\.registryPageHead\s*\{/);
    expect(src).toMatch(/--registry-proto-text-xl:\s*clamp\(1\.5rem,\s*1\.3rem \+ 0\.45vw,\s*1\.875rem\)/);
    expect(src).toMatch(/\.registryPageHead h1[\s\S]*?font-size:\s*var\(--registry-proto-text-xl\)/);
    expect(src).toMatch(/\.filters \.field\s*\{/);
    expect(src).toMatch(/\.filters \.field input,\s*\.filters \.field select\s*\{/);
    // Shared baselines remain for nested Bulk/Single/Partnerships
    expect(src).toMatch(/\/\* Shared by partnerships child route/);
    expect(src).toMatch(/\.heading \{ display: flex;/);
    expect(src).toMatch(/\/\* Shared \.field baseline for Bulk\/Single\/Partnerships/);
    expect(src).toMatch(/\.field \{ display: grid; align-content: start; gap: 6px;/);
    // Do not shrink chips below 14px
    expect(src).not.toMatch(/\.metricChipSmall \{ font-size: 0\.8125rem/);
    expect(src).toMatch(/\.metricChipSmall \{ font-size: var\(--text-sm\)/);
    // No PROF global --text-xl override in this module
    expect(src).not.toMatch(/--text-xl\s*:/);
    // Table / dense list / bulk / pagination selectors are not the A3a vehicle —
    // assert key list markers still present (untouched contract)
    expect(src).toMatch(/\.tableCompact \{/);
    expect(src).toMatch(/\.denseList \{/);
    expect(src).toMatch(/\.bulkCompactBar \{/);
    expect(src).toMatch(/\.pagination \{/);
  });
});

describe("A3a header + filters presentation (behavior preserved)", () => {
  it("renders H1, desktop summary, metrics chips, and filter panel hierarchy", async () => {
    render(<AdminPartnersClient />);
    const h1 = await screen.findByRole("heading", { name: "Партнёры (реестр)", level: 1 });
    expect(h1.closest("header")).toBeTruthy();
    expect(screen.getByText(/В выборке: 12 · на странице: 1 · показаны 1–1/)).toBeTruthy();

    const metrics = screen.getByRole("group", { name: "Счётчики по типу партнёра" });
    expect(within(metrics).getByRole("button", { name: /Всего/ })).toHaveAttribute("aria-pressed", "true");
    expect(within(metrics).getByText("12")).toBeTruthy();
    expect(within(metrics).getByText("Неизвестный тип:")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Дополнительные показатели" })).toBeTruthy();

    const panel = screen.getByRole("region", { name: "Поиск и фильтры реестра" });
    expect(within(panel).getByLabelText("Поиск партнёров")).toBeTruthy();
    expect(within(panel).getByLabelText("Регистрация")).toBeTruthy();
    expect(within(panel).getByLabelText("Тип партнёра")).toBeTruthy();
    expect(within(panel).getByLabelText("Город")).toBeTruthy();
    expect(within(panel).getByLabelText("Видимость в каталоге")).toBeTruthy();
    expect(within(panel).getByLabelText("Архив")).toBeTruthy();
    expect(within(panel).getByLabelText("Записей на странице")).toBeTruthy();
    expect(screen.getByRole("group", { name: "Вид реестра" })).toBeTruthy();
  });

  it("keeps search debounce/load, optional filter reset (not q/pageLimit), and facet chip presses", async () => {
    const user = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByRole("heading", { name: "Партнёры (реестр)", level: 1 });
    await waitFor(() => expect(api.fetchPartnerRegistry).toHaveBeenCalled());
    api.fetchPartnerRegistry.mockClear();

    fireEvent.change(screen.getByLabelText("Поиск партнёров"), { target: { value: "красно" } });
    await waitFor(() => expect(api.fetchPartnerRegistry).toHaveBeenCalled(), { timeout: 1500 });
    const qCall = api.fetchPartnerRegistry.mock.calls.at(-1)?.[0] as URLSearchParams;
    expect(qCall.get("q")).toBe("красно");

    fireEvent.change(screen.getByLabelText("Город"), { target: { value: "Сочи" } });
    fireEvent.change(screen.getByLabelText("Архив"), { target: { value: "true" } });
    await waitFor(() => {
      const p = api.fetchPartnerRegistry.mock.calls.at(-1)?.[0] as URLSearchParams;
      expect(p.get("city")).toBe("Сочи");
      expect(p.get("projectArchived")).toBe("true");
    });

    expect(screen.getByRole("button", { name: /Сбросить/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^Сбросить$/ }));
    await waitFor(() => {
      expect(screen.getByLabelText("Город")).toHaveValue("");
      expect(screen.getByLabelText("Архив")).toHaveValue("");
      // q and pageLimit are not part of optional reset
      expect(screen.getByLabelText("Поиск партнёров")).toHaveValue("красно");
    });

    await user.click(screen.getByRole("button", { name: /Агенты/ }));
    await waitFor(() => {
      const p = api.fetchPartnerRegistry.mock.calls.at(-1)?.[0] as URLSearchParams;
      expect(p.get("partnerType")).toBe("AGENT");
    });
    expect(screen.getByRole("button", { name: /Агенты/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("prefills registration/type from URL without adding router.push", async () => {
    nav.params = new URLSearchParams("registration=demo&partnerType=STORE");
    render(<AdminPartnersClient />);
    await waitFor(() => expect(screen.getByLabelText("Регистрация")).toHaveValue("demo"));
    expect(screen.getByLabelText("Тип партнёра")).toHaveValue("STORE");
    const src = readFileSync(CLIENT, "utf8");
    expect(src).not.toMatch(/router\.push/);
  });

  it("renders facets null as em dash and preserves select option labels/order", async () => {
    api.fetchPartnerRegistry.mockResolvedValue(registryPayload({ facets: null, total: 0, items: [] }));
    render(<AdminPartnersClient />);
    await screen.findByRole("heading", { name: "Партнёры (реестр)", level: 1 });
    const metrics = screen.getByRole("group", { name: "Счётчики по типу партнёра" });
    expect(within(metrics).getAllByText("—").length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByRole("group", { name: "Дополнительные показатели" })).toBeNull();

    const type = screen.getByLabelText("Тип партнёра") as HTMLSelectElement;
    expect([...type.options].map((o) => o.value)).toEqual(["", "AGENT", "MASTER", "STORE", "COMPANY"]);
    expect([...type.options].map((o) => o.textContent)).toEqual([
      "Все типы партнёров",
      "Агент",
      "Специалист",
      "Магазин",
      "Компания",
    ]);
    const catalog = screen.getByLabelText("Видимость в каталоге") as HTMLSelectElement;
    expect([...catalog.options].map((o) => o.value)).toEqual(["", "visible", "hidden", "not_public"]);
    const pageLimit = screen.getByLabelText("Записей на странице") as HTMLSelectElement;
    expect([...pageLimit.options].map((o) => o.value)).toEqual(["25", "50", "100"]);
  });
});
