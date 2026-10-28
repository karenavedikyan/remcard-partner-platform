import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

describe("Compact registry table column layout", () => {
  it("uses seven explicit columns with access width and horizontal scroll wrapper", async () => {
    render(<AdminPartnersClient />);
    await screen.findByText("Layout Partner");
    const table = screen.getByRole("table", { name: "Реестр партнёров" });
    expect(table.className).toContain(styles.tableCompact);
    expect(table.querySelectorAll("colgroup col")).toHaveLength(7);
    expect(table.querySelector(`.${styles.colAccess}`)).not.toBeNull();
    const headers = table.querySelectorAll("thead th");
    expect(headers).toHaveLength(7);
    expect(headers[6]?.textContent).toBe("Доступ");
    const accessCell = screen.getByRole("button", { name: "Действия" }).closest("td");
    expect(accessCell?.className).toContain(styles.accessCol);
    expect(accessCell?.getAttribute("data-label")).toBe("Доступ");
    const wrap = table.closest(`.${styles.tableWrapCompact}`);
    expect(wrap).not.toBeNull();
  });
});
