import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));
vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";

const visibleRow = {
  id: "visible-partner",
  displayName: "Visible Collab Partner",
  partnerType: "MASTER",
  registrationLabel: "ACTIVE" as const,
  catalogVisibility: "NOT_PUBLISHED" as const,
  city: "SPB",
  lifecycle: null,
  partnerSearchVisibility: { visible: true, reasonCode: "eligible", reasonLabel: "" },
  partnershipCounts: { active: 2, invited: 1, pending: 0, paused: 0, ended: 3, total: 6 },
};

const hiddenRow = {
  id: "hidden-partner",
  displayName: "Hidden Collab Partner",
  partnerType: "STORE",
  registrationLabel: "DEMO" as const,
  catalogVisibility: "VISIBLE" as const,
  city: "Kazan",
  lifecycle: null,
  partnerSearchVisibility: {
    visible: false,
    reasonCode: "demo",
    reasonLabel: "Причина скрытия из поиска",
  },
  partnershipCounts: { active: 0, invited: 4, pending: 0, paused: 0, ended: 0, total: 4 },
};

const missingRow = {
  id: "missing-partner",
  displayName: "Missing Collab Data",
  partnerType: "AGENT",
  registrationLabel: "ACTIVE" as const,
  city: "Omsk",
  lifecycle: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchPartnerRegistry.mockResolvedValue({
    items: [visibleRow, hiddenRow, missingRow],
    total: 3,
    nextCursor: null,
    facets: null,
  });
});

describe("Admin partners collaboration status UI", () => {
  it("renders collaboration column in compact table without conflating catalog badges", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    const table = screen.getByRole("table", { name: "Реестр партнёров" });
    expect(table.querySelectorAll("colgroup col")).toHaveLength(8);
    expect(within(table).getByRole("columnheader", { name: "Сотрудничество" })).toBeTruthy();
    expect(screen.getAllByText("Виден партнёрам").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Не виден партнёрам").length).toBeGreaterThan(0);
    expect(screen.getByText("Причина скрытия из поиска")).toBeTruthy();
    expect(screen.getAllByText("Нет данных").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Виден в каталоге").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Не опубликован").length).toBeGreaterThan(0);
    const activeZeros = screen.getAllByText("0", { exact: true });
    expect(activeZeros.length).toBeGreaterThan(0);
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

  it("shows the same collaboration block in cards view", async () => {
    const ui = userEvent.setup();
    render(<AdminPartnersClient />);
    await screen.findByText("Visible Collab Partner");
    await ui.click(screen.getByRole("button", { name: "Карточки" }));
    expect(await screen.findAllByRole("heading", { name: "Сотрудничество" })).toHaveLength(3);
    expect(screen.getAllByText("Visible Collab Partner").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Виден партнёрам").length).toBeGreaterThan(0);
  });
});
