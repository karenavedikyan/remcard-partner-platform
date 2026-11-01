import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "PartnerSearchResultCard.module.css"), "utf8");

/** Same gate as native harness padding-check (px tolerance 0.5). */
export function coverPaddingMatchesFrozenR1(metrics: {
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
}) {
  const px = (v: string) => Number.parseFloat(v);
  const want = 20;
  const tol = 0.5;
  const sides = [
    px(metrics.paddingTop),
    px(metrics.paddingRight),
    px(metrics.paddingBottom),
    px(metrics.paddingLeft),
  ];
  if (sides[0] > tol || sides[2] > tol) {
    return { ok: false, reason: "vertical_padding_nonzero" };
  }
  if (Math.abs(sides[1] - want) > tol || Math.abs(sides[3] - want) > tol) {
    return { ok: false, reason: "horizontal_padding_not_20px" };
  }
  return { ok: true as const };
}

describe("PartnerSearchResultCard P19b cover horizontal padding vs frozen R1", () => {
  it("does not shrink .modalResultCover padding at mobile breakpoints", () => {
    expect(css).not.toMatch(/@media\s*\(max-width:\s*680px\)[\s\S]*\.modalResultCover[\s\S]*padding:\s*0\s+12px/s);
    expect(css).not.toMatch(/@media\s*\(max-width:\s*360px\)[\s\S]*\.modalResultCover[\s\S]*padding:\s*0\s+10px/s);
    expect(css).not.toMatch(
      /@media[\s\S]*\.modalResultCover\s*\{[^}]*padding:\s*0\s+(10|12)px/s,
    );
  });

  it("padding-check rejects P19a mobile metrics (12/10px) and accepts 20px horizontal", () => {
    expect(
      coverPaddingMatchesFrozenR1({
        paddingTop: "0px",
        paddingRight: "12px",
        paddingBottom: "0px",
        paddingLeft: "12px",
      }).ok,
    ).toBe(false);
    expect(
      coverPaddingMatchesFrozenR1({
        paddingTop: "0px",
        paddingRight: "10px",
        paddingBottom: "0px",
        paddingLeft: "10px",
      }).ok,
    ).toBe(false);
    expect(
      coverPaddingMatchesFrozenR1({
        paddingTop: "0px",
        paddingRight: "20px",
        paddingBottom: "0px",
        paddingLeft: "20px",
      }).ok,
    ).toBe(true);
  });
});
