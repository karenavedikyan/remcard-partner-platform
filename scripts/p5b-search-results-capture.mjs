#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "artifacts/partners-search-results-p5b/screenshots");
const resultsPath = path.join(repoRoot, "artifacts/partners-search-results-p5b/capture-results.json");
const baseUrl = "http://127.0.0.1:5261";

fs.mkdirSync(outDir, { recursive: true });

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url) {
  const start = Date.now();
  while (Date.now() - start < 60000) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* retry */
    }
    await sleep(300);
  }
  throw new Error("timeout waiting for harness");
}

const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "375", width: 375, height: 812 },
  { name: "320", width: 320, height: 720 },
];
const themes = ["light", "dark"];
const scenes = ["results", "long", "empty", "error"];

const vite = await createServer({
  configFile: path.join(__dirname, "p5b-search-results-harness/vite.config.ts"),
  root: path.join(__dirname, "p5b-search-results-harness"),
});
await vite.listen();
await waitForServer(baseUrl);

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const theme of themes) {
    for (const vp of viewports) {
      for (const scene of scenes) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
          colorScheme: theme === "dark" ? "dark" : "light",
        });
        await page.addInitScript((t) => {
          document.documentElement.setAttribute("data-theme", t);
          if (t === "dark") document.documentElement.classList.add("dark");
        }, theme);
        await page.goto(`${baseUrl}/?scene=${scene}`, { waitUntil: "networkidle" });
        await page.waitForSelector('[data-testid="agent-r04-modal-find"]', { timeout: 15000 });
        if (scene !== "loading") {
          const findBtn = page.getByRole("button", { name: "Найти" });
          if (await findBtn.count()) {
            await findBtn.click();
          }
        }
        if (scene === "results" || scene === "long") {
          await page.waitForSelector('[data-testid="agent-partner-search-result-card"]', {
            timeout: 15000,
          });
        } else if (scene === "empty") {
          await page.waitForSelector('[data-testid="agent-partner-search-empty"]', {
            timeout: 15000,
          });
        } else if (scene === "error") {
          await page.waitForSelector('[data-testid="agent-partner-search-error"]', {
            timeout: 15000,
          });
        }
        await sleep(250);
        const file = `p5b-${vp.name}-${theme}-${scene}.png`;
        await page.screenshot({
          path: path.join(outDir, file),
          fullPage: true,
        });
        const meta = await page.evaluate(() => {
          const cards = document.querySelectorAll(
            '[data-testid="agent-partner-search-result-card"]',
          );
          const count = document.querySelector('[data-testid="agent-partner-search-count"]');
          const firstName = document.querySelector(
            '[data-testid="agent-partner-search-result-name"]',
          );
          return {
            cardCount: cards.length,
            countText: count?.textContent?.trim() || null,
            firstName: firstName?.textContent?.trim() || null,
            overflowName: firstName
              ? firstName.scrollWidth > firstName.clientWidth + 1
              : null,
          };
        });
        results.push({ file, theme, viewport: vp.name, scene, ...meta });

        if (scene === "results" && vp.name === "1440" && theme === "light") {
          await page.locator('[data-testid="agent-partner-search-result-invite"]').first().click();
          await page.waitForSelector('[data-testid="partner-invite-dialog"], dialog, [role="dialog"]', {
            timeout: 10000,
          }).catch(() => null);
          await sleep(200);
          await page.screenshot({
            path: path.join(outDir, "p5b-1440-light-invite-open.png"),
            fullPage: true,
          });
          results.push({
            file: "p5b-1440-light-invite-open.png",
            theme,
            viewport: vp.name,
            scene: "invite-open",
          });
        }
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  await vite.close();
}

fs.writeFileSync(resultsPath, JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
console.log(JSON.stringify({ outDir, count: results.length }, null, 2));
