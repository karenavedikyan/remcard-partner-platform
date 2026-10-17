#!/usr/bin/env node
/**
 * REGISTRATION-01 visual smoke with basic assertions (local stack required).
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "artifacts/remcard-registration-01/screenshots");
const BASE = process.env.REGISTRATION_VISUAL_BASE ?? "http://127.0.0.1:3000";

async function assertCtaContrast(page, selector) {
  const colors = await page.$eval(selector, (el) => {
    const s = getComputedStyle(el);
    return { color: s.color, background: s.backgroundColor };
  });
  const parse = (c) => c.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  const [fr, fg, fb] = parse(colors.color);
  const [br, bg, bb] = parse(colors.background);
  const lum = (r, g, b) => {
    const a = [r, g, b].map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const l1 = lum(fr, fg, fb);
  const l2 = lum(br, bg, bb);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  if (ratio < 3) {
    throw new Error(`CTA contrast too low (${ratio.toFixed(2)}): ${JSON.stringify(colors)}`);
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: true });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const page = await browser.newPage();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.emulateMedia({ colorScheme: "light" });
  await assertCtaContrast(page, 'a[class*="primaryBtn"]');
  await shot(page, "reg012-welcome-1440-light.png");

  await page.setViewportSize({ width: 375, height: 812 });
  await shot(page, "reg012-welcome-375-light.png");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  await assertCtaContrast(page, 'a[class*="primaryBtn"]');
  await shot(page, "reg012-welcome-375-dark.png");

  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (overflow) throw new Error("320px welcome horizontal overflow");
  await shot(page, "reg012-welcome-320-dark.png");

  await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await shot(page, "reg012-types-375-dark.png");

  await page.locator('label:has(input[value="agent"])').click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByLabel("Имя").fill("QA Visual");
  await shot(page, "reg012-data-375-dark.png");
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByLabel("Город").fill("Москва");
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await shot(page, "reg012-auth-375-dark.png");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await shot(page, "reg012-types-1440-light.png");

  await browser.close();
  const report = {
    base: BASE,
    capturedAt: new Date().toISOString(),
    files: [
      "reg012-welcome-1440-light.png",
      "reg012-welcome-375-light.png",
      "reg012-welcome-375-dark.png",
      "reg012-welcome-320-dark.png",
      "reg012-types-375-dark.png",
      "reg012-types-1440-light.png",
      "reg012-data-375-dark.png",
      "reg012-auth-375-dark.png",
    ],
    assertions: ["cta_contrast_light", "cta_contrast_dark", "no_320_overflow"],
  };
  await writeFile(path.join(ROOT, "artifacts/remcard-registration-01/visual-capture.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
