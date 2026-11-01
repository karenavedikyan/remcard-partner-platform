/** @vitest-environment jsdom */
/**
 * A13c registry presentation: filter chip R1 tokens + unknown visibility a11y
 * must not announce as trustworthy off.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const nav = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => nav.params,
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  previewPartnerAccountDelete: vi.fn(),
  applyPartnerAccountDelete: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";
import styles from "./AdminPartners.module.css";

const facets = {
  matchedTotal: 2,
  partnerKind: {
    all: 2,
    agent: 1,
    specialist: 0,
    store: 1,
    company: 0,
    unknown: 0,
    facetRule: "synthetic",
  },
  registration: { active: 1, demo: 1, facetRule: "synthetic" },
  catalog: { visible: 1, hidden: 0, notPublic: 1, facetRule: "synthetic" },
  archive: { archived: 0, notArchived: 2, facetRule: "synthetic" },
};

function registryPayload(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        id: "p-known",
        publicId: "RC-KNOWN",
        displayName: "Известный партнёр",
        partnerType: "AGENT",
        partnerKind: "agent",
        registrationLabel: "ACTIVE",
        catalogVisibility: "VISIBLE",
        partnerSearchVisibility: {
          visible: true,
          reasonCode: "OK",
          reasonLabel: "Доступен",
          adminOverride: "AUTO",
        },
        city: "Краснодар",
        lifecycle: { projectArchivedAt: null, catalogHiddenAt: null },
        partnershipCounts: { active: 0, invited: 0, pending: 0, paused: 0, ended: 0, total: 0 },
        publicCatalogLinks: [],
      },
      {
        id: "p-unk",
        publicId: "RC-UNK",
        displayName: "Партнёр без видимости",
        partnerType: "STORE",
        partnerKind: "store",
        registrationLabel: "DEMO",
        // catalogVisibility omitted → unknown
        partnerSearchVisibility: null,
        city: "Анапа",
        lifecycle: { projectArchivedAt: null, catalogHiddenAt: null },
        partnershipCounts: { active: 0, invited: 0, pending: 0, paused: 0, ended: 0, total: 0 },
        publicCatalogLinks: [],
      },
    ],
    total: 2,
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
  api.previewPartnerLifecycle.mockResolvedValue({
    preview: {
      effects: ["preview"],
      warnings: [],
      displayName: "x",
      confirmToken: "tok",
    },
  });
});

describe("A13c registry presentation", () => {
  it("ships filterChipActive on R1 brand-soft class contract", () => {
    expect(styles.filterChip).toBeTruthy();
    expect(styles.filterChipActive).toBeTruthy();
    expect(styles.filterChip).not.toEqual(styles.filterChipActive);
  });

  it("announces unknown catalog/cooperation as no-data, not off", async () => {
    render(<AdminPartnersClient />);
    expect(await screen.findByRole("heading", { name: "Партнёры", level: 1 })).toBeTruthy();
    const open = (
      await screen.findAllByRole("button", { name: /Открыть (строку|карточку) Партнёр без видимости/i })
    )[0]!;
    fireEvent.click(open);
    const dialog = await screen.findByRole("dialog");
    const catalog = within(dialog).getByRole("switch", { name: /Видимость в каталоге/i });
    const coop = within(dialog).getByRole("switch", { name: /Видимость в сотрудничестве/i });
    expect(catalog).toHaveAttribute("aria-checked", "mixed");
    expect(coop).toHaveAttribute("aria-checked", "mixed");
    expect(catalog).toHaveAccessibleName(/нет данных/i);
    expect(coop).toHaveAccessibleName(/нет данных/i);
    expect(catalog).not.toHaveAccessibleName(/: скрыт$/i);
    expect(coop).not.toHaveAccessibleName(/: скрыт$/i);
    fireEvent.click(catalog);
    expect(api.previewPartnerLifecycle).not.toHaveBeenCalled();
  });

  it("keeps table↔cards toggle and registry retry surface", async () => {
    api.fetchPartnerRegistry
      .mockRejectedValueOnce(new Error("registry boom a13c"))
      .mockResolvedValueOnce(registryPayload());
    render(<AdminPartnersClient />);
    expect(await screen.findByRole("button", { name: "Повторить загрузку" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Повторить загрузку" }));
    expect(await screen.findByRole("heading", { name: "Партнёры", level: 1 })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Таблица" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Карточки" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Карточки" }));
    expect((await screen.findAllByRole("button", { name: /Открыть карточку/i })).length).toBeGreaterThan(0);
  });
});
