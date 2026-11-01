import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("A15c overview KPI grid spacing (R1 .kpis margin)", () => {
  it("applies prototype kpis margin-bottom atop wrap gap without changing grid columns", () => {
    const src = readFileSync(path.join(__dirname, "AdminOverview.module.css"), "utf8");
    const block = src.match(/\.kpis\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(block).toMatch(/grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);
    expect(block).toMatch(/margin-bottom:\s*calc\(var\(--space-6\) - var\(--space-5\)\)/);
    expect(block).toMatch(/gap:\s*var\(--space-4\)/);
  });

  it("resets extra kpis margin on mobile where prototype uses s5 equal to wrap gap", () => {
    const src = readFileSync(path.join(__dirname, "AdminOverview.module.css"), "utf8");
    const mobile = src.match(/@media \(max-width: 760px\)\s*\{[\s\S]*?\.kpis\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(mobile).toMatch(/margin-bottom:\s*0/);
  });
});
