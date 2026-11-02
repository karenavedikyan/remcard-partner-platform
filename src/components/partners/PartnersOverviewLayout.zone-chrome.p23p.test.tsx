import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PartnersOverviewLayout zone chrome (P23p)", () => {
  const css = readFileSync(path.join(__dirname, "PartnersOverviewLayout.module.css"), "utf8");

  it("matches frozen .panel.pr-zone radius (16px / --radius-lg) and head/body mobile padding", () => {
    const zoneBlock = css.match(/\.zone\s*\{[^}]+\}/)?.[0] ?? "";
    expect(zoneBlock).toMatch(/border-radius:\s*var\(--radius-lg,\s*16px\)/);
    expect(zoneBlock).toMatch(/gap:\s*var\(--space-5/);
    expect(zoneBlock).toMatch(/padding:\s*0/);

    const headBlock = css.match(/\.zoneHead,\s*\n\.waiting summary\s*\{[^}]+\}/)?.[0] ?? "";
    expect(headBlock).toMatch(
      /padding:\s*var\(--space-5,\s*1\.25rem\)\s+var\(--space-6,\s*1\.5rem\)\s+0/,
    );

    expect(css).toMatch(
      /@media\s*\(\s*max-width:\s*640px\s*\)[\s\S]*\.zoneHead[\s\S]*padding:\s*var\(--space-4\)\s+var\(--space-4\)\s+0/,
    );
  });
});
