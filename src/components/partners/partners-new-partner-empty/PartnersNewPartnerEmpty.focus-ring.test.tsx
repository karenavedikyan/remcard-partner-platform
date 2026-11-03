import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PartnersNewPartnerEmpty focus ring (source binding)", () => {
  const css = readFileSync(path.join(__dirname, "PartnersNewPartnerEmpty.module.css"), "utf8");

  const focusBlock =
    css.match(
      /\.primaryBtn:focus-visible,\s*\n\.ghostBtn:focus-visible\s*\{[^}]+\}/,
    )?.[0] ?? "";

  it("uses opaque accent token for 3px focus outline without alpha", () => {
    expect(focusBlock).toContain("outline: 3px solid var(--accent, var(--primary));");
    expect(focusBlock).toContain("outline-offset: 3px;");
    expect(focusBlock).not.toMatch(/color-mix/i);
    expect(focusBlock).not.toMatch(/transparent|rgba\(|hsla\(|\/\s*\d|opacity:/i);
  });
});
