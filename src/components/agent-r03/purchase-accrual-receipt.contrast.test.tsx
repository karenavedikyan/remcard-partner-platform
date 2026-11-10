import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/theme-contrast";

const receiptCss = readFileSync(path.join(__dirname, "purchase-accrual-receipt.module.css"), "utf8");
const listCss = readFileSync(path.join(__dirname, "certificate-purchases.module.css"), "utf8");
const globalsCss = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

/** Painted mid-gradient sample from harness measurement (not a solid token). */
const CERT_STRIPE_PAINTED_SAMPLE = "#b8353a";

const RECEIPT_SECONDARY_ON_OFFSET_LIGHT = "#565a54";
const LIGHT_OFFSET = "#f2f1ee";

function parseOffset(theme: "light" | "dark"): string {
  if (theme === "light") {
    return globalsCss.match(/:root\s*\{[^}]*--offset:\s*([^;]+);/s)?.[1]?.trim() ?? LIGHT_OFFSET;
  }
  const dark = globalsCss.match(/\[data-theme="dark"\]\s*\{[^}]*--offset:\s*([^;]+);/s)?.[1]?.trim();
  return dark ?? "#2b312b";
}

function parseInk(theme: "light" | "dark"): string {
  if (theme === "light") {
    return globalsCss.match(/:root\s*\{[^}]*--ink:\s*([^;]+);/s)?.[1]?.trim() ?? "#252923";
  }
  return globalsCss.match(/\[data-theme="dark"\]\s*\{[^}]*--ink:\s*([^;]+);/s)?.[1]?.trim() ?? "#f0f1ec";
}

describe("PurchaseAccrualReceipt contrast (receipt-local colors)", () => {
  it("declares explicit white cert line text (parent color alone is insufficient)", () => {
    expect(receiptCss).toMatch(/\.cert\s+\.certLine[^}]*color:\s*#ffffff/);
    expect(receiptCss).toMatch(/\.certLine[^}]*color:\s*#ffffff/);
  });

  it("uses receipt-local secondary on offset, not global muted alone (light)", () => {
    expect(receiptCss).toMatch(/\.note[^}]*color:\s*#565a54/);
    expect(receiptCss).toMatch(/\.timeline li[^}]*color:\s*#565a54/);
    expect(receiptCss).toMatch(/\.paidValue[^}]*color:\s*var\(--ink\)/);
    expect(listCss).toMatch(/\.merchant[^}]*color:\s*#565a54/);
  });

  it("meets >=4.5 on light offset for secondary and paid value text", () => {
    const offset = parseOffset("light");
    expect(contrastRatio(RECEIPT_SECONDARY_ON_OFFSET_LIGHT, offset)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(parseInk("light"), offset)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#6c706a", offset)).toBeLessThan(4.5);
  });

  it("meets >=4.5 for white cert copy on painted gradient sample (not solid fallback)", () => {
    expect(contrastRatio("#ffffff", CERT_STRIPE_PAINTED_SAMPLE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#a6aea4", CERT_STRIPE_PAINTED_SAMPLE)).toBeLessThan(4.5);
  });

  it("dark list secondary still uses theme muted on dark surfaces", () => {
    const offset = parseOffset("dark");
    const muted =
      globalsCss.match(/\[data-theme="dark"\]\s*\{[^}]*--muted:\s*([^;]+);/s)?.[1]?.trim() ??
      "#a6aea4";
    expect(contrastRatio(muted, offset)).toBeGreaterThanOrEqual(4.5);
  });
});
