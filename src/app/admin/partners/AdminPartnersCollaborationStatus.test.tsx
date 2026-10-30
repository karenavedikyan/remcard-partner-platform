/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";

const visible = {
  id: "visible-partner",
  displayName: "Visible Collab Partner",
  partnerType: "AGENT",
  partnerKind: "agent",
  city: "Москва",
  registrationLabel: "ACTIVE",
  lifecycle: null,
  catalogVisibility: "VISIBLE",
  partnerSearchVisibility: {
    visible: true,
    reasonCode: "OK",
    reasonLabel: "Доступен",
    adminOverride: "AUTO",
  },
  partnershipCounts: { active: 2, invited: 1, pending: 0, paused: 0, ended: 0, total: 3 },
  publicCatalogLinks: [],
};

const hidden = {
  id: "hidden-partner",
  displayName: "Hidden Collab Partner",
  partnerType: "STORE",
  partnerKind: "store",
  city: "Сочи",
  registrationLabel: "DEMO",
  lifecycle: null,
  catalogVisibility: "NOT_PUBLISHED",
  partnerSearchVisibility: {
    visible: false,
    reasonCode: "HIDDEN",
    reasonLabel: "Причина скрытия из поиска",
    adminOverride: "HIDE",
  },
  partnershipCounts: { active: 0, invited: 0, pending: 0, paused: 0, ended: 0, total: 0 },
  publicCatalogLinks: [],
};

const missing = {
  id: "missing-partner",
  displayName: "Missing Collab Data",
  partnerType: "COMPANY",
  partnerKind: "company",
  city: "Тула",
  registrationLabel: "ACTIVE",
  lifecycle: null,
  catalogVisibility: "VISIBLE",
  publicCatalogLinks: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  api.fetchPartnerRegistry.mockResolvedValue({
    items: [visible, hidden, missing],
    total: 3,
    nextCursor: null,
    facets: null,
  });
});

describe("Admin partners collaboration status UI (R1)", () => {
  it("renders collaboration column without conflating catalog badges", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    const table = screen.getByRole("table", { name: "Реестр партнёров" });
    expect(within(table).getByRole("columnheader", { name: "Сотрудничество" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Каталог" })).toBeTruthy();
    expect(screen.getAllByText("Виден партнёрам").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Не виден партнёрам|Скрыт от партнёров/).length).toBeGreaterThan(0);
    expect(screen.getByText("Причина скрытия из поиска")).toBeTruthy();
    expect(screen.getAllByText("Нет данных").length).toBeGreaterThan(0);
    // Catalog tokens are compact Виден/Скрыт (not long catalogStatusLabel in the catalog column)
    expect(within(table).getAllByText("Виден").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Скрыт").length).toBeGreaterThan(0);
  });

  it("expands keyboard-accessible breakdown and labels invitations separately from active", async () => {
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    const summaries = screen.getAllByText(/Пояснение и статусы связей/i);
    await ui.click(summaries[0]!);
    expect(screen.getAllByText("Приглашения (не активное сотрудничество)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Активное сотрудничество").length).toBeGreaterThan(0);
  });

  it("links active and status counts to admin partnerships drilldown routes", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    const activeLinks = screen.getAllByRole("link", {
      name: /Активное сотрудничество: 2\. Открыть список контрагентов/i,
    });
    expect(
      activeLinks.some(
        (el) =>
          el.getAttribute("href") ===
          "/admin/partners/visible-partner/partnerships?status=ACTIVE&contextName=Visible+Collab+Partner",
      ),
    ).toBe(true);
    const zeroActiveLinks = screen.getAllByRole("link", {
      name: /Активное сотрудничество: 0\. Открыть список контрагентов/i,
    });
    expect(zeroActiveLinks.some((el) => el.getAttribute("href")?.includes("hidden-partner"))).toBe(true);
    expect(screen.queryByRole("link", { name: /Missing Collab Data/i })).toBeNull();
    expect(screen.getAllByText("Нет данных").length).toBeGreaterThan(0);
  });

  it("shows the same collaboration block in cards view", async () => {
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    await ui.click(screen.getByRole("button", { name: "Карточки" }));
    expect(await screen.findAllByRole("region", { name: "Сотрудничество" })).toHaveLength(3);
    expect(screen.getAllByText("Visible Collab Partner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Виден партнёрам").length).toBeGreaterThan(0);
  });
});
