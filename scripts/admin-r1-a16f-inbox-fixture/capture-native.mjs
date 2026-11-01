#!/usr/bin/env node
import { spawn, execSync } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startUpstream } from "./upstream.mjs";

const FE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = process.env.A16F_NATIVE_OUT || path.join(FE_ROOT, "artifacts/admin-r1-a16f-inbox/native");
const APP_PORT = Number(process.env.A16F_APP_PORT || 0);
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

async function openNotifications(page) {
  await page.goto(`${APP_URL}/admin/notifications`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.getByRole("heading", { name: "Уведомления" }).waitFor({ timeout: 60_000 });
}

async function logMetrics(base) {
  const log = await qaFetch(base, "/__qa/log", { method: "GET" });
  const rows = log.log || [];
  return {
    unreadCount: log.unreadCount,
    markOne: rows.filter((e) => e.kind === "mark_one").length,
    markAll: rows.filter((e) => e.kind === "mark_all").length,
    list: rows.filter((e) => e.kind === "list").length,
  };
}

async function measureMarkAllButton(page) {
  await page.evaluate(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  return page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      (b.textContent || "").includes("Прочитать всё"),
    );
    if (!btn) return { found: false };
    const st = getComputedStyle(btn);
    return {
      found: true,
      backgroundColor: st.backgroundColor,
      color: st.color,
      borderTopWidth: st.borderTopWidth,
    };
  });
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

async function patchCount(base) {
  const log = await qaFetch(base, "/__qa/log", { method: "GET" });
  return (log.log || []).filter((e) => e.kind === "settings_patch").length;
}

