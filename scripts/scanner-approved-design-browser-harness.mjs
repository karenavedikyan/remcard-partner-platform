/**
 * Renders actual scanner design components in Chromium with globals.css (no API calls).
 * Usage: node scripts/scanner-approved-design-browser-harness.mjs
 */
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "artifacts/scanner-approved-design-harness");
mkdirSync(outDir, { recursive: true });

const port = 4320;
const vite = spawn(
  "npx",
  ["vite", "--config", "scanner-design-harness/vite.config.ts", "--port", String(port), "--strictPort"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);

function waitForReady() {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("vite timeout")), 30_000);
    vite.stdout.on("data", (chunk) => {
      const text = String(chunk);
      if (text.includes(String(port))) {
        clearTimeout(t);
        resolve(undefined);
      }
    });
    vite.stderr.on("data", (chunk) => process.stderr.write(chunk));
    vite.on("error", reject);
  });
}

try {
  await waitForReady();
  const browser = await chromium.launch({ headless: true });
  const shots = [
    { name: "desktop-light", width: 1280, height: 900, theme: "light" },
    { name: "desktop-dark", width: 1280, height: 900, theme: "dark" },
    { name: "mobile-light", width: 390, height: 844, theme: "light" },
    { name: "mobile-dark", width: 390, height: 844, theme: "dark" },
  ];

  for (const shot of shots) {
    const page = await browser.newPage({ viewport: { width: shot.width, height: shot.height } });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle", timeout: 60_000 });
    if (shot.theme === "dark") {
      await page.evaluate(() => {
        document.getElementById("scanner-design-harness")?.setAttribute("data-theme", "dark");
      });
    }
  await page.getByTestId("purchase-review-dialog").waitFor({ timeout: 15_000 });
    await page.screenshot({ path: path.join(outDir, `${shot.name}.png`), fullPage: true });
    await page.close();
  }
  await browser.close();
  console.log(`[scanner-harness] screenshots -> ${outDir}`);
} finally {
  vite.kill("SIGTERM");
}
