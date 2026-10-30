#!/usr/bin/env node
/**
 * Synthetic visual capture for Admin Partners R1 parity.
 * Uses admin-mobile-visual-harness (mocked APIs only) — no production mutations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "artifacts/admin-partners-r1-parity/screenshots");
const baseUrl = "http://127.0.0.1:5198";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(400);
  }
  throw new Error(`Harness server did not start at ${url}`);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
  console.log("saved", name);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await createServer({
    configFile: path.join(repoRoot, "scripts/admin-mobile-visual-harness/vite.config.ts"),
    server: { port: 5198, host: "127.0.0.1", strictPort: true },
  });
  await server.listen();
  await waitForServer(baseUrl);

  const browser = await chromium.launch({
    executablePath: "/usr/local/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  for (const theme of ["light", "dark"]) {
    for (const { w, h, tag } of [
      { w: 1440, h: 900, tag: "1440" },
      { w: 375, h: 812, tag: "375" },
      { w: 320, h: 700, tag: "320" },
    ]) {
      const page = await browser.newPage({ viewport: { width: w, height: h } });
      await page.goto(`${baseUrl}/#/partners`, { waitUntil: "networkidle" });
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await page.getByTestId("partner-result-count").waitFor({ timeout: 20000 });
      await sleep(600);
      await shot(page, `fe-r1-partners-${theme}-${tag}.png`);

      if (tag === "1440" && theme === "light") {
        await page.getByRole("button", { name: /Открыть карточку/ }).first().click();
        await sleep(500);
        await shot(page, "fe-r1-partner-detail-light-1440.png");
        await page.keyboard.press("Escape");
        await sleep(300);

        const boxes = page.locator('tbody input[type="checkbox"]');
        if ((await boxes.count()) >= 2) {
          await boxes.nth(0).check();
          await boxes.nth(1).check();
          await sleep(300);
          await shot(page, "fe-r1-partners-bulk-light-1440.png");
        }
      }
      await page.close();
    }
  }

  await browser.close();
  await server.close();
  console.log("done", outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