async function run() {
  await mkdir(path.join(OUT_DIR, "screenshots"), { recursive: true });
  if (process.env.A16F_SKIP_BUILD !== "1") await ensureBuild();

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
  const buildId = await readFile(path.join(FE_ROOT, ".next/BUILD_ID"), "utf8").catch(() => "");
  const report = { buildId: buildId.trim(), matrix: [], scenarios: [], mutations: [], inbox: [] };

  // --- Inbox stateful scenarios (1440 light) ---
  const inboxScenarioDefs = [
    {
      id: "inbox-mark-one-persists",
      run: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openNotifications(page);
        const before = await logMetrics(base);
        await page.getByRole("button", { name: "Прочитано" }).first().click();
        await page.waitForFunction(() => {
          const unreadRows = document.querySelectorAll("li[data-unread]");
          return unreadRows.length === 2;
        });
        const after = await logMetrics(base);
        await page.reload({ waitUntil: "networkidle" });
        await page.waitForFunction(() => document.querySelectorAll("li[data-unread]").length === 2);
        return {
          markOneDelta: after.markOne - before.markOne,
          unreadAfter: after.unreadCount,
          unreadRowsAfterReload: await page.evaluate(() => document.querySelectorAll("li[data-unread]").length),
        };
      },
    },
    {
      id: "inbox-mark-all-unread-empty",
      run: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openNotifications(page);
        await page.getByRole("checkbox", { name: /только непрочитанные/i }).click();
        await page.getByRole("button", { name: "Прочитать всё" }).click();
        await page.getByText(/непрочитанных уведомлений нет/i).waitFor({ timeout: 30_000 });
        const metrics = await logMetrics(base);
        return { unreadCount: metrics.unreadCount, markAll: metrics.markAll };
      },
    },
    {
      id: "inbox-paginate-unread",
      run: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await qaFetch(base, "/__qa/scenario", {
          method: "POST",
          body: JSON.stringify({ scenario: "paginate-unread" }),
        });
        await openNotifications(page);
        await page.getByRole("checkbox", { name: /только непрочитанные/i }).click();
        await page.getByRole("heading", { name: "Новый партнёр зарегистрирован" }).waitFor();
        await page.getByRole("button", { name: "Дальше" }).click();
        await page.getByRole("heading", { name: "Страница 2 — непрочитанное" }).waitFor();
        const titles = await page.evaluate(() =>
          [...document.querySelectorAll("h3.inboxTitle, .inboxTitle")].map((h) => h.textContent?.trim()),
        );
        return { pageTitles: titles, uniqueTitles: new Set(titles).size === titles.length };
      },
    },
    {
      id: "inbox-mark-list-retry",
      run: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openNotifications(page);
        await qaFetch(base, "/__qa/scenario", { method: "POST", body: JSON.stringify({ listFailOnce: true }) });
        await page.getByRole("button", { name: "Прочитано" }).first().click();
        await page.getByText(/не удалось обновить список|не удалось отметить/i).waitFor({ timeout: 30_000 });
        await page.getByRole("button", { name: "Повторить" }).click();
        await page.waitForFunction(() => document.querySelectorAll("li[data-unread]").length === 2);
        const metrics = await logMetrics(base);
        return { unreadCount: metrics.unreadCount, markOne: metrics.markOne };
      },
    },
    {
      id: "inbox-mark-one-no-double",
      run: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openNotifications(page);
        const btn = page.getByRole("button", { name: "Прочитано" }).first();
        await btn.click({ clickCount: 2, delay: 0 });
        await page.waitForTimeout(600);
        const metrics = await logMetrics(base);
        return { markOneRequests: metrics.markOne };
      },
    },
  ];

  for (const sc of inboxScenarioDefs) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { Origin: APP_URL },
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
    const metrics = await sc.run(page, upstream.baseUrl);
    report.inbox.push({ id: sc.id, ok: true, ...metrics });
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", `inbox-${sc.id}-1440-light.png`),
      fullPage: true,
    });
    await context.close();
  }

  const MARK_ALL_MATRIX = [
    { tag: "1440-light", w: 1440, h: 900, theme: "light" },
    { tag: "1440-dark", w: 1440, h: 900, theme: "dark" },
    { tag: "375-light", w: 375, h: 812, theme: "light" },
    { tag: "375-dark", w: 375, h: 812, theme: "dark" },
    { tag: "320-light", w: 320, h: 812, theme: "light" },
    { tag: "320-dark", w: 320, h: 812, theme: "dark" },
    { tag: "320x600-dark", w: 320, h: 600, theme: "dark" },
  ];

  for (const vp of MARK_ALL_MATRIX) {
    await qaFetch(upstream.baseUrl, "/__qa/reset", { method: "POST", body: "{}" });
    const context = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      extraHTTPHeaders: { Origin: APP_URL },
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
    await openNotifications(page);
    await setTheme(page, vp.theme);
    const markMetrics = await measureMarkAllButton(page);
    report.matrix.push({ viewport: `mark-all-${vp.tag}`, ...markMetrics });
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", `mark-all-${vp.tag}.png`),
      fullPage: false,
    });
    await context.close();
  }

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
      path: path.join(OUT_DIR, "screenshots", `guards-modal-${vp.tag}.png`),
      fullPage: false,
    });
    await context.close();
  }

  {
    await qaFetch(upstream.baseUrl, "/__qa/reset", { method: "POST", body: "{}" });
    const context = await browser.newContext({
      viewport: { width: 320, height: 600 },
      extraHTTPHeaders: { Origin: APP_URL },
    });
    await context.addInitScript(() => {
      document.documentElement.setAttribute("data-theme", "dark");
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
    await setTheme(page, "dark");
    await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
    await page.getByRole("button", { name: "Закрыть окно настроек" }).click();
    await page.getByTestId("admin-notify-settings-discard-confirm").waitFor();
    const metrics = await measureSettings(page);
    report.matrix.push({ viewport: "320x600-dark-dirty-confirm", ...metrics, discardConfirm: true });
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", "guards-dirty-confirm-320x600-dark.png"),
      fullPage: false,
    });
    await context.close();
  }

  const scenarioDefs = [
    {
      id: "settings-focus-restore",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openSettingsModal(page);
        await page.getByRole("button", { name: "Закрыть окно настроек" }).click();
        await page.getByRole("button", { name: "Настройки" }).waitFor();
        const label = await page.evaluate(
          () => (document.activeElement instanceof HTMLElement ? document.activeElement.textContent?.trim() : null),
        );
        return { settingsTriggerFocused: label === "Настройки" };
      },
    },
    {
      id: "channel-guard-recovery",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await qaFetch(base, "/__qa/scenario", {
          method: "POST",
          body: JSON.stringify({ scenario: "max-enabled-unlinked" }),
        });
        await openSettingsModal(page);
        const before = await patchCount(base);
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page
          .getByRole("dialog")
          .getByRole("alert")
          .filter({ hasText: /MAX отмечен для доставки/i })
          .waitFor({ timeout: 30_000 });
        const afterGuard = await patchCount(base);
        await page.getByRole("checkbox", { name: /MAX/ }).click();
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.getByText("Настройки сохранены").waitFor({ timeout: 30_000 });
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.getByText("Настройки сохранены").waitFor({ timeout: 30_000 });
        return {
          patchDeltaAfterGuard: afterGuard - before,
          patchDeltaTotal: (await patchCount(base)) - before,
        };
      },
    },
    {
      id: "close-clean-escape",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openSettingsModal(page);
        const before = await patchCount(base);
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "Настройки" }).waitFor({ timeout: 30_000 });
        const after = await patchCount(base);
        return { patchDelta: after - before, dialogOpen: false };
      },
    },
    {
      id: "dirty-stay",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        await page.getByRole("button", { name: "Закрыть окно настроек" }).click();
        await page.getByTestId("admin-notify-settings-discard-confirm").waitFor();
        const before = await patchCount(base);
        await page.getByTestId("admin-notify-settings-discard-stay").click();
        await page.getByRole("heading", { name: "Уведомления администратора" }).waitFor();
        const after = await patchCount(base);
        return { patchDelta: after - before, discardVisible: false };
      },
    },
    {
      id: "dirty-discard",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        await page.getByRole("button", { name: "Закрыть окно настроек" }).click();
        await page.getByTestId("admin-notify-settings-discard-confirm").waitFor();
        const before = await patchCount(base);
        await page.getByTestId("admin-notify-settings-discard-close").click();
        await page.getByRole("button", { name: "Настройки" }).waitFor();
        const after = await patchCount(base);
        return { patchDelta: after - before, dialogOpen: false };
      },
    },
    {
      id: "busy-blocked-escape",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/scenario", {
          method: "POST",
          body: JSON.stringify({ scenario: "default", settingsSaveDelayMs: 3000 }),
        });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.getByRole("button", { name: "Сохранение…" }).waitFor();
        await page.keyboard.press("Escape");
        await page.getByRole("heading", { name: "Уведомления администратора" }).waitFor();
        return { dialogOpen: true, savingVisible: true };
      },
    },
    {
      id: "save-success-close",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.getByText("Настройки сохранены").waitFor({ timeout: 30_000 });
        const beforeClose = await patchCount(base);
        await page.getByRole("button", { name: "Закрыть окно настроек" }).click();
        await page.getByRole("button", { name: "Настройки" }).waitFor();
        return { patchCount: beforeClose, patchDeltaOnClose: (await patchCount(base)) - beforeClose };
      },
    },
    {
      id: "double-save-one-patch",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await qaFetch(base, "/__qa/scenario", {
          method: "POST",
          body: JSON.stringify({ scenario: "default", settingsSaveDelayMs: 2000 }),
        });
        let patchRequests = 0;
        await page.route("**/api/remcard/api/pro/admin/notification-settings", (route) => {
          if (route.request().method() === "PATCH") patchRequests += 1;
          void route.continue();
        });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        const save = page.getByRole("button", { name: "Сохранить" });
        await save.click({ clickCount: 2, delay: 0 });
        await page.getByText("Настройки сохранены").waitFor({ timeout: 30_000 });
        return { patchDelta: patchRequests, upstreamPatchDelta: (await patchCount(base)) };
      },
    },
    {
      id: "save-error-retry",
      setup: async (page, base) => {
        await qaFetch(base, "/__qa/reset", { method: "POST", body: "{}" });
        await qaFetch(base, "/__qa/scenario", {
          method: "POST",
          body: JSON.stringify({ scenario: "settings-save-fail" }),
        });
        await openSettingsModal(page);
        await page.getByRole("checkbox", { name: /активность партнёров/i }).click();
        const before = await patchCount(base);
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page
          .getByRole("dialog")
          .getByRole("alert")
          .filter({ hasText: /не удалось сохранить/i })
          .waitFor();
        await qaFetch(base, "/__qa/scenario", { method: "POST", body: JSON.stringify({ scenario: "default" }) });
        await page.getByRole("button", { name: "Сохранить" }).click();
        await page.getByText("Настройки сохранены").waitFor({ timeout: 30_000 });
        return { patchDelta: (await patchCount(base)) - before };
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
    const metrics = await sc.setup(page, upstream.baseUrl);
    report.scenarios.push({ id: sc.id, ok: true, ...metrics });
    await page.screenshot({
      path: path.join(OUT_DIR, "screenshots", `guards-${sc.id}-1440-light.png`),
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
