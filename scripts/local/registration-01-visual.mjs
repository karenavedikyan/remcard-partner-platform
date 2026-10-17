#!/usr/bin/env node
/**
 * REGISTRATION-01 visual pairs: frozen prototype ref + platform impl.
 * Run AFTER committing capture code (records exact git SHA).
 *
 * Welcome on `/` is SSR-gated: start platform dev with
 *   REGISTRATION_SSR_WELCOME=1
 * (see capabilities-server.ts). Playwright route mocks do not affect SSR.
 */
import { execSync, spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "artifacts/remcard-registration-01/screenshots");
const IMPL_BASE = process.env.REGISTRATION_VISUAL_BASE ?? "http://127.0.0.1:3020";
const NAV_REPO = process.env.REGISTRATION_REF_REPO ?? "/agent/repos/remcard-navigator";
const REF_BRANCH =
  process.env.REGISTRATION_REF_BRANCH ?? "origin/implementation/remcard-reference-20261014";
const PROTO_DIR = process.env.REGISTRATION_PROTO_DIR ?? "/tmp/reg-prototype-20261017";
const PROTO_PORT = Number(process.env.REGISTRATION_PROTO_PORT ?? "3099");
const PROTO_BASE = `http://127.0.0.1:${PROTO_PORT}`;
const REFERENCE_SHA_IMMUTABLE =
  process.env.REGISTRATION_REF_SHA ?? "771cc658a415a5d05b964f29f675d32db449198b";
const VISUAL_01_5 = process.env.REGISTRATION_VISUAL_01_5 === "1";

const CODE_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
const RUNNER_SHA = CODE_SHA;
const TREE_DIRTY =
  execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" }).trim().length > 0;
const REF_SHA = execSync(`git -C "${NAV_REPO}" rev-parse ${REF_BRANCH}`, {
  encoding: "utf8",
}).trim();

const DEV_OVERLAY_HIDE = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog],
  #webpack-dev-server-client-overlay, .nextjs-toast-errors-parent { display: none !important; }
`;

const PROTO_DEMO_HIDE = `
  .demo-top, .mobile-demo-settings, .review-toolbar, .entry-disclaimer,
  details.review-details, #review, .review-details {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }
`;

async function preparePrototypeTree() {
  await mkdir(PROTO_DIR, { recursive: true });
  execSync(
    `git -C "${NAV_REPO}" archive ${REF_BRANCH} docs/reference/registration-20261017 | tar -x -C "${PROTO_DIR}"`,
    { stdio: "pipe" },
  );
  return path.join(PROTO_DIR, "docs/reference/registration-20261017");
}

async function startPrototypeServer(protoRoot) {
  const proc = spawn("python3", ["-m", "http.server", String(PROTO_PORT)], {
    cwd: protoRoot,
    stdio: "ignore",
  });
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${PROTO_BASE}/roles.html`);
      if (res.ok) return proc;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error("Prototype static server failed to start");
}

async function pngSize(filePath) {
  const buf = await readFile(filePath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function applyTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.dataset.theme = t;
  }, theme);
}

async function applyPrototypeTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme") || "light",
    );
    if (current === theme) break;
    const toggle = page.locator('[data-action="theme"]');
    if (await toggle.count()) {
      await toggle.click();
      await page.waitForTimeout(theme === "dark" ? 350 : 150);
    } else break;
  }
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.dataset.theme = t;
  }, theme);
}

async function mockAuthGuest(page) {
  await page.route("**/api/remcard/api/auth/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: null }),
    });
  });
}

async function mockRegistrationCapabilities(page) {
  await page.route("**/api/remcard/api/pro/registration/capabilities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contractVersion: "2026-10-17.registration-01",
        welcomeEnabled: true,
        agentRegistrationPathEnabled: true,
        legacyLoginPathEnabled: true,
      }),
    });
  });
}

