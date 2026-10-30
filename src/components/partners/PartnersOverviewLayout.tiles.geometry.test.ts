import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PartnersOverviewLayout tile geometry contract", () => {
  const css = readFileSync(path.join(__dirname, "PartnersOverviewLayout.module.css"), "utf8");

  it("lets grid tiles shrink and wraps unbroken titles without shrinking below text-sm", () => {
    const tileBlock = css.match(/\.tile\s*\{[^}]+\}/)?.[0] ?? "";
    expect(tileBlock).toMatch(/min-width:\s*0/);
    expect(tileBlock).toMatch(/max-width:\s*100%/);

    const titleBlock = css.match(/\.tileTitle\s*\{[^}]+\}/)?.[0] ?? "";
    expect(titleBlock).toMatch(/font-size:\s*var\(--text-sm\)/);
    expect(titleBlock).toMatch(/overflow-wrap:\s*anywhere/);
    expect(titleBlock).not.toMatch(/ellipsis|line-clamp|text-overflow:\s*ellipsis|font-size:\s*0\./);
  });
});
