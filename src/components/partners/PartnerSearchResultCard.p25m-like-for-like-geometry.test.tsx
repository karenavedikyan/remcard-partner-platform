import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PartnerSearchResultCard P25m frozen-like geometry tokens", () => {
  it("matches frozen pr-terms list/heading/body micro-gaps on showcase card", () => {
    const css = fs.readFileSync(
      path.join(__dirname, "PartnerSearchResultCard.module.css"),
      "utf8",
    );
    expect(css).toMatch(/\.modalResultInlineTermsList\s*\{[^}]*gap:\s*4px;/s);
    expect(css).toMatch(/\.modalResultInlineTermsHead\s*\{[^}]*gap:\s*var\(--space-1,/s);
    expect(css).toMatch(/\.modalResultBody\s*\{[^}]*gap:\s*4px;/s);
  });
});
