#!/usr/bin/env node
/**
 * Browser geometry + real clicks for grouped client rows (auditor replay).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const harnessDir = path.join(__dirname, "observer-list-harness");
const outDir = path.join(repoRoot, "src/lib/clients-parity/audit");
const outPath = path.join(outDir, "mobile-client-row-computed.json");

const WIDTHS = [768, 375, 360, 320];
const MIN_W = 48;
const MIN_H = 44;

function gitSha() {
  return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
}

const server = await createServer({
  configFile: path.join(harnessDir, "vite.config.ts"),
  root: harnessDir,
  server: { port: 5378, host: "127.0.0.1", strictPort: false },
});
await server.listen();
const baseUrl = server.resolvedUrls?.local[0] ?? "http://127.0.0.1:5378";

const browser = await chromium.launch();
const records = [];
let allPass = true;

for (const innerWidth of WIDTHS) {
  const context = await browser.newContext({ viewport: { width: innerWidth, height: 812 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/?theme=dark`, { waitUntil: "networkidle" });
  await page.getByLabel(/Открыть партнёра:.*Бета/).click();
  const row = page.getByTestId("ca-observer-partner-page").getByTestId("ca-observer-client-row").first();
  const openBtn = row.locator("button").first();
  const box = await openBtn.boundingBox();
  const gridTemplateColumns = await row.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  const rowParity = await row.evaluate((rowEl) => {
    const status = rowEl.querySelector('[class*="personalStatus"]');
    const updated = rowEl.querySelector('[class*="clientUpdated"]');
    const cs = getComputedStyle(rowEl);
    const sY = status?.getBoundingClientRect().top;
    const uY = updated?.getBoundingClientRect().top;
    return {
      gridTemplateAreas: cs.gridTemplateAreas,
      topDelta: sY != null && uY != null ? Math.abs(sY - uY) : null,
    };
  });
  const parityPass =
    rowParity.gridTemplateAreas === "none" &&
    rowParity.topDelta != null &&
    rowParity.topDelta <= 1;
  const geometryPass = Boolean(
    box &&
      box.width >= MIN_W &&
      box.height >= MIN_H &&
      !/^24px\s+0px/.test(gridTemplateColumns) &&
      parityPass,
  );
  if (!geometryPass) allPass = false;
  let navigationPass = false;
  try {
    await openBtn.click({ timeout: 5000 });
    navigationPass = await page.getByTestId("ca-observer-client-page").isVisible();
    if (!navigationPass) allPass = false;
  } catch {
    allPass = false;
  }
  records.push({
    innerWidth,
    theme: "dark",
    selector: "[data-testid=ca-observer-partner-page] [data-testid=ca-observer-client-row]",
    gridTemplateColumns,
    rowParity,
    parityPass,
    openButton: box
      ? { x: box.x, y: box.y, width: box.width, height: box.height }
      : null,
    geometryPass,
    navigationPass,
    pass: geometryPass && navigationPass,
  });
  await context.close();
}

await browser.close();
await server.close();

fs.mkdirSync(outDir, { recursive: true });
const payload = {
  measuredAt: new Date().toISOString(),
  candidateSha: gitSha(),
  prototypeReferenceSha: "3dc31836cd18d9209c20097f18b906dd276f7af6",
  harness: "scripts/clients-parity-20261113/observer-list-harness",
  viewportHeight: 812,
  records,
  allPass,
};
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${outPath} (allPass=${allPass})`);
process.exit(allPass ? 0 : 1);
