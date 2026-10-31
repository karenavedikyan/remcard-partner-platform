#!/usr/bin/env node
/**
 * Native Chromium QA against ACTUAL compiled Next.js /admin/access/users
 * + loopback synthetic upstream (not standalone HTML).
 *
 * Asserts OWNER create/dup/revoke, ADMIN/401/403/network, empty/busy,
 * password cleared, secrets absent, no horizontal overflow, mutation HTTP
 * method/path/payload counts via upstream /__qa/log.
 */
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startUpstream } from "./upstream.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR =
  process.env.ADMIN_ACCESS_USERS_QA_OUT ||
  path.join(ROOT, "artifacts/admin-access-users-a10c");
const SHOT_DIR = path.join(OUT_DIR, "screenshots");
const APP_PORT = Number(process.env.ADMIN_ACCESS_USERS_APP_PORT || 4310);
const APP_URL = process.env.ADMIN_ACCESS_USERS_APP_URL || `http://127.0.0.1:${APP_PORT}`;
const SKIP_BUILD = process.env.ADMIN_ACCESS_USERS_SKIP_BUILD === "1";
const SKIP_START = process.env.ADMIN_ACCESS_USERS_SKIP_START === "1";

const VIEWPORTS = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

const SECRET_RE = /passwordHash|eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.|Bearer [A-Za-z0-9._-]{10,}|synthetic-only-pass|fixture-only-pass/i;

/** @type {string[]} */
const assertions = [];
/** @type {string[]} */
const failures = [];

function record(name, ok, detail = "") {
  const line = ok ? `PASS ${name}${detail ? ` — ${detail}` : ""}` : `FAIL ${name}${detail ? ` — ${detail}` : ""}`;
  assertions.push(line);
  if (!ok) failures.push(line);
  console.log(line);
}

function assert(name, cond, detail = "") {
  record(name, Boolean(cond), detail);
}

