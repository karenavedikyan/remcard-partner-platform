import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("TermChangePanel P17b inner chrome CSS", () => {
  const src = readFileSync(
    path.join(process.cwd(), "src/components/partners/TermChangePanel.module.css"),
    "utf8",
  );

  it("matches measured R1 body gap, notice, footer, input chrome", () => {
    expect(src).toMatch(/\.panelModal\s*\{[^}]*gap:\s*16px/s);
    expect(src).toMatch(/\.notice\s*\{[^}]*padding:\s*16px/s);
    expect(src).toMatch(/\.notice\s*\{[^}]*border-radius:\s*10px/s);
    expect(src).toMatch(/\.actionsModal\s*\{[^}]*gap:\s*8px/s);
    expect(src).toMatch(/\.actionsModal\s*\{[^}]*margin-top:\s*24px/s);
    expect(src).toMatch(/\.percentInput\s*\{[^}]*font-size:\s*14px/s);
    expect(src).toMatch(/webkit-appearance:\s*none/);
    expect(src).toMatch(/appearance:\s*textfield/);
  });

  it("pins Cancel/Submit to exact 14px/700 (closes P17 fluid residual)", () => {
    expect(src).toMatch(/\.cancelGhost\s*\{[^}]*font-size:\s*14px/s);
    expect(src).toMatch(/\.cancelGhost\s*\{[^}]*line-height:\s*1\.6/s);
    expect(src).toMatch(/\.cancelGhost\s*\{[^}]*font-weight:\s*700/s);
    expect(src).toMatch(/font-size:\s*14px/);
    expect(src).toMatch(/--term-accent:\s*#bb3035/);
    expect(src).toMatch(/--term-accent:\s*#f49391/);
    expect(src).toMatch(/\.termTable thead th\s*\{[^}]*font-size:\s*12px/s);
    expect(src).not.toMatch(/\.cancelGhost\s*\{[^}]*font-size:\s*var\(--text-sm/s);
  });
});
