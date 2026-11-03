import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");

describe("PartnerSearchResultCard P25t narrow hub column layout", () => {
  it("uses inline-size container queries for card-local narrow responsiveness", () => {
    expect(css).toMatch(/\.modalResultCard\s*\{[^}]*container-type:\s*inline-size/s);
    expect(css).toMatch(/container-name:\s*partner-result-card/s);
    expect(css).toMatch(/@container partner-result-card \(max-width:\s*280px\)/s);
  });

  it("stacks footer controls without clipping detail vs ACTIVE/PENDING badge", () => {
    const block = css.slice(css.indexOf("@container partner-result-card (max-width: 280px)"));
    expect(block).toMatch(/\.modalResultFoot\s*\{[^}]*flex-direction:\s*column/s);
    expect(block).toMatch(/\.modalResultFootDetailLink[^}]*overflow-wrap:\s*anywhere/s);
    expect(block).toMatch(/\.modalResultFootStatus\s*\{[^}]*margin-left:\s*0/s);
  });

  it("prevents horizontal article overflow from terms row flex-basis", () => {
    const block = css.slice(css.indexOf("@container partner-result-card (max-width: 280px)"));
    expect(block).toMatch(
      /\.modalResultInlineTermsList li span:first-child\s*\{[^}]*flex:\s*1 1 auto/s,
    );
    expect(css).toMatch(/\.modalResultCard\s*\{[^}]*overflow-x:\s*clip/s);
  });
});
