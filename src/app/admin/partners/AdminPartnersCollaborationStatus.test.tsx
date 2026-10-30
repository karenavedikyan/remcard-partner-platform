/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  catalogVisibility: undefined,
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

describe("Admin partners collaboration status UI (R1 compact)", () => {
  it("keeps compact cooperation cell without diagnostic dump in the row", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    const table = screen.getByRole("table", { name: "Реестр партнёров" });
    expect(within(table).getByRole("columnheader", { name: "Сотрудничество" })).toBeTruthy();
    expect(within(table).getAllByText("Виден").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Скрыт").length).toBeGreaterThan(0);
    expect(within(table).queryByText(/Пояснение и статусы связей/i)).toBeNull();
    expect(screen.getAllByText("Нет данных").length).toBeGreaterThan(0);
  });

  it("exposes full breakdown inside partner detail disclosure", async () => {
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    await ui.click(screen.getByRole("button", { name: /Открыть карточку Visible Collab Partner/ }));
    await screen.findByRole("heading", { name: "Карточка партнёра" });
    await ui.click(screen.getByText(/Пояснение поиска и статусы связей/i));
    expect(screen.getAllByText("Приглашения (не активное сотрудничество)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Активное сотрудничество").length).toBeGreaterThan(0);
  });

  it("links partnership totals from the compact cell", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    const totalLinks = screen.getAllByRole("link", {
      name: /Всего связей: 3\. Открыть список контрагентов/i,
    });
    expect(
      totalLinks.some((el) =>
        el.getAttribute("href")?.includes("/admin/partners/visible-partner/partnerships"),
      ),
    ).toBe(true);
  });

  it("keeps compact mobile cards without collaboration dump headings", async () => {
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    await ui.click(screen.getByRole("button", { name: "Карточки" }));
    expect(screen.getAllByText("Visible Collab Partner").length).toBeGreaterThan(0);
    expect(screen.queryByRole("region", { name: "Сотрудничество" })).toBeNull();
  });

  it("shows Нет данных for missing catalogVisibility (not hidden copy)", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Missing Collab Data");
    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Missing Collab Data/ }));
    const dialog = (await screen.findByRole("heading", { name: "Карточка партнёра" })).closest(
      "dialog",
    )!;
    expect(within(dialog).getAllByText("Нет данных с сервера").length).toBeGreaterThan(0);
    expect(within(dialog).queryByText("Не отображается на сайте")).toBeNull();
  });
});
