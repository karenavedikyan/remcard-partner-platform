#!/usr/bin/env node
/**
 * Native compiled Next.js evidence for A16a notifications presentation.
 * Synthetic upstream only; paired with frozen R1 prototype captures.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startUpstream } from "./upstream.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = process.env.A16A_QA_OUT || path.join(ROOT, "artifacts/admin-r1-a16a-notifications/native");
const SHOT_DIR = path.join(OUT_DIR, "compiled");
const APP_PORT = Number(process.env.A16A_APP_PORT || 4320);
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const SKIP_BUILD = process.env.A16A_SKIP_BUILD === "1";

const MATRIX = [
  { tag: "1440-light", w: 1440, h: 900, theme: "light" },
  { tag: "1440-dark", w: 1440, h: 900, theme: "dark" },
  { tag: "375-light", w: 375, h: 812, theme: "light" },
  { tag: "375-dark", w: 375, h: 812, theme: "dark" },
  { tag: "320-light", w: 320, h: 812, theme: "light" },
  { tag: "320-dark", w: 320, h: 812, theme: "dark" },
];

function waitForHttp(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`timeout ${url}`));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

async function ensureBuild() {
  if (SKIP_BUILD) return;
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "next", "build", "--no-lint"], {
      cwd: ROOT,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build ${code}`))));
  });
}

function startNext(upstreamBase) {
  const nextBin = path.join(ROOT, "node_modules/next/dist/bin/next");
  const child = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(APP_PORT)], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(APP_PORT),
      REMCARD_API_BASE_URL: upstreamBase,
      NEXT_PUBLIC_APP_URL: APP_URL,
      REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  child.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  return child;
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("remcard-theme", t);
    document.documentElement.dataset.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, theme);
}

async function run() {
  await mkdir(SHOT_DIR, { recursive: true });
  await ensureBuild();
  const upstream = await startUpstream(0);
  const nextChild = startNext(upstream.baseUrl);
  await waitForHttp(`${upstream.baseUrl}/__qa/log`);
  await waitForHttp(APP_URL);

  const browser = await chromium.launch({ headless: true });
  const metrics = [];

  for (const vp of MATRIX) {
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      extraHTTPHeaders: { Origin: APP_URL, Referer: `${APP_URL}/admin/notifications` },
    });
    await context.addCookies([
      {
        name: "remcard-token",
        value: "qa-a16a-session",
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    await page.goto(`${APP_URL}/admin/notifications`, { waitUntil: "networkidle", timeout: 90_000 });
    await setTheme(page, vp.theme);
    await page.getByRole("heading", { name: "Новый партнёр зарегистрирован", level: 3 }).waitFor({ timeout: 60_000 });
    const rowMetrics = await page.evaluate(() => {
      const unread = document.querySelector("li[data-unread]");
      const read = document.querySelector("li:not([data-unread])");
      const pick = (el) =>
        el
          ? {
              bg: getComputedStyle(el).backgroundColor,
              border: getComputedStyle(el).borderTopColor,
            }
          : null;
      const doc = document.documentElement;
      return {
        unread: pick(unread),
        read: pick(read),
        overflow: doc.scrollWidth <= window.innerWidth + 1,
      };
    });
    metrics.push({ viewport: vp.tag, ...rowMetrics });
    await page.screenshot({ path: path.join(SHOT_DIR, `after-${vp.tag}.png`), fullPage: true });
    await context.close();
  }

  await browser.close();
  try {
    process.kill(-nextChild.pid, "SIGTERM");
  } catch {
    /* ignore */
  }
  upstream.server.close();

  await writeFile(path.join(OUT_DIR, "compiled-metrics.json"), JSON.stringify({ metrics, appUrl: APP_URL }, null, 2));
  console.log(JSON.stringify(metrics, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
