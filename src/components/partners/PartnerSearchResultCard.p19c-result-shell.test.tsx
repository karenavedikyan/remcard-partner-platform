import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");

describe("PartnerSearchResultCard P19c shell vs frozen R1 pr-showcase-main .pr-card", () => {
  it("keeps cover band contract from P19a/P19b (48px, 0 vertical, space-5 horizontal, 600/1.6)", () => {
    expect(css).toMatch(
      /\.modalResultCover\s*\{[^}]*height:\s*48px;[^}]*padding:\s*0\s+var\(--space-5/s,
    );
    expect(css).not.toMatch(
      /@media[\s\S]*\.modalResultCover\s*\{[^}]*padding:\s*0\s+(10|12)px/s,
    );
  });

  it("aligns identity row with frozen showcase (52px logo, 19px title, s5 horizontal insets)", () => {
    expect(css).toMatch(/\.modalResultTop\s*\{[^}]*margin:\s*0\s+var\(--space-5/s);
    expect(css).toMatch(/\.modalResultLogo\s*\{[^}]*width:\s*52px;[^}]*height:\s*52px/s);
    expect(css).toMatch(/\.modalResultLogo\s*\{[^}]*border-radius:\s*14px/s);
    expect(css).toMatch(/\.modalResultLogo\s*\{[^}]*font-size:\s*1\.125rem/s);
    expect(css).toMatch(/\.modalResultName\s*\{[^}]*font-size:\s*1\.1875rem/s);
    expect(css).toMatch(/\.modalResultName\s*\{[^}]*font-weight:\s*700/s);
    expect(css).not.toMatch(
      /@media\s*\(max-width:\s*680px\)[\s\S]*\.modalResultTop[\s\S]*padding:\s*0\s+12px/s,
    );
    expect(css).not.toMatch(
      /@media\s*\(max-width:\s*360px\)[\s\S]*\.modalResultTop[\s\S]*padding:\s*0\s+10px/s,
    );
  });

  it("aligns body directions and foot padding with frozen showcase", () => {
    expect(css).toMatch(/\.modalResultBody\s*\{[^}]*padding:\s*0\s+var\(--space-5/s);
    expect(css).toMatch(/\.modalResultDirectionsPrimary\s*\{[^}]*font-size:\s*0\.875rem/s);
    expect(css).toMatch(/\.modalResultDirectionsPrimary\s*\{[^}]*font-weight:\s*600/s);
    expect(css).toMatch(
      /\.modalResultFoot\s*\{[^}]*padding:\s*var\(--space-5[^}]*padding-top:\s*var\(--space-3/s,
    );
    expect(css).toMatch(/\.modalResultCard\s*\{[^}]*gap:\s*var\(--space-3/s);
  });
});