async function hideDevChrome(page) {
  await page.addStyleTag({ content: DEV_OVERLAY_HIDE });
  await page.evaluate(() => {
    const hideHost = (host) => {
      if (!host?.shadowRoot) return;
      const style = document.createElement("style");
      style.textContent =
        "nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog] { display: none !important; }";
      host.shadowRoot.appendChild(style);
    };
    hideHost(document.querySelector("nextjs-portal"));
    document.querySelectorAll("nextjs-portal").forEach(hideHost);
  });
}

async function assertDevChromeHidden(page) {
  const visible = await page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    if (!portal) return false;
    const rect = portal.getBoundingClientRect();
    const style = getComputedStyle(portal);
    return rect.width > 0 && rect.height > 0 && style.display !== "none";
  });
  if (visible) throw new Error("Next dev overlay still visible before capture");
}

async function waitForCaptureStabilization(page, theme, kind, step) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(theme === "dark" ? 450 : 200);
  if (step !== "types") return;
  const cardSelector =
    kind === "reference" ? ".role-card" : '[data-testid="registration-types-grid"] label';
  await page.waitForSelector(cardSelector, { timeout: 30_000 });
  await page.waitForFunction(
    ({ sel, isDark }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const bg = getComputedStyle(el).backgroundColor;
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return !isDark;
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (!isDark) return true;
      // Reject transient unreadable pale cards; accept settled dark surfaces.
      if (r > 190 && g > 190 && b > 190) return false;
      return r <= 80 && g <= 80 && b <= 80;
    },
    { sel: cardSelector, isDark: theme === "dark" },
    { timeout: 20_000 },
  );
}

async function measureProgressRow(page, kind) {
  return page.evaluate((sourceKind) => {
    const list =
      document.querySelector('ol[aria-label="Этапы регистрации"]') ??
      document.querySelector(".entry-progress");
    if (!list) return null;
    const items = [...list.querySelectorAll("li")];
    const stageTops = items.map((li) => {
      const marker = li.querySelector("span");
      const box = (marker ?? li).getBoundingClientRect();
      return Math.round(box.top * 1000) / 1000;
    });
    const listStyle = getComputedStyle(list);
    return {
      display: listStyle.display,
      gridTemplateColumns: listStyle.gridTemplateColumns,
      stageTops,
      stageTopSpread:
        stageTops.length > 0 ? Math.max(...stageTops) - Math.min(...stageTops) : null,
    };
  }, kind);
}

async function measureTypesLayout(page, kind) {
  return page.evaluate((sourceKind) => {
    const grid =
      sourceKind === "reference"
        ? document.querySelector(".role-grid")
        : document.querySelector('[data-testid="registration-types-grid"]');
    const h1 = document.querySelector(".intro h1, .typesIntro h1, h1");
    const card =
      sourceKind === "reference"
        ? document.querySelector(".role-card")
        : document.querySelector('[data-testid="registration-types-grid"] label');
    const gridBox = grid?.getBoundingClientRect();
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const gridStyle = grid ? getComputedStyle(grid) : null;
    const cardStyle = card ? getComputedStyle(card) : null;
    const cols = gridStyle?.gridTemplateColumns?.split(/\s+/).filter(Boolean) ?? [];
    return {
      grid: gridBox
        ? {
            x: Math.round(gridBox.x * 100) / 100,
            width: Math.round(gridBox.width * 100) / 100,
            columnCount: cols.length,
            columnWidthsPx: cols.map((c) => Math.round(parseFloat(c) || 0)),
            gridTemplateColumns: gridStyle?.gridTemplateColumns ?? null,
          }
        : null,
      h1: h1Style
        ? {
            fontSizePx: Math.round(parseFloat(h1Style.fontSize) * 100) / 100,
            lineHeight: h1Style.lineHeight,
          }
        : null,
      card: cardStyle
        ? {
            backgroundColor: cardStyle.backgroundColor,
            color: cardStyle.color,
            display: cardStyle.display,
            flexDirection: cardStyle.flexDirection,
            minHeight: cardStyle.minHeight,
          }
        : null,
    };
  }, kind);
}

