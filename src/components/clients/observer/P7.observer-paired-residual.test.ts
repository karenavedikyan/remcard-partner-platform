import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Residual publication gate (partial harness only — not full Next shell).
 * Reads measure-paired-residual-v2.mjs output; run script before this test.
 */
const reportPath = path.resolve(
  __dirname,
  "../../../../audit/remcard-parallel-20261113/P7/paired-residual-v2.json",
);

describe("P7 — paired residual v2 (Manrope + globals + shell)", () => {
  it("report exists with prototype pin 3dc31836", () => {
    expect(existsSync(reportPath)).toBe(true);
    const data = JSON.parse(readFileSync(reportPath, "utf8"));
    expect(data.prototypeSha).toBe("3dc31836cd18d9209c20097f18b906dd276f7af6");
    expect(data.fullShell).toBe("OPEN");
    expect(data.samples.length).toBeGreaterThanOrEqual(28);
  });

  it("product dark @375: 12px bucket, min 44px, production accent, contrast ≥4.5", () => {
    const data = JSON.parse(readFileSync(reportPath, "utf8"));
    const row = data.samples.find(
      (s: { side: string; theme: string; width: number }) =>
        s.side === "product" && s.theme === "dark" && s.width === 375,
    );
    expect(row).toBeTruthy();
    expect(row.bucket.fontSize).toBe("12px");
    expect(row.bucket.padding).toBe("4px 12px");
    expect(parseFloat(row.bucket.height)).toBeGreaterThanOrEqual(44);
    expect(row.manropeResolved.toLowerCase()).toContain("manrope");
    expect(row.bucket.color).toMatch(/rgb\(253,\s*164,\s*175\)/);
    expect(row.bucketContrast).toBeGreaterThanOrEqual(4.5);
    expect(row.summary.fontSize).toBe("14px");
    expect(row.toggle).toBe("12px");
    expect(row.longOpen.scrollWidth).toBeLessThanOrEqual(row.longOpen.clientWidth + 1);
  });

  it("no typography/grid deltas vs proto on core ledger fields @1440", () => {
    const data = JSON.parse(readFileSync(reportPath, "utf8"));
    const fails = data.summaryRows.filter((r: { mismatches: string[] }) => r.mismatches.length > 0);
    expect(fails).toEqual([]);
  });
});
