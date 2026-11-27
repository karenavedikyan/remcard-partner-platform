/**
 * Partner 1C catalog stage-1 screenshots vs prototype viewports.
 * Usage: PARTNER_1C_CATALOG_ENABLED=1 npm run dev & node scripts/catalog-stage1-capture.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "../artifacts/catalog-reference/out");
const base = process.env.CATALOG_CAPTURE_BASE ?? "http://127.0.0.1:3000";

const viewports = [
  { name: "1386x719", width: 1386, height: 719 },
  { name: "1460x833", width: 1460, height: 833 },
  { name: "390x844", width: 390, height: 844 },
];

const pages = [
  { slug: "catalog-owner", url: "/catalog/dev-fixture?role=owner" },
  { slug: "catalog-employee", url: "/catalog/dev-fixture?role=employee" },
  { slug: "client-seller", url: "/preview/client-catalog/s6" },
  { slug: "client-product", url: "/preview/client-catalog/p/p004" },
];

fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ locale: "ru-RU" });

for (const theme of ["light", "dark"]) {
  for (const vp of viewports) {
    const page = await context.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.emulateMedia({ colorScheme: theme });
    for (const p of pages) {
      await page.goto(`${base}${p.url}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForTimeout(400);
      const file = path.join(outDir, `${p.slug}_${vp.name}_${theme}.png`);
      await page.screenshot({ path: file, fullPage: false });
    }
    await page.close();
  }
}

await browser.close();
console.log("Screenshots saved to", outDir);