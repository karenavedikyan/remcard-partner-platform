import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");

describe("PartnerSearchResultCard P19a cover band vs frozen R1 pr-card-cover", () => {
  it("uses 48px cover height with horizontal padding and 600/1.6 type chrome", () => {
    expect(css).toMatch(
      /\.modalResultCover\s*\{[^}]*height:\s*48px;[^}]*min-height:\s*48px;[^}]*padding:\s*0\s+var\(--space-5/s,
    );
    expect(css).toMatch(/\.modalResultCover\s*\{[^}]*font-weight:\s*600;/s);
    expect(css).toMatch(/\.modalResultCover\s*\{[^}]*font-size:\s*12px;/s);
    expect(css).toMatch(/\.modalResultCover\s*\{[^}]*line-height:\s*1\.5;/s);
    expect(css).toMatch(
      /\.modalResultType\s*\{[^}]*font-size:\s*12px;[^}]*font-weight:\s*600;[^}]*line-height:\s*1\.5;/s,
    );
    expect(css).not.toMatch(/\.modalResultCover\s*\{[^}]*min-height:\s*44px/s);
  });
});
