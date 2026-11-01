import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("TermChangePanel P17c modal palette inheritance", () => {
  const src = readFileSync(
    path.join(process.cwd(), "src/components/partners/TermChangePanel.module.css"),
    "utf8",
  );

  it("notice uses sheet-scoped offset/muted (not FE-only hardcodes)", () => {
    expect(src).toMatch(/\.notice\s*\{[^}]*background:\s*var\(--offset\)/s);
    expect(src).toMatch(/\.notice\s*\{[^}]*color:\s*var\(--muted\)/s);
    expect(src).toMatch(/\.notice\s*\{[^}]*padding:\s*16px/s);
    expect(src).toMatch(/\.notice\s*\{[^}]*border-radius:\s*10px/s);
  });

  it("table/input borders use var(--line) so sheet R1 line applies", () => {
    expect(src).toMatch(/border-bottom:\s*1px\s+solid\s+var\(--line\)/);
    expect(src).toMatch(/\.percentInput\s*\{[^}]*border:\s*1px\s+solid\s+var\(--line\)/s);
    expect(src).toMatch(/\.percentInput\s*\{[^}]*background:\s*var\(--surface\)/s);
  });

  it("keeps Cancel/Submit exact 14px and term accents", () => {
    expect(src).toMatch(/\.cancelGhost\s*\{[^}]*font-size:\s*14px/s);
    expect(src).toMatch(/\.cancelGhost\s*\{[^}]*line-height:\s*1\.6/s);
    expect(src).toMatch(/--term-accent:\s*#bb3035/);
    expect(src).toMatch(/--term-accent:\s*#f49391/);
  });
});