async function qaFetch(upstreamBase, pathname, init) {
  const res = await fetch(`${upstreamBase}${pathname}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

async function setScenario(upstreamBase, body) {
  const r = await qaFetch(upstreamBase, "/__qa/scenario", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (r.status !== 200) throw new Error(`scenario failed: ${r.status} ${r.text}`);
}

async function resetQa(upstreamBase) {
  await qaFetch(upstreamBase, "/__qa/reset", { method: "POST", body: "{}" });
}

async function getLog(upstreamBase) {
  const r = await qaFetch(upstreamBase, "/__qa/log", { method: "GET" });
  return r.json?.log ?? [];
}

function waitForHttp(url, { timeoutMs = 90_000 } = {}) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode ?? 0);
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`timeout waiting ${url}`));
        else setTimeout(tick, 400);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error(`timeout waiting ${url}`));
        else setTimeout(tick, 400);
      });
    };
    tick();
  });
}

async function ensureBuild() {
  if (SKIP_BUILD) return { skipped: true };
  return new Promise((resolve, reject) => {
    // NEXT_PUBLIC_APP_URL is inlined at build time and must match the Origin
    // used by Playwright for BFF mutating origin checks.
    const child = spawn("npm", ["run", "build"], {
      cwd: ROOT,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
        NEXT_PUBLIC_APP_URL: APP_URL,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      out += d;
      process.stderr.write(d);
    });
    child.on("exit", (code) => {
      if (code === 0) resolve({ ok: true, out });
      else reject(new Error(`next build exit ${code}`));
    });
  });
}

function startNext({ upstreamBase }) {
  if (SKIP_START) return { child: null, already: true };
  const nextBin = path.join(ROOT, "node_modules/next/dist/bin/next");
  const child = spawn(
    process.execPath,
    [nextBin, "start", "-H", "127.0.0.1", "-p", String(APP_PORT)],
    {
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
    },
  );
  child.stdout.on("data", (d) => process.stdout.write(`[next] ${d}`));
  child.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  return { child, already: false };
}

async function newStaffContext(browser, viewport) {
  // BFF mutating routes require Origin === NEXT_PUBLIC_APP_URL (Chromium may omit it).
  const context = await browser.newContext({
    viewport,
    extraHTTPHeaders: { Origin: APP_URL, Referer: `${APP_URL}/admin/access/users` },
  });
  await context.addCookies([
    {
      name: "remcard-token",
      value: "qa-native-session",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  return context;
}

async function openUsers(page) {
  await page.goto(`${APP_URL}/admin/access/users`, { waitUntil: "networkidle", timeout: 60_000 });
}

async function shot(page, file) {
  await page.screenshot({ path: path.join(SHOT_DIR, file), fullPage: true });
}

async function assertNoSecrets(page, label) {
  const text = await page.locator("body").innerText();
  const html = await page.content();
  const bad = SECRET_RE.test(text) || SECRET_RE.test(html);
  assert(`no-secrets:${label}`, !bad, bad ? "secret-like content found" : "clean");
}

async function assertNoHOverflow(page, label) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      innerWidth: window.innerWidth,
    };
  });
  assert(
    `no-h-overflow:${label}`,
    overflow.scrollWidth <= overflow.innerWidth + 1,
    JSON.stringify(overflow),
  );
}

async function run() {
  await mkdir(SHOT_DIR, { recursive: true });
  await mkdir(path.join(OUT_DIR, "proof"), { recursive: true });

  console.log("== build ==");
  await ensureBuild();

  console.log("== upstream ==");
  const upstream = await startUpstream(0);
  console.log(`upstream ${upstream.baseUrl}`);

  console.log("== next start ==");
  const next = startNext({ upstreamBase: upstream.baseUrl });
  try {
    await waitForHttp(`${upstream.baseUrl}/__qa/log`);
    // Wait for Next to answer something (login redirect or page)
    await waitForHttp(APP_URL);

    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROME || "/usr/local/bin/google-chrome",
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });

    const mutationProof = { creates: [], revokes: [], lists: [] };

    try {
      // —— OWNER list @ 1440 / 390 ——
      for (const vp of VIEWPORTS) {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "owner", empty: false, resetLog: true });
        const context = await newStaffContext(browser, { width: vp.width, height: vp.height });
        const page = await context.newPage();
        await openUsers(page);
        await page.waitForSelector('[data-admin-access-users="r1"]');
        await page.getByRole("heading", { name: "Управление администраторами" }).waitFor({
          state: "visible",
          timeout: 30_000,
        });
        await page.getByTestId("access-users-viewer").waitFor({ state: "visible", timeout: 30_000 });
        assert(
          `owner-list-visible:${vp.name}`,
          await page.getByRole("heading", { name: "Управление администраторами" }).isVisible(),
        );
        assert(
          `owner-admin-row:${vp.name}`,
          await page.getByText("Администратор А", { exact: true }).first().isVisible(),
        );
        await shot(page, `users-owner-ok-light-${vp.name}.png`);
        await assertNoSecrets(page, `owner-${vp.name}`);
        await assertNoHOverflow(page, `owner-${vp.name}`);
        await context.close();
      }

      // —— Successful create submit ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "owner", empty: false, resetLog: true });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.waitForSelector("text=Новый администратор");
        const pwd = "synthetic-only-12";
        await page.fill("#access-users-display-name", "Синтетический админ");
        await page.fill("#access-users-login", "synth.admin");
        await page.fill("#access-users-password", pwd);
        await page.getByRole("button", { name: "Создать администратора" }).click();
        await page.waitForSelector("text=Администратор «Синтетический админ» создан");
        const pwdVal = await page.inputValue("#access-users-password");
        assert("create-success-password-cleared", pwdVal === "", `value=${JSON.stringify(pwdVal)}`);
        assert(
          "create-success-row",
          await page.getByText("Синтетический админ", { exact: true }).isVisible(),
        );
        const bodyText = await page.locator("body").innerText();
        assert("create-success-no-plaintext-password", !bodyText.includes(pwd));
        await shot(page, "users-create-success-light-1440.png");

        const log = await getLog(upstream.baseUrl);
        const creates = log.filter((e) => e.kind === "create");
        mutationProof.creates = creates;
        assert("create-mutation-count", creates.length === 1, `count=${creates.length}`);
        assert(
          "create-mutation-method-path",
          creates[0]?.method === "POST" && creates[0]?.path === "/api/pro/admin/access/users",
          JSON.stringify(creates[0]),
        );
        assert(
          "create-mutation-payload",
          creates[0]?.body?.displayName === "Синтетический админ" &&
            creates[0]?.body?.login === "synth.admin" &&
            creates[0]?.passwordLen === pwd.length,
          JSON.stringify(creates[0]?.body),
        );
        await context.close();
      }

      // —— Duplicate / conflict + password cleared ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "owner", empty: false, resetLog: true });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.fill("#access-users-display-name", "Dup");
        await page.fill("#access-users-login", "qa.admin.a");
        await page.fill("#access-users-password", "duplicate-pass12");
        await page.getByRole("button", { name: "Создать администратора" }).click();
        await page.waitForSelector("text=логин уже занят");
        assert(
          "duplicate-password-cleared",
          (await page.inputValue("#access-users-password")) === "",
        );
        await shot(page, "users-duplicate-error-light-1440.png");
        const log = await getLog(upstream.baseUrl);
        assert(
          "duplicate-single-create",
          log.filter((e) => e.kind === "create").length === 1,
        );
        await context.close();
      }

      // —— Busy / double-submit ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, {
          mode: "owner",
          empty: false,
          createDelayMs: 2500,
          resetLog: true,
        });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.fill("#access-users-display-name", "Busy Admin");
        await page.fill("#access-users-login", "busy.admin");
        await page.fill("#access-users-password", "busy-password1");
        const btn = page.getByRole("button", { name: "Создать администратора" });
        await btn.click();
        await page.waitForSelector("text=Создание…");
        await shot(page, "users-busy-light-1440.png");
        // Second click while busy must not fire another mutation
        await btn.click({ force: true }).catch(() => undefined);
        await page.waitForSelector("text=Администратор «Busy Admin» создан", { timeout: 15_000 });
        const log = await getLog(upstream.baseUrl);
        const creates = log.filter((e) => e.kind === "create");
        assert("busy-single-flight-create", creates.length === 1, `count=${creates.length}`);
        await context.close();
      }

      // —— Revoke: cancel + confirm + idempotent ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "owner", empty: false, resetLog: true });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.getByRole("button", { name: "Отключить доступ" }).click();
        await page.waitForSelector('[role="dialog"]');
        // Escape when idle cancels
        await page.keyboard.press("Escape");
        await page.waitForSelector('[role="dialog"]', { state: "hidden" });
        assert("revoke-escape-cancel", true);

        await page.getByRole("button", { name: "Отключить доступ" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.waitFor();
        // Tab containment: focus stays inside dialog
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        await page.keyboard.press("Tab");
        const focusInside = await page.evaluate(() => {
          const d = document.querySelector('[role="dialog"]');
          return Boolean(d && d.contains(document.activeElement));
        });
        assert("revoke-tab-containment", focusInside);
        await shot(page, "users-revoke-dialog-light-1440.png");
        await dialog.getByRole("button", { name: "Отключить доступ" }).click();
        await page.waitForSelector('[role="dialog"]', { state: "hidden" });
        assert(
          "revoke-confirmed-state",
          await page.getByText("Доступ отключён").isVisible(),
        );

        const log1 = await getLog(upstream.baseUrl);
        const revokes = log1.filter((e) => e.kind === "revoke");
        mutationProof.revokes = revokes;
        assert("revoke-mutation-count", revokes.length === 1, `count=${revokes.length}`);
        assert(
          "revoke-mutation-path",
          revokes[0]?.method === "POST" &&
            /\/api\/pro\/admin\/access\/users\/qa-admin-1\/revoke$/.test(revokes[0]?.path || ""),
          JSON.stringify(revokes[0]),
        );

        // Idempotent: already revoked — no revoke button for that row
        assert(
          "revoke-idempotent-no-button",
          (await page.getByRole("button", { name: "Отключить доступ" }).count()) === 0,
        );
        await context.close();
      }

      // —— Empty list ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "owner", empty: true, resetLog: true });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.waitForSelector("text=Пока нет второго администратора");
        await shot(page, "users-empty-light-1440.png");
        assert("empty-list", true);
        await context.close();
      }

      // —— ADMIN denied (auth ok, list 403) ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "admin", resetLog: true });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.waitForSelector("text=Доступ только для владельца");
        assert(
          "admin-denied-not-empty",
          (await page.getByText("Пока нет второго администратора").count()) === 0,
        );
        assert(
          "admin-denied-no-create",
          (await page.getByRole("button", { name: "Создать администратора" }).count()) === 0,
        );
        await shot(page, "users-403-admin-light-1440.png");
        await context.close();
      }

      // —— 401 unauth → redirect to login ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "unauth", resetLog: true });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.waitForURL(/\/login/, { timeout: 30_000 });
        assert("unauth-redirect-login", /\/login/.test(page.url()), page.url());
        await shot(page, "users-401-redirect-light-1440.png");
        await context.close();
      }

      // —— Network / error + retry ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "error", resetLog: true });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.waitForSelector("text=Upstream temporarily unavailable");
        await shot(page, "users-error-retry-light-1440.png");
        await setScenario(upstream.baseUrl, { mode: "owner", empty: false });
        await page.getByRole("button", { name: "Повторить" }).click();
        await page.waitForSelector("text=Администратор А");
        assert("error-retry-recovers", true);
        await context.close();
      }

      // —— confirmCancel keyboard ——
      {
        await resetQa(upstream.baseUrl);
        await setScenario(upstream.baseUrl, { mode: "owner", empty: false, resetLog: true });
        const context = await newStaffContext(browser, { width: 1440, height: 900 });
        const page = await context.newPage();
        await openUsers(page);
        await page.fill("#access-users-display-name", "Draft");
        await page.getByRole("button", { name: "Очистить форму" }).click();
        await page.waitForSelector('[role="dialog"]');
        const focused = await page.evaluate(() => document.activeElement?.textContent || "");
        assert("confirm-cancel-initial-focus", /Очистить/.test(focused), `focus=${focused}`);
        await page.keyboard.press("Escape");
        await page.waitForSelector('[role="dialog"]', { state: "hidden" });
        assert(
          "confirm-cancel-escape-keeps-draft",
          (await page.inputValue("#access-users-display-name")) === "Draft",
        );
        await context.close();
      }
    } finally {
      await browser.close();
    }

    const summary = {
      appUrl: APP_URL,
      upstream: upstream.baseUrl,
      native: true,
      standaloneHtml: false,
      viewports: VIEWPORTS.map((v) => v.name),
      assertions,
      failures,
      mutationProof,
      shots: (await import("node:fs/promises"))
        .readdir(SHOT_DIR)
        .then((f) => f.filter((n) => n.endsWith(".png"))),
    };
    summary.shots = await summary.shots;

    await writeFile(path.join(OUT_DIR, "capture-summary.json"), JSON.stringify(summary, null, 2));
    await writeFile(
      path.join(OUT_DIR, "proof", "assertions.txt"),
      assertions.join("\n") + "\n",
    );
    await writeFile(
      path.join(OUT_DIR, "proof", "mutation-log.json"),
      JSON.stringify(mutationProof, null, 2),
    );

    if (failures.length) {
      console.error(`\n${failures.length} assertion failure(s)`);
      process.exitCode = 1;
    } else {
      console.log(`\nAll ${assertions.length} assertions passed`);
    }
  } finally {
    if (next.child && next.child.pid) {
      try {
        process.kill(next.child.pid, "SIGTERM");
      } catch {
        /* ignore */
      }
      await new Promise((r) => setTimeout(r, 500));
      try {
        process.kill(next.child.pid, "SIGKILL");
      } catch {
        /* ignore */
      }
      try {
        process.kill(-next.child.pid, "SIGKILL");
      } catch {
        /* ignore */
      }
    }
    await new Promise((r) => upstream.server.close(() => r()));
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
