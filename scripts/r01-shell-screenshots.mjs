#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const OUT_DIR =
  process.env.R01_ARTIFACT_DIR?.trim() ||
  "/opt/cursor/artifacts/remcard-r01/screenshots";
const PLATFORM_PORT = Number(process.env.R01_PLATFORM_PORT || 3012);
const REFERENCE_ROOT =
  process.env.R01_REFERENCE_ROOT?.trim() ||
  "/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard";
const BASE = `http://127.0.0.1:${PLATFORM_PORT}`;

const SHOTS = [
  { name: "impl-1440-light", url: `${BASE}/dev/r01-agent-shell`, width: 1440, height: 900, theme: "light" },
  { name: "impl-1440-dark", url: `${BASE}/dev/r01-agent-shell`, width: 1440, height: 900, theme: "dark" },
  { name: "impl-375-light", url: `${BASE}/dev/r01-agent-shell`, width: 375, height: 812, theme: "light" },
  { name: "impl-375-dark", url: `${BASE}/dev/r01-agent-shell`, width: 375, height: 812, theme: "dark" },
  { name: "impl-320-light-panel", url: `${BASE}/dev/r01-agent-shell`, width: 320, height: 700, theme: "light" },
  {
    name: "ref-1440-light",
    file: path.join(REFERENCE_ROOT, "roles.html"),
    hash: "#agent/home",
    width: 1440,
    height: 900,
    theme: "light",
  },
  {
    name: "ref-375-light",
    file: path.join(REFERENCE_ROOT, "roles.html"),
    hash: "#agent/home",
    width: 375,
    height: 812,
    theme: "light",
  },
];

function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(url, { redirect: "manual" });
        if (res.ok || res.status === 404 || res.status === 307) return resolve();
      } catch {
        /* retry */
      }
      if (Date.now() - start > timeoutMs) reject(new Error(`Server not ready: ${url}`));
      else setTimeout(tick, 500);
    };
    tick();
  });
}

async function ensurePlatformDev() {
  try {
    await waitForServer(`${BASE}/login`, 3000);
    return null;
  } catch {
    const child = spawn("npm", ["run", "dev", "--", "-p", String(PLATFORM_PORT)], {
      cwd: new URL("..", import.meta.url).pathname,
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    await waitForServer(`${BASE}/login`);
    return child;
  }
}

async function ensureReferenceServer() {
  const port = 8099;
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(`${base}/roles.html`, 2000);
    return base;
  } catch {
    const child = spawn("python3", ["-m", "http.server", String(port)], {
      cwd: REFERENCE_ROOT,
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    await waitForServer(`${base}/roles.html`);
    return base;
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await ensurePlatformDev();
  const refBase = await ensureReferenceServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: shot.width, height: shot.height },
      colorScheme: shot.theme,
    });
    const page = await context.newPage();
    try {
      const url = shot.url
        ? shot.url
        : `${refBase}/${path.basename(shot.file)}${shot.hash ?? ""}`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 90_000 });
      await page.waitForTimeout(shot.name.includes("320") ? 800 : 400);
      if (shot.name.includes("320")) {
        await page.getByRole("button", { name: "Ещё разделы" }).click();
        await page.getByRole("button", { name: "Настроить нижнюю панель" }).click();
        await page.waitForTimeout(300);
      }
      const out = path.join(OUT_DIR, `${shot.name}.png`);
      await page.screenshot({ path: out, fullPage: false });
      results.push({ name: shot.name, path: out, status: "PASS" });
    } catch (error) {
      results.push({
        name: shot.name,
        status: "FAIL",
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      await context.close();
    }
  }

  await browser.close();
  await writeFile(
    path.join(path.dirname(OUT_DIR), "TEST-RESULTS-screenshots.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2),
  );
  console.log(JSON.stringify({ outDir: OUT_DIR, results }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
