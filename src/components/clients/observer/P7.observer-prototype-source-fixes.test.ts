import { readFileSync } from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "observer.module.css"), "utf8");
const globalsCss = readFileSync(path.resolve(__dirname, "../../../app/globals.css"), "utf8");

describe("P7 — prototype source fixes (3dc31836)", () => {
  it("personalTag chip, edit gap 16, sticky toolbar hook, note pre-wrap", () => {
    expect(css).toContain(".personalTag");
    expect(css).toMatch(/\.personalTag[\s\S]*?padding:\s*2px 8px/);
    expect(css).toMatch(/\.personalTag[\s\S]*?border-radius:\s*6px/);
    expect(css).toMatch(/\.editPanel,[\s\S]*?gap:\s*16px/);
    expect(css).toMatch(/scroll-margin-top:\s*190px/);
    expect(css).toMatch(/\.personalToolbar:has\(\[data-observer-action="clear"\]\)/);
    expect(css).toMatch(/\.personalNote[\s\S]{0,200}white-space:\s*pre-wrap/);
  });

  describe("computed @375/1440 container (Manrope + globals)", () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    }, 60_000);
    afterAll(async () => browser?.close());

    const html = (theme: string) => `<!DOCTYPE html><html data-theme="${theme}"><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap"/>
<style>${globalsCss}${css}</style></head><body>
<main style="padding:32px;max-width:1200px;background:var(--bg)"><div class="section">
<span class="personalTag" data-testid="tag">Моя метка</span>
</div></main></body></html>`;

    for (const [w, theme] of [
      [375, "light"],
      [1440, "dark"],
    ] as const) {
      it(`${w} ${theme}: personalTag chip geometry`, async () => {
        const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
        const page = await ctx.newPage();
        await page.setContent(html(theme), { waitUntil: "domcontentloaded" });
        await page.waitForFunction(() => document.fonts?.status === "loaded").catch(() => undefined);
        const tag = await page.getByTestId("tag").evaluate((el) => {
          const cs = getComputedStyle(el);
          return {
            fontSize: cs.fontSize,
            padding: cs.padding,
            borderRadius: cs.borderRadius,
            display: cs.display,
          };
        });
        expect(tag.fontSize).toBe("12px");
        expect(tag.padding).toBe("2px 8px");
        expect(tag.borderRadius).toBe("6px");
        expect(tag.display).toBe("block");
        await ctx.close();
      });
    }
  });
});
