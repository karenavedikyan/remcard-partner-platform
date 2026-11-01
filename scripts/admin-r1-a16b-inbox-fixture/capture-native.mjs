#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startUpstream } from "./upstream.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = process.env.A16B_NATIVE_OUT || path.join(ROOT, "artifacts/admin-r1-a16b-inbox/native");
const APP_PORT = Number(process.env.A16B_APP_PORT || 0);
let APP_URL = `http://127.0.0.1:4320`;

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
      http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      }).on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`timeout ${url}`));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

async function ensureBuild() {
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "next", "build", "--no-lint"], {
      cwd: ROOT,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build ${code}`))));
  });
}

function startNext(upstreamBase, port) {
  const nextBin = path.join(ROOT, "node_modules/next/dist/bin/next");
  const appUrl = `http://127.0.0.1:${port}`;
  return spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: ROOT,
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
    localStorage.setItem("remcard-theme", t);
    document.documentElement.dataset.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, theme);
}

async function measureInbox(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const offenders = [];
    for (const el of document.querySelectorAll(".inboxPanel, .inboxPanel *")) {
      const r = el.getBoundingClientRect();
      if (r.width < 1) continue;
      if (r.right > vw + 1) {
        offenders.push({
          tag: el.tagName,
          className: typeof el.className === "string" ? el.className.slice(0, 100) : "",
          overflowPx: Math.round(r.right - vw),
        });
      }
    }
    const unread = document.querySelector("li[data-unread]");
    const panel = document.querySelector("section[aria-label='Inbox администратора']");
    const title = document.querySelector("h1");
    const style = (el) => (el ? getComputedStyle(el) : null);
    const unreadSt = style(unread);
    const titleSt = style(title);
    return {
      doc: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerWidth: window.innerWidth,
      },
      inboxOffenders: offenders.slice(0, 8),
      unreadBg: unreadSt?.backgroundColor ?? null,
      titleFontSize: titleSt?.fontSize ?? null,
      panelPresent: Boolean(panel),
    };
  });
}

async function openNotifications(page) {
  await page.goto(`${APP_URL}/admin/notifications`, { waitUntil: "networkidle", timeout: 90_000 });
}

async function run() {
  await mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });
  if (process.env.A16B_SKIP_BUILD !== "1") await ensureBuild();

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
    await qaFetch(upstream.baseUrl, "/__qa/scenario", { method: "POST", body: JSON.stringify({ scenario: "default" }) });
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      extraHTTPHeaders: { Origin: APP_URL, Referer: `${APP_URL}/admin/notifications` },
    });
    await context.addCookies([
      { name: "remcard-token", value: "qa-a16a-session", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    await openNotifications(page);
    await setTheme(page, vp.theme);
    await page.getByRole("heading", { name: "Новый партнёр зарегистрирован", level: 3 }).waitFor({ timeout: 60_000 });
    const metrics = await measureInbox(page);
    report.matrix.push({ viewport: vp.tag, ...metrics });
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", `inbox-default-${vp.tag}.png`),
      fullPage: true,
    });
    await context.close();
  }

  // Scenario captures at 1440 light
  const scenarioDefs = [
    { id: "empty-unread", scenario: "empty", setup: async (page) => { await page.getByRole("checkbox", { name: /только непрочитанные/i }).click(); } },
    { id: "error-retry", scenario: "error", setup: async () => {} },
    { id: "long-content", scenario: "long", setup: async () => {} },
    { id: "paginate", scenario: "paginate", setup: async (page) => { await page.getByRole("checkbox", { name: /только непрочитанные/i }).click(); } },
  ];

  for (const sc of scenarioDefs) {
    await qaFetch(upstream.baseUrl, "/__qa/reset", { method: "POST", body: "{}" });
    await qaFetch(upstream.baseUrl, "/__qa/scenario", { method: "POST", body: JSON.stringify({ scenario: sc.scenario }) });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { Origin: APP_URL },
    });
    await context.addCookies([
      { name: "remcard-token", value: "qa-a16a-session", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    await openNotifications(page);
    await setTheme(page, "light");
    if (sc.setup) await sc.setup(page);
    if (sc.id === "error-retry") {
      await page.getByText("Synthetic upstream failure").waitFor({ timeout: 30_000 });
    } else if (sc.id === "empty-unread") {
      await page.getByText(/непрочитанных уведомлений нет/i).waitFor({ timeout: 30_000 });
    } else if (sc.id === "paginate") {
      await page.getByRole("heading", { name: "Страница 1 — непрочитанное" }).waitFor();
      await page.getByRole("button", { name: "Дальше" }).click();
      await page.getByRole("heading", { name: "Страница 2 — непрочитанное" }).waitFor();
    } else {
      await page.getByRole("heading", { level: 3 }).first().waitFor();
    }
    report.scenarios.push({ id: sc.id, ...(await measureInbox(page)) });
    await page.screenshot({ path: path.join(OUT_DIR, "screenshots", `inbox-${sc.id}-1440-light.png`), fullPage: true });
    await context.close();
  }

  // Synthetic mark-one / mark-all request counts
  await qaFetch(upstream.baseUrl, "/__qa/reset", { method: "POST", body: "{}" });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, extraHTTPHeaders: { Origin: APP_URL } });
  await ctx.addCookies([{ name: "remcard-token", value: "qa-a16a-session", domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" }]);
  const page = await ctx.newPage();
  await openNotifications(page);
  await page.getByRole("button", { name: "Прочитано" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Прочитать всё" }).click();
  const log = await qaFetch(upstream.baseUrl, "/__qa/log", { method: "GET" });
  report.mutations = (log.log || []).filter((e) => e.kind === "mark_one" || e.kind === "mark_all");
  await ctx.close();

  await browser.close();
  try {
    process.kill(-nextChild.pid, "SIGTERM");
  } catch {
    /* ignore */
  }
  upstream.server.close();

  await writeFile(path.join(OUT_DIR, "native-metrics.json"), JSON.stringify({ appUrl: APP_URL, ...report }, null, 2));
  console.log(JSON.stringify({ matrixCount: report.matrix.length, mutations: report.mutations.length }, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
