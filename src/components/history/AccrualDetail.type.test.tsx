import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { contrastRatio, THEME_CONTRAST_PAIRS } from "@/lib/theme-contrast";
import { AccrualDetail } from "./AccrualDetail";
import type { AccrualRow } from "@/lib/history-types";
import type { AuthUser } from "@/lib/types";

const profUser: AuthUser = {
  id: "prof-1",
  role: "PRO",
  partnerType: null,
  displayName: "PROF",
};

const bonusRow: AccrualRow = {
  id: "shared-id",
  orderId: "order-bonus",
  accrualType: "bonus",
  createdAt: "2026-10-01T10:00:00.000Z",
  amount: 100,
  status: "CONFIRMED",
  paidAt: null,
  counterpartyName: "Shop",
  promoCode: "RC-1",
  isSelfScan: false,
  walletRole: "MASTER",
  scope: "earned",
  items: [],
};

const agentRow: AccrualRow = {
  ...bonusRow,
  orderId: "order-agent",
  accrualType: "agentBonus",
  amount: 200,
};

vi.mock("@/lib/history-loader", () => ({
  fetchAccrualById: vi.fn(),
  fetchPurchaseByOrderId: vi.fn(),
  fetchPurchaseRows: vi.fn(),
}));

import { fetchAccrualById, fetchPurchaseByOrderId } from "@/lib/history-loader";

describe("AccrualDetail accrualType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPurchaseByOrderId).mockResolvedValue(null);
  });

  it("loads bonus and agentBonus separately for shared test id", async () => {
    vi.mocked(fetchAccrualById).mockImplementation(async (_id, type) => {
      if (type === "bonus") return bonusRow;
      if (type === "agentBonus") return agentRow;
      return null;
    });

    const { rerender } = render(
      <AccrualDetail user={profUser} accrualId="shared-id" accrualType="bonus" />,
    );
    expect(await screen.findByText("100")).toBeInTheDocument();
    expect(screen.getByText("₽")).toBeInTheDocument();
    expect(fetchAccrualById).toHaveBeenCalledWith("shared-id", "bonus");

    rerender(
      <AccrualDetail user={profUser} accrualId="shared-id" accrualType="agentBonus" />,
    );
    expect(await screen.findByText("200")).toBeInTheDocument();
    expect(screen.getAllByText("₽").length).toBeGreaterThan(0);
    expect(fetchAccrualById).toHaveBeenCalledWith("shared-id", "agentBonus");
  });

  it("binds purchase CTA to accent-fill tokens for 4.5:1 contrast in light and dark", () => {
    const cssPath = join(dirname(fileURLToPath(import.meta.url)), "history-focus.module.css");
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("background: var(--accent-fill)");
    expect(css).toContain("color: var(--accent-on-fill");

    const light = THEME_CONTRAST_PAIRS.light.primaryButton;
    const dark = THEME_CONTRAST_PAIRS.dark.primaryButton;
    expect(contrastRatio(light.fg, light.bg)).toBeGreaterThanOrEqual(light.minRatio);
    expect(contrastRatio(dark.fg, dark.bg)).toBeGreaterThanOrEqual(dark.minRatio);
    expect(contrastRatio("#ffffff", "#fda4af")).toBeLessThan(4.5);
  });
});
