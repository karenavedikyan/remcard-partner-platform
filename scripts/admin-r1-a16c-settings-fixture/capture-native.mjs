#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startUpstream } from "./upstream.mjs";

const FE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = process.env.A16C_NATIVE_OUT || path.join(FE_ROOT, "artifacts/admin-r1-a16c-settings/native");
const APP_PORT = Number(process.env.A16C_APP_PORT || 0);
let APP_URL = `http://127.0.0.1:4321`;

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      server.close(() => resolve(port));
    });
    server.on("error", reject);
  });
}

const MATRIX = [
  { tag: "1440-light", w: 1440, h: 900, theme: "light" },
  { tag: "1440-dark", w: 1440, h: 900, theme: "dark" },
  { tag: "375-light", w: 375, h: 812, theme: "light" },
  { tag: "375-dark", w: 375, h: 812, theme: "dark" },
  { tag: "320-light", w: 320, h: 812, theme: "light" },
  { tag: "320-dark", w: 320, h: 812, theme: "dark" },
  { tag: "320x600-dark", w: 320, h: 600, theme: "dark" },
];

async function qaFetch(base, pathname, init) {
  const res = await fetch(`${base}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  return res.json();
}

function waitForHttp(url, timeoutMs = 120_000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      http
        .get(url, (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        })
        .on("error", () => {
          if (Date.now() - start > timeoutMs) reject(new Error(`timeout ${url}`));
          else setTimeout(tick, 400);
        });
    };
    tick();
  });
}

async function ensureBuild() {
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "next", "build"], {
      cwd: FE_ROOT,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build ${code}`))));
  });
}

function startNext(upstreamBase, port) {
  const nextBin = path.join(FE_ROOT, "node_modules/next/dist/bin/next");
  const appUrl = `http://127.0.0.1:${port}`;
  return spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: FE_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      REMCARD_API_BASE_URL: upstreamBase,
      NEXT_PUBLIC_APP_URL: appUrl,
      REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN: "1",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    try {
      localStorage.setItem("remcard-theme", t);
    } catch {
      /* ignore opaque-origin / sandbox blocks */
    }
    document.documentElement.dataset.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, theme);
}

async function openSettingsModal(page) {
  await page.goto(`${APP_URL}/admin/notifications`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.getByRole("button", { name: "Настройки" }).click();
  await page.getByRole("heading", { name: "Уведомления администратора" }).waitFor({ timeout: 60_000 });
  await page
    .getByRole("dialog")
    .locator("h2#admin-notify-settings-title, [role=alert], fieldset")
    .first()
    .waitFor({ timeout: 60_000 });
}

async function measureSettings(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const dialog = document.querySelector("dialog[open]");
    const offenders = [];
    if (dialog) {
      for (const el of dialog.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width < 1) continue;
        if (r.right > vw + 1) {
          offenders.push({
            tag: el.tagName,
            className: typeof el.className === "string" ? el.className.slice(0, 80) : "",
            overflowPx: Math.round(r.right - vw),
          });
        }
      }
    }
    const buttons = [...(dialog?.querySelectorAll("button") ?? [])];
    const save = buttons.find((b) => b.textContent?.includes("Сохранить"));
    const saveRect = save?.getBoundingClientRect();
    return {
      doc: { scrollWidth: document.documentElement.scrollWidth, clientWidth: vw, innerHeight: vh },
      dialogOpen: Boolean(dialog),
      dialogTitle: dialog?.querySelector("h2")?.textContent?.trim() ?? null,
      saveInViewport: saveRect ? saveRect.bottom <= vh + 1 && saveRect.top >= -1 : null,
      offenders: offenders.slice(0, 8),
    };
  });
}

async function run() {
  await mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });
  if (process.env.A16C_SKIP_BUILD !== "1") await ensureBuild();

  const boundPort = APP_PORT > 0 ? APP_PORT : await getFreePort();
  APP_URL = `http://127.0.0.1:${boundPort}`;
  if (APP_PORT > 0) {
    try {
      execSync(`fuser -k ${boundPort}/tcp 2>/dev/null || true`, { stdio: "ignore" });
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 800));
  }

  const upstream = await startUpstream(0);
  const nextChild = startNext(upstream.baseUrl, boundPort);
  await waitForHttp(`${upstream.baseUrl}/__qa/log`);
  await waitForHttp(APP_URL);
  await new Promise((r) => setTimeout(r, 1500));

  const browser = await chromium.launch({ headless: true });
  const report = { matrix: [], scenarios: [], mutations: [] };

  for (const vp of MATRIX) {
    await qaFetch(upstream.baseUrl, "/__qa/reset", { method: "POST", body: "{}" });
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
    await openSettingsModal(page);
    await setTheme(page, vp.theme);
    const metrics = await measureSettings(page);
    report.matrix.push({ viewport: vp.tag, ...metrics });
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", `settings-default-${vp.tag}.png`),
      fullPage: false,
    });
    await context.close();
  }

  const scenarioDefs = [
    {
      id: "save-success",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.getByText("Настройки сохранены").waitFor({ timeout: 30_000 });
      },
    },
    {
      id: "save-error",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/scenario", {
          method: "POST",
          body: JSON.stringify({ scenario: "settings-save-fail" }),
        });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page
          .getByRole("dialog")
          .getByRole("alert")
          .filter({ hasText: /не удалось сохранить/i })
          .waitFor({ timeout: 30_000 });
      },
    },
    {
      id: "load-retry",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/scenario", {
          method: "POST",
          body: JSON.stringify({ scenario: "settings-load-fail" }),
        });
        await openSettingsModal(page);
        await page
          .getByRole("dialog")
          .getByRole("alert")
          .filter({ hasText: /не удалось загрузить настройки/i })
          .waitFor({ timeout: 30_000 });
        await qaFetch(base, "/__qa/scenario", { method: "POST", body: JSON.stringify({ scenario: "default" }) });
        await page.getByRole("button", { name: "Повторить" }).click();
        await page.getByRole("group", { name: "Категории" }).waitFor({ timeout: 30_000 });
      },
    },
    {
      id: "unlinked-channel",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openSettingsModal(page);
        await page.getByText(/не привязан — доставка недоступна/i).first().waitFor();
      },
    },
    {
      id: "save-busy",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/scenario", {
          method: "POST",
          body: JSON.stringify({ scenario: "default", settingsSaveDelayMs: 2500 }),
        });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.getByRole("button", { name: "Сохранение…" }).waitFor({ timeout: 5000 });
      },
    },
  ];

  for (const sc of scenarioDefs) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { Origin: APP_URL },
    });
    await context.addInitScript(() => {
      localStorage.setItem("remcard-theme", "light");
      document.documentElement.setAttribute("data-theme", "light");
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
    await sc.setup(page, upstream.baseUrl);
    report.scenarios.push({ id: sc.id, ok: true });
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", `settings-${sc.id}-1440-light.png`),
      fullPage: false,
    });
    await context.close();
  }

  const log = await qaFetch(upstream.baseUrl, "/__qa/log", { method: "GET" });
  report.mutations = (log.log || []).filter((e) => e.kind === "settings_patch");

  await browser.close();
  try {
    process.kill(-nextChild.pid, "SIGTERM");
  } catch {
    nextChild.kill("SIGTERM");
  }
  upstream.server.close();

  await writeFile(path.join(OUT_DIR, "native-metrics.json"), JSON.stringify(report, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
