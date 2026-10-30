import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("ActivePartnerListFilters error contrast token", () => {
  it("uses theme-aware accent-emphasis/primary, not unset --danger fallback", () => {
    const css = readFileSync(
      path.join(__dirname, "ActivePartnerListFilters.module.css"),
      "utf8",
    );
    const errorBlock = css.match(/\.error\s*\{[^}]+\}/)?.[0] ?? "";
    const colorLine = errorBlock
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("color:"));
    expect(colorLine).toBe("color: var(--accent-emphasis, var(--primary));");
  });
});
