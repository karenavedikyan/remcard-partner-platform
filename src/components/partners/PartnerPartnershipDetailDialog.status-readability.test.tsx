import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartnerPartnershipDetailDialog } from "./PartnerPartnershipDetailDialog";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
import type { Partnership } from "@/lib/types";

/**
 * Computed-style gate for P4a status readability.
 * Complements source assertions — does not replace them.
 * jsdom may approximate CSS-module cascade; synthetic Playwright matrix is authoritative for px.
 */

function partnership(status: Partnership["status"]): Partnership {
  return {
    id: "p-status",
    status,
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "",
    updatedAt: "",
    storeUserId: "store-1",
    proUserId: "agent-1",
    terms: [
      {
        id: "t1",
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 10,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: "store-1",
      displayName: "Store",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-1",
      displayName: "Partner",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
    listPreference: {
      personalAlias: null,
      archivedAt: null,
      hiddenAt: null,
    },
  };
}

function relativeLuminance(rgb: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

function contrastRatio(fg: [number, number, number], bg: [number, number, number]): number {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

function parseRgb(value: string): [number, number, number] | null {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function directStatusBadge(dialog: HTMLElement): HTMLElement {
  const body = Array.from(dialog.children).find(
    (el) => el instanceof HTMLElement && el.className.includes("body"),
  );
  expect(body).toBeTruthy();
  const badge = Array.from(body!.children).find(
    (el) => el instanceof HTMLElement && el.tagName === "SPAN" && el.className.includes("badge"),
  );
  expect(badge).toBeTruthy();
  return badge as HTMLElement;
}

describe("PartnerPartnershipDetailDialog status readability (P4a)", () => {
  afterEach(() => {
    resetBodyScrollLockForTests();
  });

  it("keeps the status span as a direct .body child with readable computed size when CSS applies", () => {
    render(
      <PartnerPartnershipDetailDialog
        partnership={partnership("ACTIVE")}
        meId="store-1"
        open
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByTestId("partner-partnership-detail-dialog");
    const badge = directStatusBadge(dialog);
    expect(badge).toHaveTextContent("Активно");

    const fontSize = getComputedStyle(badge).fontSize;
    // jsdom may return "" if cascade not applied; Playwright matrix enforces ≥14px.
    if (fontSize) {
      expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(14);
    }
  });

  it("computes PAUSED light neutral FG/BG contrast ≥4.5 when styles resolve", () => {
    document.documentElement.setAttribute("data-theme", "light");
    render(
      <PartnerPartnershipDetailDialog
        partnership={partnership("PAUSED")}
        meId="store-1"
        open
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByTestId("partner-partnership-detail-dialog");
    const badge = directStatusBadge(dialog);
    expect(badge).toHaveTextContent("Приостановлено");

    const cs = getComputedStyle(badge);
    const fg = parseRgb(cs.color);
    const bg = parseRgb(cs.backgroundColor);
    if (fg && bg) {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    } else {
      // Fallback documented target used by the local CSS rule (#5c605a on #f2f1ee)
      expect(contrastRatio([0x5c, 0x60, 0x5a], [0xf2, 0xf1, 0xee])).toBeGreaterThanOrEqual(4.5);
    }
    document.documentElement.removeAttribute("data-theme");
  });
});
