import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("PartnersHub find prototype CSS hooks (author QA vs partners-redesign.css)", () => {
  const css = readFileSync(path.join(__dirname, "PartnersHub.module.css"), "utf8");

  it("matches prototype search box geometry (48px field, 18px icon, 10px radius)", () => {
    expect(css).toMatch(/\.findSearchBox input \{[^}]*min-height:\s*48px/s);
    expect(css).toMatch(/\.findSearchBox \{[^}]*min-height:\s*52px/s);
    expect(css).toMatch(/\.findSearchIcon \{[^}]*width:\s*18px/s);
    expect(css).toMatch(/\.findSearchBox \{[^}]*border-radius:\s*10px/s);
  });

  it("matches showcase heading scale (24px/800 desktop, 22px mobile)", () => {
    expect(css).toMatch(/\.findHeading h2 \{[^}]*font-size:\s*24px/s);
    expect(css).toMatch(/\.findHeading h2 \{[^}]*font-weight:\s*800/s);
    expect(css).toMatch(/@media \(max-width: 760px\)[\s\S]*\.findHeading h2[\s\S]*font-size:\s*22px/s);
  });

  it("keeps showcase grid rail widths aligned to prototype layout", () => {
    expect(css).toMatch(/\.findShowcase \{[^}]*grid-template-columns:\s*236px/s);
    expect(css).toMatch(/@media \(max-width: 1000px\)[\s\S]*\.findShowcase[\s\S]*200px/s);
  });
});