function assertMobileGridParity(refMeasure, implMeasure, width) {
  if (![375, 320].includes(width) || !refMeasure?.grid || !implMeasure?.grid) return [];
  const failures = [];
  const tol = 1;
  for (const [label, refVal, implVal] of [
    ["grid.x", refMeasure.grid.x, implMeasure.grid.x],
    ["grid.width", refMeasure.grid.width, implMeasure.grid.width],
  ]) {
    if (Math.abs(refVal - implVal) > tol) {
      failures.push(`${width}:${label}: ref=${refVal} impl=${implVal} (tol ${tol}px)`);
    }
  }
  return failures;
}

function assertProgressRowParity(refProgress, implProgress, width) {
  if (![375, 320].includes(width) || !refProgress?.stageTops || !implProgress?.stageTops) {
    return [];
  }
  const failures = [];
  if (refProgress.stageTops.length !== 4 || implProgress.stageTops.length !== 4) {
    failures.push(`${width}:progress: expected 4 stages`);
    return failures;
  }
  const implSpread = implProgress.stageTopSpread ?? 0;
  if (implSpread > 1) {
    failures.push(`${width}:progress: stageTopSpread=${implSpread} (4th column wrapped)`);
  }
  const refSpread = refProgress.stageTopSpread ?? 0;
  if (refSpread > 1) {
    failures.push(`${width}:progress: ref stageTopSpread=${refSpread}`);
  }
  return failures;
}

function assertGridParity(refMeasure, implMeasure, width) {
  if (width !== 1440 || !refMeasure?.grid || !implMeasure?.grid) return [];
  const failures = [];
  const tol = 2;
  for (const [label, refVal, implVal] of [
    ["grid.x", refMeasure.grid.x, implMeasure.grid.x],
    ["grid.width", refMeasure.grid.width, implMeasure.grid.width],
    ["grid.columnCount", refMeasure.grid.columnCount, implMeasure.grid.columnCount],
  ]) {
    if (Math.abs(refVal - implVal) > tol) {
      failures.push(`${label}: ref=${refVal} impl=${implVal} (tol ${tol}px)`);
    }
  }
  if (refMeasure.grid.columnCount === 3 && implMeasure.grid.columnCount === 3) {
    for (let i = 0; i < 3; i++) {
      const d = Math.abs(refMeasure.grid.columnWidthsPx[i] - implMeasure.grid.columnWidthsPx[i]);
      if (d > tol) {
        failures.push(`grid.col${i + 1}: ref=${refMeasure.grid.columnWidthsPx[i]} impl=${implMeasure.grid.columnWidthsPx[i]}`);
      }
    }
  }
  return failures;
}

async function verifyViewport(page, expectedWidth) {
  const inner = await page.evaluate(() => window.innerWidth);
  if (inner !== expectedWidth) {
    throw new Error(`Viewport mismatch: expected ${expectedWidth}, got ${inner}`);
  }
}

async function verifyTypesStep(page) {
  const h1 = await page.locator("h1").first().innerText();
  if (!/Какой тип партнёрства/i.test(h1)) {
    throw new Error(`VERIFY types failed: h1="${h1}"`);
  }
  if ((await page.locator("#embedded-auth-title").count()) > 0) {
    throw new Error("VERIFY types failed: auth step visible");
  }
}

