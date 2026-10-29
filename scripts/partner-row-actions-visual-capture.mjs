#!/usr/bin/env node
/**
 * Isolated AgentPartnerCollection visual capture — synthetic fixtures only, no production API.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "artifacts/partner-row-actions-01/screenshots");
const baseUrl = "http://127.0.0.1:5201";

const ROW_SCENES = [
  { id: "incoming-agent", hash: "#/incoming-agent", ready: "Предложение агенту" },
  { id: "pending", hash: "#/pending", ready: "Принять условия" },
  { id: "active", hash: "#/active", ready: "Изменение условий" },
  { id: "cards", hash: "#/cards", ready: "Предложение агенту", useCardsGrid: true },
];

const DETAIL_SCENES = [
  {
    id: "detail-long-open",
    hash: "#/detail-long",
    viewportOnly: "375x500",
  },
];

const MATRIX = [
  { w: 375, h: 812, tag: "375" },
  { w: 1440, h: 900, tag: "1440" },
  { w: 375, h: 500, tag: "375x500" },
];

const THEMES = ["light", "dark"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
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

async function applyTheme(page, theme) {
  const sample = await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    const rootStyle = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    return {
      dataTheme: document.documentElement.getAttribute("data-theme"),
      cssBgToken: rootStyle.getPropertyValue("--bg").trim(),
      bodyBackground: bodyStyle.backgroundColor,
    };
  }, theme);
  if (sample.dataTheme !== theme) {
    throw new Error(`Failed to set data-theme=${theme}, got ${sample.dataTheme}`);
  }
  return sample;
}

async function captureRowScene(page, scene, tag, theme) {
  await page.goto(`${baseUrl}/${scene.hash}`, { waitUntil: "networkidle" });
  await applyTheme(page, theme);
  const scope = scene.useCardsGrid
    ? page.getByTestId("agent-r04-partners-cards")
    : page
        .locator(
          '[data-testid="agent-r04-partners-list"]:visible, [data-testid="agent-r04-partners-table"]:visible',
        )
        .first();
  await scope
    .locator('[data-testid="partner-row-inline-workflow"]:visible')
    .getByRole("button", { name: scene.ready })
    .first()
    .waitFor({ state: "visible", timeout: 15_000 });
  const file = `${scene.id}-${tag}-${theme}.png`;
  const filePath = path.join(outDir, file);
  await page.screenshot({ path: filePath, fullPage: true });
  return { scene: scene.id, viewport: tag, theme, file, sha256: sha256File(filePath) };
}

async function captureDetailScene(page, scene, tag, theme) {
  await page.goto(`${baseUrl}/${scene.hash}`, { waitUntil: "networkidle" });
  await applyTheme(page, theme);
  const nameButton = page.getByTestId("partner-row-name-button").first();
  await nameButton.waitFor({ state: "visible", timeout: 15_000 });
  await nameButton.click();
  const dialog = page.getByTestId("partner-partnership-detail-dialog");
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
  await page.getByTestId("partner-detail-close").waitFor({ state: "visible" });
  const box = await dialog.boundingBox();
  const file = `${scene.id}-${tag}-${theme}.png`;
  const filePath = path.join(outDir, file);
  await page.screenshot({ path: filePath, fullPage: false });
  return { scene: scene.id, viewport: tag, theme, file, sha256: sha256File(filePath), dialogBox: box };
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await startHarness();
  await waitForServer(baseUrl);

  const browser = await chromium.launch({ channel: "chromium" });
  const results = [];
  const themeSamples = {};

  try {
    for (const theme of THEMES) {
      for (const { w, h, tag } of MATRIX) {
        const context = await browser.newContext({
          viewport: { width: w, height: h },
        });
        const page = await context.newPage();
        themeSamples[`${tag}-${theme}`] = await applyTheme(page, theme);

        for (const scene of ROW_SCENES) {
          if (scene.id === "cards" && tag === "375x500") continue;
          results.push(await captureRowScene(page, scene, tag, theme));
        }

        for (const scene of DETAIL_SCENES) {
          if (scene.viewportOnly && tag !== scene.viewportOnly) continue;
          results.push(await captureDetailScene(page, scene, tag, theme));
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const pairs = [
    ["incoming-agent-1440-light.png", "incoming-agent-1440-dark.png"],
    ["detail-long-open-375x500-light.png", "detail-long-open-375x500-dark.png"],
  ];
  const themeDiff = pairs.map(([light, dark]) => {
    const l = results.find((r) => r.file === light);
    const d = results.find((r) => r.file === dark);
    return {
      light,
      dark,
      sha256Match: l && d ? l.sha256 === d.sha256 : null,
    };
  });

  fs.writeFileSync(
    path.join(repoRoot, "artifacts/partner-row-actions-01/capture-results.json"),
    JSON.stringify({ baseUrl, themeSamples, themeDiff, results }, null, 2),
  );
  console.log(`Saved ${results.length} screenshots to ${outDir}`);
  for (const diff of themeDiff) {
    console.log(`theme pair ${diff.light} vs ${diff.dark}: sha256Match=${diff.sha256Match}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
