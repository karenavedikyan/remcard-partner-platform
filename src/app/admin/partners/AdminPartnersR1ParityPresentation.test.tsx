/** @vitest-environment jsdom */
/**
 * R1 Partners visual parity — presentation contracts.
 * Safety/lifecycle behavior remains covered by existing mass-action / search / registry tests.
 * Replaces obsolete A3a/A3b layout-pin assertions that conflicted with owner R1 redesign.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

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
const CSS = path.join(ROOT, "AdminPartners.module.css");
const CLIENT = path.join(ROOT, "AdminPartnersClient.tsx");
const METRICS = path.join(ROOT, "AdminPartnersMetricsBar.tsx");
const LIST = path.join(ROOT, "AdminPartnersRegistryList.tsx");
const DETAIL = path.join(ROOT, "AdminPartnersPartnerDetailDialog.tsx");

const facets = {
  matchedTotal: 12,
  partnerKind: {
    all: 12,
    agent: 3,
    specialist: 4,
    store: 2,
    company: 2,
    unknown: 0,
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
        publicId: "P001",
        displayName: "Тест Партнёр",
        partnerType: "AGENT",
        partnerKind: "agent",
        city: "Краснодар",
        registrationLabel: "ACTIVE",
        lifecycle: null,
        catalogVisibility: "VISIBLE",
        partnerSearchVisibility: {
          visible: true,
          reasonCode: "OK",
          reasonLabel: "Доступен",
          adminOverride: "AUTO",
        },
        partnershipCounts: {
          active: 1,
          invited: 0,
          pending: 0,
          paused: 0,
          ended: 0,
          total: 1,
        },
        publicCatalogLinks: [],
      },
    ],
    total: 12,
    facets,
    nextCursor: null,
    ...overrides,
  };
}

describe("Admin Partners R1 parity presentation", () => {
  beforeEach(() => {
    nav.params = new URLSearchParams();
    localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    api.fetchPartnerRegistry.mockReset();
    api.previewPartnerLifecycle.mockReset();
    api.applyPartnerLifecycle.mockReset();
    api.fetchPartnerRegistry.mockResolvedValue(registryPayload());
  });

  it("keeps R1 structural markers in source (chips, panel toolbar, detail dialog, visit GAP)", () => {
    const css = readFileSync(CSS, "utf8");
    const client = readFileSync(CLIENT, "utf8");
    const metrics = readFileSync(METRICS, "utf8");
    const list = readFileSync(LIST, "utf8");
    const detail = readFileSync(DETAIL, "utf8");

    expect(metrics).toContain("Все типы");
    expect(metrics).toContain("typeCounter");
    expect(client).toContain("Регистрация и видимость");
    expect(client).toContain("Имя, компания, город, ID");
    expect(client).toContain("AdminPartnersPartnerDetailDialog");
    expect(list).toContain("Визит*");
    expect(list).toContain("Нет данных");
    expect(detail).toContain("Карточка партнёра");
    expect(detail).toContain("Удалить из проекта");
    expect(detail).toContain("archive_project");
    expect(css).toContain(".filterChip");
    expect(css).toContain(".bulkBar");
    expect(css).toContain(".partnerDetailDialog");
    expect(css).toContain(".partnersTable");
    // No fabricated RemScore / visit API fields
    expect(detail).toContain("RemScore"); // named only as GAP/LIMIT, not as computed metric
    expect(client).not.toMatch(/fetchAdminPartnerDetail|profileFill|lastVisit/);
  });

  it("does not touch partner LK runtime paths", () => {
    const client = readFileSync(CLIENT, "utf8");
    expect(client).not.toContain("src/components/partners");
    expect(client).not.toContain("@/components/partners");
  });

  it("renders R1 page head, type chips, search and opens partner dialog", async () => {
    render(<AdminPartnersClient />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Партнёры" })).toBeTruthy());
    expect(screen.getByText("Регистрация и видимость")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Все типы/ })).toBeTruthy();
    expect(screen.getByTestId("partner-search")).toBeTruthy();
    expect(screen.getByTestId("partner-result-count").textContent).toContain("12");

    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ }));
    await waitFor(() => expect(screen.getByRole("heading", { name: "Карточка партнёра" })).toBeTruthy());
    const dialog = screen.getByRole("heading", { name: "Карточка партнёра" }).closest("dialog");
    expect(dialog).toBeTruthy();
    expect(within(dialog as HTMLElement).getByText(/Краснодар/)).toBeTruthy();
    expect(within(dialog as HTMLElement).getAllByText("Нет данных").length).toBeGreaterThan(0);
  });

  it("preserves preview/confirm for lifecycle from detail dialog", async () => {
    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        effects: ["Скроет из каталога"],
        warnings: [],
        displayName: "Тест Партнёр",
        confirmToken: "tok-1",
      },
    });
    api.applyPartnerLifecycle.mockResolvedValue({});

    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Тест Партнёр/ }));
    await waitFor(() => screen.getByLabelText("Причина"));

    fireEvent.change(screen.getByLabelText("Причина"), { target: { value: "Тест причины" } });
    fireEvent.click(screen.getByRole("button", { name: "Убрать из каталога" }));
    await waitFor(() => expect(api.previewPartnerLifecycle).toHaveBeenCalledWith("p1", "hide_catalog"));
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));
    await waitFor(() =>
      expect(api.applyPartnerLifecycle).toHaveBeenCalledWith(
        "p1",
        "hide_catalog",
        "Тест причины",
        "tok-1",
      ),
    );
  });

  it("keeps bulk safety: quick bar expands to reason+preview before apply", async () => {
    api.previewPartnerLifecycle.mockResolvedValue({
      preview: {
        effects: ["Архив"],
        warnings: [],
        displayName: "Тест Партнёр",
        confirmToken: "bulk-tok",
      },
    });

    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Тест Партнёр"));
    fireEvent.click(screen.getByLabelText("Выбрать Тест Партнёр"));
    await waitFor(() => screen.getByTestId("selected-count"));

    fireEvent.click(screen.getByRole("button", { name: "В архив" }));
    await waitFor(() => screen.getByLabelText("Групповое действие"));
    expect(screen.getByLabelText("Групповое действие")).toHaveValue("archive_project");
    expect(api.applyPartnerLifecycle).not.toHaveBeenCalled();
  });
});