async function captureRecord(page, fileName, expectedWidth, theme, step, kind, verifyFn, layoutMeasure) {
  await verifyViewport(page, expectedWidth);
  const dataTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (dataTheme !== theme) {
    throw new Error(`Theme expected ${theme}, got ${dataTheme}`);
  }
  await waitForCaptureStabilization(page, theme, kind, step);
  if (kind === "reference") {
    await hidePrototypeDemoChrome(page);
  }
  await hideDevChrome(page);
  await assertDevChromeHidden(page);
  await verifyFn(page);
  const filePath = path.join(OUT, fileName);
  const fullPageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: filePath, fullPage: true });
  const png = await pngSize(filePath);
  if (png.width !== expectedWidth) {
    throw new Error(`PNG width ${png.width} != ${expectedWidth} for ${fileName}`);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  if (overflow) throw new Error(`Horizontal overflow at ${fileName}`);
  return {
    file: fileName,
    kind,
    step,
    theme,
    url: page.url(),
    codeSha: CODE_SHA,
    viewportWidth: expectedWidth,
    pngWidth: png.width,
    pngHeight: png.height,
    fullPageHeight,
    layout: layoutMeasure,
    verify: "passed",
  };
}

async function hidePrototypeDemoChrome(page) {
  await page.addStyleTag({ content: PROTO_DEMO_HIDE });
}

async function measureWelcomeLayout(page, kind) {
  return page.evaluate((sourceKind) => {
    const root =
      sourceKind === "reference"
        ? document.querySelector(".welcome-page, .welcome-hero")
        : document.querySelector('[data-testid="registration-welcome"]');
    const btn =
      sourceKind === "reference"
        ? document.querySelector(".welcome-action .btn")
        : root?.querySelector("a[class*='primaryBtn']");
    const action =
      sourceKind === "reference"
        ? document.querySelector(".welcome-action")
        : root?.querySelector("[class*='action']");
    const btnStyle = btn ? getComputedStyle(btn) : null;
    const actionStyle = action ? getComputedStyle(action) : null;
    const h1 = document.querySelector(".welcome-copy h1, [data-testid='registration-welcome'] h1");
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const actionBox = action?.getBoundingClientRect();
    return {
      actionDisplay: actionStyle?.flexDirection ?? null,
      actionAlign: actionStyle?.alignItems ?? null,
      actionGap: actionStyle?.gap ?? null,
      btnBg: btnStyle?.backgroundColor ?? null,
      btnColor: btnStyle?.color ?? null,
      h1FontSizePx: h1Style ? Math.round(parseFloat(h1Style.fontSize) * 100) / 100 : null,
      h1LineHeight: h1Style?.lineHeight ?? null,
      actionTopPx: actionBox ? Math.round(actionBox.top) : null,
    };
  }, kind);
}

async function openPrototypeAgentStep(page, theme, width, stopStep) {
  await openPrototypeTypes(page, theme, width);
  await page.locator(".role-card").filter({ hasText: "Агент" }).first().click();
  await page.getByRole("button", { name: /Продолжить/i }).click();
  await page.waitForSelector("#entry-data-input", { timeout: 30_000 });
  if (stopStep === "data-name") return;
  await page.fill("#entry-data-input", "QA Visual");
  await page.getByRole("button", { name: /Продолжить|К подтверждению/i }).click();
  await page.waitForSelector("#entry-data-input", { timeout: 15_000 });
  if (stopStep === "data-city") return;
  await page.fill("#entry-data-input", "Москва");
  await page.getByRole("button", { name: /Продолжить|К подтверждению/i }).click();
  await page.waitForSelector("h1", { timeout: 15_000 });
  if (stopStep === "auth-providers") return;
  const maxBtn = page.getByRole("button", { name: /MAX/i });
  if (await maxBtn.count()) await maxBtn.first().click();
  await page.waitForSelector("#entry-code, #entry-code-title, h1", { timeout: 15_000 });
}

