import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

const api = vi.hoisted(() => ({
  fetchPartnerRegistry: vi.fn(),
  previewPartnerLifecycle: vi.fn(),
  applyPartnerLifecycle: vi.fn(),
}));
vi.mock("@/lib/prof-admin-partners-api", () => api);

import styles from "./AdminPartners.module.css";
import { AdminPartnersClient } from "./AdminPartnersClient";

const row = {
  id: "layout-partner",
  displayName: "Layout Partner",
  partnerType: "STORE",
  registrationLabel: "DEMO" as const,
  city: "City",
  lifecycle: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchPartnerRegistry.mockResolvedValue({ items: [row], total: 1, nextCursor: null, facets: null });
});

describe("R1 registry table column layout", () => {
  it("uses partners table with partner/registration/catalog/cooperation/visit columns", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Layout Partner");
    const table = screen.getByRole("table", { name: "Реестр партнёров" });
    expect(table.className).toContain(styles.partnersTable);
    expect(within(table).getByRole("columnheader", { name: "Партнёр" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Регистрация" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Каталог" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Сотрудничество" })).toBeTruthy();
    expect(within(table).getByRole("columnheader", { name: "Визит*" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Открыть карточку Layout Partner/ })).toBeTruthy();
    expect(table.closest(`.${styles.tableWrapR1}`)).not.toBeNull();
  });
});
