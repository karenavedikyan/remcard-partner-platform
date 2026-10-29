#!/usr/bin/env node
/**
 * Isolated AgentPartnerCollection visual capture — synthetic fixtures only, no production API.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "artifacts/partner-row-actions-01/screenshots");
const baseUrl = "http://127.0.0.1:5201";

const SCENES = [
  { id: "incoming-agent", hash: "#/incoming-agent", ready: "Предложение агенту" },
  { id: "pending", hash: "#/pending", ready: "Принять условия" },
  { id: "active", hash: "#/active", ready: "Изменение условий" },
  { id: "cards", hash: "#/cards", ready: "Предложение агенту", useCardsGrid: true },
];

const MATRIX = [
  { w: 375, h: 812, tag: "375" },
  { w: 1440, h: 900, tag: "1440" },
];

const THEMES = ["light", "dark"];

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

async function startHarness() {
  const server = await createServer({
    configFile: path.join(repoRoot, "scripts/partner-row-actions-visual-harness/vite.config.ts"),
  });
  await server.listen(5201, "127.0.0.1");
  return server;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await startHarness();
  await waitForServer(baseUrl);

  const browser = await chromium.launch();
  const results = [];

  try {
    for (const theme of THEMES) {
      for (const { w, h, tag } of MATRIX) {
        const context = await browser.newContext({
          viewport: { width: w, height: h },
          colorScheme: theme,
        });
        const page = await context.newPage();

        for (const scene of SCENES) {
          await page.goto(`${baseUrl}/${scene.hash}`, { waitUntil: "networkidle" });
          const scope = scene.useCardsGrid
            ? page.getByTestId("agent-r04-partners-cards")
            : page.locator('[data-testid="agent-r04-partners-list"]:visible, [data-testid="agent-r04-partners-table"]:visible').first();
          await scope
            .locator('[data-testid="partner-row-inline-workflow"]:visible')
            .getByRole("button", { name: scene.ready })
            .first()
            .waitFor({ state: "visible", timeout: 15_000 });
          const file = `${scene.id}-${tag}-${theme}.png`;
          await page.screenshot({ path: path.join(outDir, file), fullPage: true });
          results.push({ scene: scene.id, viewport: tag, theme, file });
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  fs.writeFileSync(
    path.join(repoRoot, "artifacts/partner-row-actions-01/capture-results.json"),
    JSON.stringify({ baseUrl, results }, null, 2),
  );
  console.log(`Saved ${results.length} screenshots to ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
