import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Directory detail canonical theme ink", () => {
  const css = readFileSync(
    path.resolve(__dirname, "PartnerFindDirectoryDetailShell.module.css"),
    "utf8",
  );

  it("uses the app's light/dark ink token for Back and public percentages", () => {
    expect(css).toMatch(/\.backButton\s*\{[^}]*color:\s*var\(--ink\);/);
    expect(css).toMatch(/\.termSummary span\s*\{[^}]*color:\s*var\(--ink\);/);
    expect(css).not.toContain("var(--text, var(--fg, #1a1a1a))");
  });
});
