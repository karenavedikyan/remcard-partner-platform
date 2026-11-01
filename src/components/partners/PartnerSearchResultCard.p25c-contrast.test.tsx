import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");
const P25C_MARKER = "/* === P25c: cover-band + secondary small text ≥4.5:1";

describe("PartnerSearchResultCard P25c contrast appendix", () => {
  it("defines local cover foreground tokens instead of bare --muted on band labels", () => {
    const appendix = css.slice(css.indexOf(P25C_MARKER));
    expect(appendix).toMatch(/--modal-result-cover-fg:/);
    expect(appendix).toMatch(/\.modalResultType[^}]*var\(--modal-result-cover-fg\)/s);
    expect(appendix).toMatch(/\.modalResultOpenHint[^}]*var\(--modal-result-cover-fg\)/s);
    expect(appendix).toMatch(/\.modalResultFootNote[^}]*#5c605a/s);
  });
});
