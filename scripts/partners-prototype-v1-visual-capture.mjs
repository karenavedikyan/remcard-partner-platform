#!/usr/bin/env node
/** LOCAL FIXTURE visual capture for partners-prototype-v1 — no production API. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "artifacts/partners-prototype-v1/screenshots");
const baseUrl = "http://127.0.0.1:5207";

const SCENES = [
  { id: "toolbar", hash: "#/toolbar" },
  { id: "repair-path", hash: "#/repair-path" },
  { id: "wizard", hash: "#/wizard" },
];
const MATRIX = [
  { w: 375, h: 812, tag: "375" },
  { w: 1440, h: 900, tag: "1440" },
];
const THEMES = ["light", "dark"];

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Harness did not start at ${url}`);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await createServer({
    configFile: path.join(repoRoot, "scripts/partners-prototype-v1-visual-harness/vite.config.ts"),
  });
  await server.listen(5207, "127.0.0.1");
  await waitForServer(baseUrl);

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const scene of SCENES) {
      for (const theme of THEMES) {
        for (const vp of MATRIX) {
          const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
          await page.emulateMedia({ colorScheme: theme });
          await page.goto(`${baseUrl}/${scene.hash}`, { waitUntil: "networkidle", timeout: 60_000 });
          await page.evaluate((t) => {
            document.documentElement.setAttribute("data-theme", t);
          }, theme);
          await page.waitForSelector('[data-testid="partners-proto-harness"]', { timeout: 30_000 });
          if (scene.id === "wizard") {
            await page.waitForSelector('[data-testid="partner-invite-wizard"]', { timeout: 15_000 });
          }
          const name = `${scene.id}-${vp.tag}-${theme}.png`;
          const filePath = path.join(outDir, name);
          await page.screenshot({ path: filePath, fullPage: true });
          results.push({ file: name, sha256: sha256File(filePath), scene: scene.id, theme, ...vp });
          await page.close();
        }
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const manifest = {
    kind: "LOCAL FIXTURE",
    note: "Synthetic harness screenshots — not live PROF",
    capturedAt: new Date().toISOString(),
    results,
  };
  fs.writeFileSync(
    path.join(repoRoot, "artifacts/partners-prototype-v1/capture-results.json"),
    JSON.stringify(manifest, null, 2),
  );
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
