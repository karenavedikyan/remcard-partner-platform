import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const cardCss = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");
const detailCss = readFileSync(
  path.join(__dirname, "PartnerFindDirectoryDetailShell.module.css"),
  "utf8",
);

const MIN_BODY_PX = 12;

describe("Partner card/detail font-contrast binding (≥12px body, theme tokens)", () => {
  it("does not declare 10px or 11px body typography in card or detail CSS modules", () => {
    for (const css of [cardCss, detailCss]) {
      expect(css).not.toMatch(/font-size:\s*10px/);
      expect(css).not.toMatch(/font-size:\s*11px/);
    }
  });

  it("keeps approved geometry: terms stack 27px / name 19px bold", () => {
    expect(cardCss).toMatch(/\.modalResultInlineTermsRange strong\s*\{[^}]*font-size:\s*27px/s);
    expect(cardCss).toMatch(/\.modalResultName\s*\{[^}]*font-size:\s*1\.1875rem/s);
    expect(cardCss).toMatch(/\.modalResultName\s*\{[^}]*font-weight:\s*700/s);
  });

  it("uses 12px px literals on card secondary/cover text selectors", () => {
    const px12Selectors = [
      ".modalResultCover",
      ".modalResultType",
      ".modalResultStages",
      ".modalResultOpenHint",
      ".modalResultFootNote",
      ".modalResultInlineTermsTitle",
      ".modalResultInlineTermsSub",
      ".modalResultInlineTermsList li",
    ];
    for (const sel of px12Selectors) {
      expect(cardCss).toMatch(new RegExp(`\\${sel}\\s*\\{[^}]*font-size:\\s*${MIN_BODY_PX}px`, "s"));
    }
  });

  it("routes secondary ink through theme tokens instead of frozen #5c605a", () => {
    expect(cardCss).not.toMatch(/#5c605a/i);
    expect(cardCss).toMatch(/--modal-result-secondary-fg:\s*var\(--muted\)/);
    expect(cardCss).toMatch(/\.modalResultFootNote[^}]*var\(--modal-result-secondary-fg\)/s);
  });

  it("themes store monogram for dark surfaces (not light tint + pink primary)", () => {
    expect(cardCss).toMatch(
      /:global\(\[data-theme="dark"\]\) \.modalResultLogoStore,[\s\S]*color:\s*var\(--ink\)/,
    );
  });

  it("themes specialist and neutral monograms on dark with readable ink", () => {
    expect(cardCss).toMatch(
      /:global\(\[data-theme="dark"\]\) \.modalResultLogoSpecialist,[\s\S]*color:\s*var\(--ink\)/,
    );
    expect(cardCss).toMatch(
      /:global\(\[data-theme="dark"\]\) \.modalResultLogoNeutral,[\s\S]*color:\s*var\(--ink\)/,
    );
  });

  it("uses 12px on detail general-terms badge (not --text-xs)", () => {
    expect(detailCss).toMatch(/\.generalTermsBadge\s*\{[^}]*font-size:\s*12px/s);
    expect(detailCss).not.toMatch(/\.generalTermsBadge\s*\{[^}]*font-size:\s*var\(--text-xs\)/s);
    expect(detailCss).toMatch(/\.generalTermsBadge\s*\{[^}]*color:\s*var\(--ink\)/s);
  });
});
