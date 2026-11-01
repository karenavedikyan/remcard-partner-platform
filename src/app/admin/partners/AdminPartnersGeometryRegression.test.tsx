/** @vitest-environment jsdom */
/**
 * Focused geometry regression contracts for Admin Partners R1.
 * Native Chromium + fonts.ready measures remain authoritative for pixel heights;
 * CSS source pins live in AdminPartnersA13aSourceContracts.test.ts (node env).
 */
import { describe, expect, it, beforeEach, vi } from "vitest";
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
  previewPartnerAccountDelete: vi.fn(),
  applyPartnerAccountDelete: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";
import styles from "./AdminPartners.module.css";

function registryPayload() {
  return {
    items: [
      {
        id: "p1",
        publicId: "P001",
        displayName: "Александр Миронов",
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
    total: 1,
    facets: null,
    nextCursor: null,
  };
}

describe("Admin Partners geometry regression (R1)", () => {
  beforeEach(() => {
    nav.params = new URLSearchParams();
    localStorage.removeItem(VIEW_MODE_STORAGE_KEY);
    api.fetchPartnerRegistry.mockReset();
    api.previewPartnerLifecycle.mockReset();
    api.applyPartnerLifecycle.mockReset();
    api.fetchPartnerRegistry.mockResolvedValue(registryPayload());
  });

  it("renders colgroup proportion classes and intrinsic registration badge in the card", async () => {
    render(<AdminPartnersClient />);
    await waitFor(() => screen.getByText("Александр Миронов"));
    const table = screen.getByRole("table", { name: "Реестр партнёров" });
    expect(table.querySelector("colgroup")).toBeTruthy();
    expect(table.querySelector(`.${styles.colPartner}`)).toBeTruthy();
    expect(table.querySelector(`.${styles.colReg}`)).toBeTruthy();
    expect(table.querySelector(`.${styles.colCatalog}`)).toBeTruthy();
    expect(table.querySelector(`.${styles.colCoop}`)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Открыть карточку Александр Миронов/ }));
    await waitFor(() => screen.getByRole("heading", { name: "Карточка партнёра" }));
    const dialog = screen.getByRole("heading", { name: "Карточка партнёра" }).closest("dialog");
    expect(dialog).toBeTruthy();
    const badge = dialog!.querySelector(`.${styles.detailRegBadge}`);
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toMatch(/Активн|ACTIVE|Регистр/i);
    expect(within(dialog as HTMLElement).getByLabelText("Причина")).toBeTruthy();
    expect(within(dialog as HTMLElement).getByRole("switch", { name: "Видимость в каталоге" })).toBeTruthy();
    expect(within(dialog as HTMLElement).getByRole("switch", { name: "Видимость в сотрудничестве" })).toBeTruthy();
  });
});
