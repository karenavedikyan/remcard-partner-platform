import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * P17c: modal-local frozen R1 roles palette on .sheet + close lh 22.4.
 * Does not rewrite global theme tokens.
 */
describe("TermChangeModal P17c sheet-scoped R1 palette", () => {
  const src = readFileSync(
    path.join(process.cwd(), "src/components/partners/TermChangeModal.module.css"),
    "utf8",
  );

  it("pins frozen R1 light roles tokens on .sheet", () => {
    expect(src).toMatch(/\.sheet\s*\{[^}]*--surface:\s*#ffffff/s);
    expect(src).toMatch(/\.sheet\s*\{[^}]*--offset:\s*#efeeeb/s);
    expect(src).toMatch(/\.sheet\s*\{[^}]*--ink:\s*#242623/s);
    expect(src).toMatch(/\.sheet\s*\{[^}]*--muted:\s*#61645f/s);
    expect(src).toMatch(/\.sheet\s*\{[^}]*--line:\s*#dedfd9/s);
    expect(src).toMatch(/\.sheet\s*\{[^}]*--accent:\s*#bb3035/s);
    expect(src).toMatch(/\.sheet\s*\{[^}]*--onaccent:\s*#ffffff/s);
  });

  it("pins frozen R1 dark roles tokens on themed .sheet", () => {
    expect(src).toMatch(
      /\[data-theme="dark"\]\)\s*\.sheet\s*\{[^}]*--surface:\s*#222523/s,
    );
    expect(src).toMatch(
      /\[data-theme="dark"\]\)\s*\.sheet\s*\{[^}]*--offset:\s*#2b2f2c/s,
    );
    expect(src).toMatch(
      /\[data-theme="dark"\]\)\s*\.sheet\s*\{[^}]*--ink:\s*#f1f0eb/s,
    );
    expect(src).toMatch(
      /\[data-theme="dark"\]\)\s*\.sheet\s*\{[^}]*--muted:\s*#b5b9b2/s,
    );
    expect(src).toMatch(
      /\[data-theme="dark"\]\)\s*\.sheet\s*\{[^}]*--line:\s*#454b45/s,
    );
    expect(src).toMatch(
      /\[data-theme="dark"\]\)\s*\.sheet\s*\{[^}]*--accent:\s*#f49391/s,
    );
    expect(src).toMatch(
      /\[data-theme="dark"\]\)\s*\.sheet\s*\{[^}]*--onaccent:\s*#271b1a/s,
    );
  });

  it("keeps close box 44×46 with R1 line-height 1.6 (22.4px at 14px)", () => {
    expect(src).toMatch(/\.closeBtn\s*\{[^}]*width:\s*44px/s);
    expect(src).toMatch(/\.closeBtn\s*\{[^}]*height:\s*46px/s);
    expect(src).toMatch(/\.closeBtn\s*\{[^}]*padding:\s*12px/s);
    expect(src).toMatch(/\.closeBtn\s*\{[^}]*border-radius:\s*10px/s);
    expect(src).toMatch(/\.closeBtn\s*\{[^}]*font-size:\s*14px/s);
    expect(src).toMatch(/\.closeBtn\s*\{[^}]*font-weight:\s*700/s);
    expect(src).toMatch(/\.closeBtn\s*\{[^}]*line-height:\s*1\.6/s);
    expect(src).not.toMatch(/\.closeBtn\s*\{[^}]*line-height:\s*1;/s);
  });

  it("preserves P15 shell gutters", () => {
    expect(src).toMatch(/padding:\s*19px/);
    expect(src).toMatch(/width:\s*min\(620px,\s*100%\)/);
  });
});
