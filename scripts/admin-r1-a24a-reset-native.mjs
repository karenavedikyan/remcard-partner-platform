#!/usr/bin/env node
/** A24a: reset-password dialog native shots only. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { startUpstream } from "./admin-access-users-fixture/upstream.mjs";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dir, "..");
const OUT =
  process.env.A24A_NATIVE_OUT ||
  path.join(ROOT, "artifacts/admin-r1-a24a-reset-native");
const SHOT_DIR = path.join(OUT, "screenshots");
const APP_PORT = Number(process.env.ADMIN_ACCESS_USERS_APP_PORT || 4312);
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const SKIP_BUILD = process.env.ADMIN_ACCESS_USERS_SKIP_BUILD === "1";

async function ensureBuild() {
  if (SKIP_BUILD) return;
  await new Promise((resolve, reject) => {
    const child = spawn("npm", ["run", "build"], {
      cwd: ROOT,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NEXT_PUBLIC_APP_URL: APP_URL },
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`build ${code}`))));
  });
}

function startNext(upstreamBase) {
  const nextBin = path.join(ROOT, "node_modules/next/dist/bin/next");
  return spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(APP_PORT)], {
    cwd: ROOT,
    env: {
      ...process.env,
      REMCARD_API_BASE_URL: upstreamBase,
      NEXT_PUBLIC_APP_URL: APP_URL,
      REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN: "1",
    },
    stdio: "inherit",
    detached: true,
  });
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    localStorage.setItem("rc_theme", t);
  }, theme);
}

async function run() {
  await mkdir(SHOT_DIR, { recursive: true });
  await ensureBuild();
  const upstream = await startUpstream(0);
  const next = startNext(upstream.baseUrl);
  await new Promise((r) => setTimeout(r, 2500));
  const browser = await chromium.launch();
  const frames = [
    { w: 320, h: 600, theme: "light", file: "reset-password-dialog-320-light.png" },
    { w: 320, h: 600, theme: "dark", file: "reset-password-dialog-320-dark.png" },
    { w: 1440, h: 900, theme: "light", file: "reset-password-dialog-1440-light.png" },
    { w: 1440, h: 900, theme: "dark", file: "reset-password-dialog-1440-dark.png" },
  ];
  try {
    for (const frame of frames) {
      const context = await browser.newContext({
        viewport: { width: frame.w, height: frame.h },
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
      const page = await context.newPage();
      await page.goto(`${APP_URL}/admin/access/users`, { waitUntil: "networkidle", timeout: 60_000 });
      await setTheme(page, frame.theme);
      await page.getByRole("button", { name: "Задать новый пароль" }).first().click();
      await page.getByRole("dialog").waitFor();
      const fits = await page.getByRole("dialog").evaluate((e) => {
        const r = e.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
      });
      if (!fits) throw new Error(`Dialog outside viewport ${frame.w} ${frame.theme}`);
      await page.screenshot({ path: path.join(SHOT_DIR, frame.file), fullPage: false });
      await context.close();
    }
    console.log("A24a reset dialog shots OK ->", SHOT_DIR);
  } finally {
    await browser.close();
    try {
      process.kill(-next.pid, "SIGKILL");
    } catch {
      /* ignore */
    }
    await new Promise((r) => upstream.server.close(() => r()));
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
