#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const OUT_DIR =
  process.env.R01_ARTIFACT_DIR?.trim() || "/opt/cursor/artifacts/remcard-r01-final/screenshots";
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

const REF_HIDE =
  ".demo-top,.review-details,.registration,.choice-footer,.demo-toolbar,.mobile-demo-settings,.review-toolbar{display:none!important}";

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
    await waitForServer(`${BASE}/dev/r01-agent-shell?theme=light`, 3000);
  } catch {
    const child = spawn("npm", ["run", "dev", "--", "-p", String(PLATFORM_PORT)], {
      cwd: new URL("..", import.meta.url).pathname,
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    await waitForServer(`${BASE}/dev/r01-agent-shell?theme=light`);
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

async function readImplGeometry(page) {
  return page.evaluate(() => {
    const topbar = document.querySelector("[data-testid=agent-product-topbar]");
    const root = document.querySelector("[class*='agentRoot']") ?? document.body;
    const shell = document.querySelector("[class*='shell']");
    const navLink = document.querySelector("[data-testid=nav-home]");
    const navStyle = navLink ? getComputedStyle(navLink) : null;
    const topStyle = topbar ? getComputedStyle(topbar) : null;
    const rootStyle = getComputedStyle(root);
    return {
      dataTheme: document.documentElement.getAttribute("data-theme"),
      topbarMinHeight: topStyle?.minHeight ?? null,
      topbarPadding: topStyle?.padding ?? null,
      agentBg: rootStyle.getPropertyValue("--bg").trim() || rootStyle.backgroundColor,
      navFontSize: navStyle?.fontSize ?? null,
      navColor: navStyle?.color ?? null,
      navMinHeight: navStyle?.minHeight ?? null,
      activeNavTestId:
        document.querySelector("[aria-current=page][data-testid^=nav-]")?.getAttribute(
          "data-testid",
        ) ?? null,
      hasFullWidthTopbar: topbar && shell ? topbar.compareDocumentPosition(shell) === 4 : null,
    };
  });
}

async function readRefGeometry(page) {
  return page.evaluate(() => {
    const topbar = document.querySelector(".topbar");
    const shell = document.querySelector(".shell");
    const nav = document.querySelector('[data-testid="nav-home"]');
    const navStyle = nav ? getComputedStyle(nav) : null;
    const topStyle = topbar ? getComputedStyle(topbar) : null;
    const bodyStyle = getComputedStyle(document.body);
    return {
      dataTheme: document.documentElement.getAttribute("data-theme"),
      topbarMinHeight: topStyle?.minHeight ?? null,
      topbarPadding: topStyle?.padding ?? null,
      bodyBg: bodyStyle.backgroundColor,
      navFontSize: navStyle?.fontSize ?? null,
      navColor: navStyle?.color ?? null,
      navMinHeight: navStyle?.minHeight ?? null,
      activeNavTestId:
        document.querySelector("[aria-current=page][data-testid^=nav-]")?.getAttribute(
          "data-testid",
        ) ?? null,
      topbarBeforeShell: topbar && shell ? topbar.compareDocumentPosition(shell) === 4 : null,
    };
  });
}

async function prepareReferenceAgentHome(page, refBase, theme) {
  await page.goto(`${refBase}/roles.html`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.addStyleTag({ content: REF_HIDE });
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
    document.querySelector('[data-testid="nav-home"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  const resolved = theme === "dark" ? "dark" : "light";
  if ((await page.getAttribute("html", "data-theme")) !== resolved) {
    await page.locator('[data-action="theme"]').click();
  }
  await page.waitForTimeout(400);
  const geometry = await readRefGeometry(page);
  if (geometry.activeNavTestId !== "nav-home") {
    throw new Error(`Reference active nav not home (${geometry.activeNavTestId})`);
  }
  if (geometry.dataTheme !== resolved) {
    throw new Error(`Reference theme ${geometry.dataTheme} != ${resolved}`);
  }
  return geometry;
}

async function captureImplementation(page, theme, width) {
  const url = `${BASE}/dev/r01-agent-shell?theme=${theme}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  await page.waitForFunction(
    (expected) => document.documentElement.getAttribute("data-theme") === expected,
    resolvedTheme,
    { timeout: 30_000 },
  );
  await page.waitForSelector("[data-testid=agent-product-topbar]");
  const geometry = await readImplGeometry(page);
  if (geometry.activeNavTestId !== "nav-home") {
    throw new Error(`Impl active nav not home (${geometry.activeNavTestId})`);
  }
  if (geometry.hasFullWidthTopbar !== true) {
    throw new Error("Product topbar is not positioned above shell grid");
  }
  if (width > 680 && geometry.navFontSize !== "14px") {
    throw new Error(`Nav font expected 14px, got ${geometry.navFontSize}`);
  }
  return geometry;
}

async function screenshotProductChrome(page, outPath, side) {
  if (side === "impl") {
    const root = page.locator("[class*='agentRoot']").first();
    await root.screenshot({ path: outPath });
    return;
  }
  const topbar = page.locator(".topbar").first();
  const shell = page.locator(".shell").first();
  const box = await page.evaluate(() => {
    const t = document.querySelector(".topbar");
    const s = document.querySelector(".shell");
    if (!t || !s) return null;
    const tr = t.getBoundingClientRect();
    const sr = s.getBoundingClientRect();
    const top = Math.min(tr.top, sr.top);
    const left = Math.min(tr.left, sr.left);
    const right = Math.max(tr.right, sr.right);
    const bottom = Math.max(tr.bottom, sr.bottom);
    return { x: left, y: top, width: right - left, height: bottom - top };
  });
  if (box) {
    await page.screenshot({ path: outPath, clip: box });
  } else {
    await page.screenshot({ path: outPath });
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await ensurePlatformDev();
  const refBase = await ensureReferenceServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const geometryTable = [];

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
        const geometry =
          side === "impl"
            ? await captureImplementation(page, pair.theme, pair.width)
            : await prepareReferenceAgentHome(page, refBase, pair.theme);
        const out = path.join(OUT_DIR, `${name}.png`);
        await screenshotProductChrome(page, out, side);
        entry.capture = "CAPTURED";
        entry.verify = "PASS";
        entry.geometry = geometry;
        entry.path = out;
        geometryTable.push({ pair: name, side, ...geometry });
      } catch (error) {
        entry.error = error instanceof Error ? error.message : String(error);
        entry.verify = "FAIL";
      } finally {
        results.push(entry);
        await context.close();
      }
    }

    const cropCtx = await browser.newContext({
      viewport: { width: pair.width, height: pair.height },
      colorScheme: pair.theme,
    });
    const cropPage = await cropCtx.newPage();
    for (const side of ["impl", "ref"]) {
      const cropName = `${side}-${pair.name}-nav-crop`;
      const cropEntry = { name: cropName, capture: "FAIL", verify: "NOT_RUN" };
      try {
        if (side === "impl") {
          await captureImplementation(cropPage, pair.theme, pair.width);
          const nav = cropPage.locator("[data-testid=nav-home]").first();
          await nav.screenshot({ path: path.join(OUT_DIR, `${cropName}.png`) });
        } else {
          await prepareReferenceAgentHome(cropPage, refBase, pair.theme);
          const nav = cropPage.locator('[data-testid="nav-home"]').first();
          await nav.screenshot({ path: path.join(OUT_DIR, `${cropName}.png`) });
        }
        cropEntry.capture = "CAPTURED";
        cropEntry.verify = "PASS";
      } catch (error) {
        cropEntry.error = error instanceof Error ? error.message : String(error);
      }
      results.push(cropEntry);
    }
    await cropCtx.close();
  }

  {
    const context = await browser.newContext({
      viewport: { width: 320, height: 700 },
      colorScheme: "light",
    });
    const page = await context.newPage();
    await page.route("**/api/pro/cabinet-ui-preferences", async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "conflict", code: "VERSION_CONFLICT" }),
        });
        return;
      }
      await route.continue();
    });
    const editorEntry = { name: "impl-320-light-editor", capture: "FAIL", verify: "NOT_RUN" };
    const errorEntry = { name: "impl-320-light-save-error", capture: "FAIL", verify: "NOT_RUN" };
    try {
      await page.goto(`${BASE}/dev/r01-agent-shell?theme=light`, { waitUntil: "networkidle" });
      await page.getByRole("button", { name: "Ещё разделы" }).click();
      await page.getByRole("button", { name: "Настроить нижнюю панель" }).click();
      await page.getByText("Сканер", { exact: true }).last().click();
      await page.getByTestId("mobile-replace-wallet").click();
      await page.locator("dialog[open]").screenshot({
        path: path.join(OUT_DIR, "impl-320-light-editor.png"),
      });
      editorEntry.capture = "CAPTURED";
      editorEntry.verify = "PASS";
      await page.getByRole("button", { name: "Сохранить" }).click();
      await page.getByRole("alert").waitFor({ timeout: 10_000 });
      await page.locator("dialog[open]").screenshot({
        path: path.join(OUT_DIR, "impl-320-light-save-error.png"),
      });
      errorEntry.capture = "CAPTURED";
      errorEntry.verify = "PASS";
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (editorEntry.capture !== "CAPTURED") editorEntry.error = msg;
      else errorEntry.error = msg;
    }
    results.push(editorEntry, errorEntry);
    await context.close();
  }

  await browser.close();

  const artifactRoot = path.dirname(OUT_DIR);
  const report = {
    generatedAt: new Date().toISOString(),
    note: "Geometry compared explicitly; PNG CAPTURED != auto 1:1 approval",
    geometryTable,
    results,
  };
  await writeFile(path.join(artifactRoot, "GEOMETRY-TOKENS.json"), JSON.stringify(geometryTable, null, 2));
  await writeFile(path.join(artifactRoot, "TEST-RESULTS-screenshots.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
