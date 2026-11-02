import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ordinary partner sidebar prototype geometry", () => {
  it("packs grid rows at the top and allows short-window scrolling without changing links", () => {
    const css = readFileSync(path.join(__dirname, "AppShell.module.css"), "utf8");
    const nav = css.match(/\.nav\s*\{[^}]+\}/)?.[0] ?? "";
    expect(nav).toMatch(/align-content:\s*start/);
    expect(nav).toMatch(/min-height:\s*0/);
    expect(nav).toMatch(/overflow-y:\s*auto/);
    expect(css).toMatch(/\.navLink\s*\{[^}]*min-height:\s*46px/);
  });
});