async function openImplAgentStep(page, stopStep) {
  await page.locator('label:has(input[value="agent"])').click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: /Продолжить/ }).click();
  await page.waitForSelector('[data-testid="registration-entry-data"]', { timeout: 15_000 });
  if (stopStep === "data-name") return;
  await page.getByLabel(/Ваше имя/i).fill("QA Visual");
  await page.getByRole("button", { name: /Продолжить|К подтверждению/i }).click();
  await page.getByLabel(/Город/i).fill("Москва");
  if (stopStep === "data-city") return;
  await page.getByRole("button", { name: /Продолжить|К подтверждению/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-auth-providers"]', { timeout: 15_000 });
  if (stopStep === "auth-providers") return;
  await page.getByRole("button", { name: /Продолжить с MAX/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-auth-code"]', { timeout: 15_000 });
}

async function openImplTypes(page, theme, width) {
  await mockRegistrationCapabilities(page);
  await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${IMPL_BASE}/join`, { waitUntil: "domcontentloaded" });
  await applyTheme(page, theme);
  await hideDevChrome(page);
  await page.waitForSelector('[data-testid="registration-types-grid"] label', {
    timeout: 30_000,
  });
}

async function openPrototypeTypes(page, theme, width) {
  await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
  await page.goto(`${PROTO_BASE}/roles.html`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(
    () => !document.getElementById("load-message")?.textContent?.includes("Загружаем"),
    { timeout: 60_000 },
  );
  const registerBtn = page.locator('[data-entry="register"]').first();
  if (await registerBtn.count()) {
    await registerBtn.click();
  } else {
    await page.locator('[data-action="register"]').first().click();
  }
  await page.waitForSelector("h1", { timeout: 30_000 });
  await applyPrototypeTheme(page, theme);
  await hidePrototypeDemoChrome(page);
  const h1 = await page.locator(".intro h1, h1").first().innerText();
  if (!/Какой тип партнёрства/i.test(h1)) {
    throw new Error(`Prototype choose screen not ready: "${h1}"`);
  }
  await page.waitForSelector(".role-grid .role-card", { timeout: 30_000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const protoRoot = await preparePrototypeTree();
  const protoProc = await startPrototypeServer(protoRoot);

  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const captures = [];
  const pairs = [];
  const parityFailures = [];

  const typeMatrix = [
    { theme: "light", width: 1440, suffix: "1440-light" },
    { theme: "dark", width: 1440, suffix: "1440-dark" },
    { theme: "light", width: 375, suffix: "375-light" },
    { theme: "dark", width: 375, suffix: "375-dark" },
    { theme: "dark", width: 320, suffix: "320-dark" },
  ];

  if (!VISUAL_01_5) for (const { theme, width, suffix } of typeMatrix) {
    let refMeasure = null;
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openPrototypeTypes(page, theme, width);
      refMeasure = await measureTypesLayout(page, "reference");
      const refProgress = await measureProgressRow(page, "reference");
      if (refMeasure) refMeasure.progress = refProgress;
      captures.push(
        await captureRecord(
          page,
          `ref-types-${suffix}.png`,
          width,
          theme,
          "types",
          "reference",
          verifyTypesStep,
          refMeasure,
        ),
      );
      await context.close();
    }
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openImplTypes(page, theme, width);
      const implMeasure = await measureTypesLayout(page, "implementation");
      const implProgress = await measureProgressRow(page, "implementation");
      if (implMeasure) implMeasure.progress = implProgress;
      parityFailures.push(...assertGridParity(refMeasure, implMeasure, width));
      parityFailures.push(...assertMobileGridParity(refMeasure, implMeasure, width));
      parityFailures.push(...assertProgressRowParity(refMeasure?.progress, implProgress, width));
      captures.push(
        await captureRecord(
          page,
          `impl-types-${suffix}.png`,
          width,
          theme,
          "types",
          "implementation",
          verifyTypesStep,
          implMeasure,
        ),
      );
      pairs.push({ pair: `types-${suffix}`, ref: `ref-types-${suffix}.png`, impl: `impl-types-${suffix}.png` });
      await context.close();
    }
  }

  const entryStepMatrix = [
    { step: "data-name", suffix: "1440-light", theme: "light", width: 1440 },
    { step: "data-name", suffix: "375-dark", theme: "dark", width: 375 },
    { step: "data-city", suffix: "1440-light", theme: "light", width: 1440 },
    { step: "data-city", suffix: "375-dark", theme: "dark", width: 375 },
    { step: "auth-providers", suffix: "1440-light", theme: "light", width: 1440 },
    { step: "auth-providers", suffix: "375-dark", theme: "dark", width: 375 },
    { step: "auth-code", suffix: "375-dark", theme: "dark", width: 375 },
    { step: "auth-code", suffix: "320-dark", theme: "dark", width: 320 },
    ...(VISUAL_01_5
      ? [{ step: "auth-providers", suffix: "320-progress-dark", theme: "dark", width: 320 }]
      : [{ step: "data-name", suffix: "320-dark", theme: "dark", width: 320 }]),
  ];

  for (const { step, suffix, theme, width } of entryStepMatrix) {
    const refFile = `ref-${step}-${suffix}.png`;
    const implFile = `impl-${step}-${suffix}.png`;
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openPrototypeAgentStep(page, theme, width, step);
      await applyPrototypeTheme(page, theme);
      await hidePrototypeDemoChrome(page);
      captures.push(
        await captureRecord(page, refFile, width, theme, step, "reference", async (p) => {
          const h1 = await p.locator("h1").first().innerText();
          if (step.startsWith("data") && !/(обращаться|город)/i.test(h1)) throw new Error(`ref ${step} h1=${h1}`);
          if (step === "auth-providers" && !/подтверд|вход/i.test(h1)) throw new Error(`ref auth h1=${h1}`);
          if (step === "auth-code" && !/код/i.test(h1)) throw new Error(`ref code h1=${h1}`);
        }, null),
      );
      await context.close();
    }
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await mockRegistrationCapabilities(page);
      await mockAuthGuest(page);
      await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
      await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${IMPL_BASE}/join`, { waitUntil: "domcontentloaded" });
      await applyTheme(page, theme);
      await hideDevChrome(page);
      await page.waitForSelector('[data-testid="registration-types-grid"] label', { timeout: 30_000 });
      await openImplAgentStep(page, step);
      captures.push(
        await captureRecord(page, implFile, width, theme, step, "implementation", async (p) => {
          if (step.startsWith("data")) {
            await p.waitForSelector('[data-testid="registration-entry-data"]');
          } else if (step === "auth-providers") {
            await p.waitForSelector('[data-testid="registration-entry-auth-providers"]');
          } else {
            await p.waitForSelector('[data-testid="registration-entry-auth-code"]');
          }
        }, null),
      );
      pairs.push({ pair: `${step}-${suffix}`, ref: refFile, impl: implFile });
      await context.close();
    }
  }

  const welcomeRefLayouts = {};
  for (const { theme, width, suffix } of [
    { theme: "light", width: 1440, suffix: "1440-light" },
    { theme: "light", width: 375, suffix: "375-light" },
    { theme: "dark", width: 375, suffix: "375-dark" },
    { theme: "dark", width: 320, suffix: "320-dark" },
  ]) {
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
      await page.goto(`${PROTO_BASE}/roles.html`, { waitUntil: "networkidle" });
      await applyPrototypeTheme(page, theme);
      await hidePrototypeDemoChrome(page);
      welcomeRefLayouts[suffix] = await measureWelcomeLayout(page, "reference");
      captures.push(
        await captureRecord(
          page,
          `ref-welcome-${suffix}.png`,
          width,
          theme,
          "welcome",
          "reference",
          async (p) => {
            const h1 = await p.locator(".welcome-copy h1, h1").first().innerText();
            if (!/клиентами/i.test(h1)) throw new Error(`welcome ref h1=${h1}`);
          },
          welcomeRefLayouts[suffix],
        ),
      );
      await context.close();
    }
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await mockAuthGuest(page);
      await mockRegistrationCapabilities(page);
      await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
      await page.goto(`${IMPL_BASE}/`, { waitUntil: "networkidle" });
      await applyTheme(page, theme);
      await hideDevChrome(page);
      await page.waitForSelector('[data-testid="registration-welcome"]', { timeout: 30_000 });
      const implWelcomeLayout = await measureWelcomeLayout(page, "implementation");
      const refWelcomeLayout = welcomeRefLayouts[suffix];
      if (width === 375 && theme === "dark" && refWelcomeLayout && implWelcomeLayout) {
        if (implWelcomeLayout.actionDisplay === "column" && refWelcomeLayout.actionDisplay === "row") {
          parityFailures.push("welcome-375-dark:action flex-direction column vs ref row");
        }
      }
      captures.push(
        await captureRecord(
          page,
          `impl-welcome-${suffix}.png`,
          width,
          theme,
          "welcome",
          "implementation",
          async (p) => {
            await p.waitForSelector('[data-testid="registration-welcome"]');
          },
          implWelcomeLayout,
        ),
      );
      pairs.push({ pair: `welcome-${suffix}`, ref: `ref-welcome-${suffix}.png`, impl: `impl-welcome-${suffix}.png` });
      await context.close();
    }
  }

  await browser.close();
  protoProc.kill();

  let buildId = null;
  try {
    const html = await fetch(`${IMPL_BASE}/join`).then((r) => r.text());
    const m = html.match(/"buildId":"([^"]+)"/);
    buildId = m?.[1] ?? null;
  } catch {
    buildId = null;
  }

  const report = {
    implBase: IMPL_BASE,
    protoBase: PROTO_BASE,
    codeSha: CODE_SHA,
    runnerSha: RUNNER_SHA,
    buildId,
    treeDirty: TREE_DIRTY,
    referenceSha: REF_SHA,
    referenceShaImmutable: REFERENCE_SHA_IMMUTABLE,
    capturedAt: new Date().toISOString(),
    pngFileCount: captures.length,
    pairCount: pairs.length,
    captureCount: captures.length,
    pairs,
    captures,
    layoutParityFailures: parityFailures,
    typesGridGeometryStatus:
      parityFailures.filter((f) => f.includes("grid") || f.includes("progress")).length === 0
        ? "within-tolerance"
        : "NO-GO",
    pairedCaptureStatus:
      parityFailures.length === 0 ? "pairs-captured-with-layout-metrics" : "NO-GO-layout-parity",
    captureStatus:
      parityFailures.length === 0 ? "geometry-within-tolerance" : "NO-GO-layout-parity",
    invalidSupersededRefs: [],
    remainingVisualGaps: [
      "CAPTURED ≠ pixel PASS; pairs are for human/review diff only.",
      "Welcome link retained on types step (not in frozen prototype footer).",
      "Dark card tokens: impl surface rgb(32,37,32) vs ref rgb(34,37,35) (platform globals — do not change for R06 parallel work).",
      "auth-code: ref prototype demo field vs impl live OTP copy — not production OTP delivery.",
      "Equal PNG widths ≠ visual PASS; review welcome CTA color/row layout via layout.* metrics.",
    ],
    parallelAgentNote:
      "R06-SPECIALIST-TAIL-01 (bc-6cb74748) owns specialist/taxonomy — avoid shared auth.module.css / global token edits.",
    assertions: [
      "step_verify",
      "viewport_verify",
      "theme_verify",
      "no_horizontal_overflow",
      "dev_overlay_hidden_post_navigation",
      "dark_card_computed_settled",
      "layout_json_embedded",
      "mobile_grid_parity_375_320",
      "progress_stage_top_alignment",
    ],
  };
  await writeFile(
    path.join(ROOT, "artifacts/remcard-registration-01/visual-capture.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (parityFailures.length) {
    console.error("Layout parity failures:", parityFailures);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
