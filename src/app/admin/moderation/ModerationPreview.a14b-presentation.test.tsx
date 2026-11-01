/** @vitest-environment jsdom */
/**
 * A14b: short-wide preview dialog cap + mobile footer contract (org + partner CSS).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ORG_CSS = path.join(
  __dirname,
  "organizations/[id]/OrganizationModerationDetail.r1.module.css",
);
const PARTNER_CSS = path.join(__dirname, "partners/[id]/PartnerModerationDetail.module.css");

function shortHeightBlock(css: string) {
  const m = css.match(/@media \(max-height:\s*640px\)\s*\{[\s\S]*?\.previewDialog\s*\{[\s\S]*?\}\s*\}/);
  expect(m).toBeTruthy();
  return m![0];
}

describe("Moderation preview A14b short-wide regression guard", () => {
  it("preserves min(610px) cap in max-height media (no full-viewport width stretch)", () => {
    for (const file of [ORG_CSS, PARTNER_CSS]) {
      const block = shortHeightBlock(readFileSync(file, "utf8"));
      expect(block).toMatch(/width:\s*min\(610px,\s*calc\(100vw\s*-\s*32px\)\)/);
      expect(block).not.toMatch(/width:\s*calc\(100vw\s*-\s*8px\)/);
      expect(block).toMatch(/max-height:\s*calc\(100dvh\s*-\s*8px\)/);
    }
  });

  it("keeps A14a mobile footer full-width dismiss at max-width 760px", () => {
    for (const file of [ORG_CSS, PARTNER_CSS]) {
      const css = readFileSync(file, "utf8");
      expect(css).toMatch(
        /@media \(max-width:\s*760px\)[\s\S]*\.previewFooter button[\s\S]*width:\s*100%/,
      );
    }
  });
});
