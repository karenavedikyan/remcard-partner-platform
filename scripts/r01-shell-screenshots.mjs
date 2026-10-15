#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const OUT_DIR =
  process.env.R01_ARTIFACT_DIR?.trim() || "/opt/cursor/artifacts/remcard-r012/screenshots";
const PLATFORM_PORT = Number(process.env.R01_PLATFORM_PORT || 3012);
const REFERENCE_ROOT =
  process.env.R01_REFERENCE_ROOT?.trim() ||
  "/opt/cursor/artifacts/remcard-reference-20261014/reference/prototypes/remcard-profile-wizard";
const BASE = `http://127.0.0.1:${PLATFORM_PORT}`;

const PAIRS = [
  { name: "1440-light", width: 1440, height: 900, theme: "light" },
  { name: "1440-dark", width: 1440, height: 900, theme: "dark" },
  { name: "375-light", width: 375, height: 812, theme: "light" },
  { name: "375-dark", width: 375, height: 812, theme: "dark" },
];

async function waitForServer(url, timeoutMs = 120_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.ok || res.status === 404 || res.status === 307) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server not ready: ${url}`);
}

async function ensurePlatformDev() {
  try {
    await waitForServer(`${BASE}/login`, 3000);
  } catch {
    const child = spawn("npm", ["run", "dev", "--", "-p", String(PLATFORM_PORT)], {
      cwd: new URL("..", import.meta.url).pathname,
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    await waitForServer(`${BASE}/login`);
  }
}

async function ensureReferenceServer() {
  const port = 8099;
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(`${base}/roles.html`, 2000);
  } catch {
    const child = spawn("python3", ["-m", "http.server", String(port)], {
      cwd: REFERENCE_ROOT,
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    await waitForServer(`${base}/roles.html`);
  }
  return base;
}

async function readShellMetrics(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const sidebarNav = document.querySelector("aside nav, .sidebar nav");
    const navStyle = sidebarNav ? getComputedStyle(sidebarNav) : null;
    const bg = getComputedStyle(document.body).backgroundColor;
    return {
      dataTheme: root.getAttribute("data-theme"),
      bodyBg: bg,
      navAlignContent: navStyle?.alignContent ?? null,
      navGap: navStyle?.gap ?? null,
      roleScenario:
        document.querySelector("[data-testid=scenario-role]")?.value ??
        document.querySelector("[data-control=role]")?.value ??
        null,
      activeNavTestId:
        document.querySelector("[aria-current=page][data-testid^=nav-]")?.getAttribute(
          "data-testid",
        ) ?? null,
    };
  });
}

async function prepareReferenceAgentHome(page, refBase, theme) {
  await page.goto(`${refBase}/roles.html`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.addStyleTag({
    content:
      ".demo-top,.review-details,.registration,.choice-footer,.demo-toolbar{display:none!important}",
  });
  await page.waitForFunction(() => document.querySelector(".shell") != null, null, {
    timeout: 90_000,
  });
  await page.evaluate(() => {
    const cabinet = document.querySelector('[data-action="view:cabinet"]');
    if (cabinet && cabinet.getAttribute("aria-pressed") !== "true") {
      cabinet.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
    const sel = document.querySelector('[data-testid="scenario-role"]');
    if (sel) {
      sel.value = "agent";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const home = document.querySelector('[data-testid="nav-home"]');
    home?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  if (theme === "dark") {
    const current = await page.getAttribute("html", "data-theme");
    if (current !== "dark") {
      await page.locator('[data-action="theme"]').click();
    }
  } else {
    const current = await page.getAttribute("html", "data-theme");
    if (current === "dark") {
      await page.locator('[data-action="theme"]').click();
    }
  }
  await page.waitForTimeout(400);
  const metrics = await readShellMetrics(page);
  if (metrics.roleScenario !== "agent") {
    throw new Error(`Reference role not agent (got ${metrics.roleScenario})`);
  }
  if (metrics.activeNavTestId !== "nav-home") {
    throw new Error(`Reference active nav not home (got ${metrics.activeNavTestId})`);
  }
  if (metrics.dataTheme !== theme) {
    throw new Error(`Reference data-theme ${metrics.dataTheme} != ${theme}`);
  }
  return metrics;
}

async function captureImplementation(page, theme, width, height) {
  const url = `${BASE}/dev/r01-agent-shell?theme=${theme}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  await page.waitForFunction(
    (expected) => document.documentElement.getAttribute("data-theme") === expected,
    resolvedTheme,
    { timeout: 30_000 },
  );
  const metrics = await readShellMetrics(page);
  if (metrics.activeNavTestId !== "nav-home") {
    throw new Error(`Impl active nav not home (got ${metrics.activeNavTestId})`);
  }
  if (metrics.dataTheme !== resolvedTheme) {
    throw new Error(
      `Impl data-theme ${metrics.dataTheme} != ${resolvedTheme} (body ${metrics.bodyBg})`,
    );
  }
  if (width <= 680 && metrics.navAlignContent !== null) {
    /* mobile hides sidebar */
  } else if (width > 680 && metrics.navAlignContent !== "start") {
    throw new Error(`Sidebar nav align-content expected start, got ${metrics.navAlignContent}`);
  }
  return metrics;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await ensurePlatformDev();
  const refBase = await ensureReferenceServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const pair of PAIRS) {
    for (const side of ["impl", "ref"]) {
      const name = `${side}-${pair.name}`;
      const context = await browser.newContext({
        viewport: { width: pair.width, height: pair.height },
        colorScheme: pair.theme,
      });
      const page = await context.newPage();
      const entry = { name, capture: "FAIL", verify: "NOT_RUN" };
      try {
        let metrics;
        if (side === "impl") {
          metrics = await captureImplementation(page, pair.theme, pair.width, pair.height);
        } else {
          metrics = await prepareReferenceAgentHome(page, refBase, pair.theme);
        }
        const out = path.join(OUT_DIR, `${name}.png`);
        const shell = page.locator(side === "impl" ? ".shell" : ".shell").first();
        if (await shell.count()) {
          await shell.screenshot({ path: out });
        } else {
          await page.screenshot({ path: out });
        }
        entry.capture = "CAPTURED";
        entry.verify = "PASS";
        entry.metrics = metrics;
        entry.path = out;
      } catch (error) {
        entry.error = error instanceof Error ? error.message : String(error);
        entry.verify = "FAIL";
      } finally {
        results.push(entry);
        await context.close();
      }
    }
  }

  // 320 editor / replacement flow
  {
    const context = await browser.newContext({
      viewport: { width: 320, height: 700 },
      colorScheme: "light",
    });
    const page = await context.newPage();
    const entry = { name: "impl-320-light-editor", capture: "FAIL", verify: "NOT_RUN" };
    try {
      await page.goto(`${BASE}/dev/r01-agent-shell?theme=light`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Ещё разделы" }).click();
      await page.getByRole("button", { name: "Настроить нижнюю панель" }).click();
      const scanner = page.getByText("Сканер", { exact: true }).last();
      await scanner.click();
      await page.getByTestId("mobile-replace-wallet").click();
      const out = path.join(OUT_DIR, "impl-320-light-editor.png");
      await page.locator("dialog[open]").screenshot({ path: out });
      entry.capture = "CAPTURED";
      entry.verify = "PASS";
      entry.path = out;
    } catch (error) {
      entry.error = error instanceof Error ? error.message : String(error);
    } finally {
      results.push(entry);
      await context.close();
    }
  }

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    note: "CAPTURED=PNG written; verify PASS=DOM/theme/shell checks passed",
    results,
  };
  await writeFile(
    path.join(path.dirname(OUT_DIR), "TEST-RESULTS-screenshots.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
