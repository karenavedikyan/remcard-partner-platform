/** @vitest-environment jsdom */
/**
 * Focused geometry regression contracts for Admin Partners R1.
 * Native Chromium + fonts.ready measures remain authoritative for pixel heights;
 * these assertions pin the CSS/markup levers that caused the 14rem mobile stretch
 * and equal-column table proportions without claiming screenshot parity.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
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
  applyPartnerLifecycle: vi.fn(),
}));

vi.mock("@/lib/prof-admin-partners-api", () => api);

import { AdminPartnersClient } from "./AdminPartnersClient";
import { VIEW_MODE_STORAGE_KEY } from "./adminPartnersRegistryConstants";
import styles from "./AdminPartners.module.css";

const ROOT = path.join(__dirname);
const CSS = path.join(ROOT, "AdminPartners.module.css");

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

  it("pins reference column widths and mobile flex-basis auto override in CSS", () => {
    const css = readFileSync(CSS, "utf8");
    expect(css).toMatch(/\.colPartner\s*\{[^}]*width:\s*298px/s);
    expect(css).toMatch(/\.colReg\s*\{[^}]*width:\s*161px/s);
    expect(css).toMatch(/\.colCatalog\s*\{[^}]*width:\s*122px/s);
    expect(css).toMatch(/\.colCoop\s*\{[^}]*width:\s*179px/s);
    expect(css).toMatch(/\.partnerName\s*\{[^}]*max-width:\s*290px/s);
    expect(css).toMatch(/\.detailRegBadge\s*\{[^}]*width:\s*fit-content/s);
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*\.detailSettingsCopy,\s*\n\s*\.detailToggleActions\s*\{[^}]*flex:\s*0\s+0\s+auto[^}]*flex-basis:\s*auto/s,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*900px\)[\s\S]*\.detailStats\s*>\s*div:last-child\s*\{[^}]*display:\s*flex[^}]*justify-content:\s*space-between/s,
    );
    // Desktop: copy keeps wrap basis; actions size to content (no 14rem height on mobile).
    expect(css).toMatch(/\.detailSettingsCopy\s*\{[^}]*flex:\s*1\s+1\s+14rem/s);
    expect(css).toMatch(/\.detailToggleActions\s*\{[^}]*flex:\s*0\s+1\s+auto/s);
    expect(css).toMatch(/\.detailToggleActions\s*\{[^}]*min-width:\s*0/s);
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
    expect(within(dialog as HTMLElement).getByRole("group", { name: "Действия каталога" })).toBeTruthy();
    expect(
      within(dialog as HTMLElement).getByRole("group", { name: "Действия поиска сотрудничества" }),
    ).toBeTruthy();
    expect(within(dialog as HTMLElement).getByLabelText("Причина")).toBeTruthy();
    expect(within(dialog as HTMLElement).getByRole("button", { name: "Убрать из каталога" })).toBeTruthy();
    expect(within(dialog as HTMLElement).getByRole("button", { name: "Показывать партнёрам" })).toBeTruthy();
  });
});
