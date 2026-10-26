/**
 * UI-only capture: agent-terms editor contrast + light/dark screenshots (1440 + 390).
 * Requires isolated harness (store owner session) — does not rerun full partnership E2E.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const NAV_ROOT = process.env.NAV_ROOT ?? "/agent/repos/remcard-navigator";
const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3452").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ?? path.join(NAV_ROOT, ".catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve(
  "artifacts/public-agent-terms-and-invite-flow-01/ui-editor-theme-delta",
);
const MIN_CONTRAST = 4.5;
const failures = [];
const contrastChecks = [];

const RUNTIME = {
  frontendSha: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  backendSha: process.env.E2E_APPLICATION_BACKEND_SHA ?? "1267da4274826e06b7358f1a785fe275c9cec836",
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT ?? new Date().toISOString(),
  priorLogicGateCapture: "2026-10-26T09:23:48.000Z",
  priorLogicGateFrontendSha: "9d54e58a9b25dc83282781bffb8820b83e6f845d",
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function parseRgb(cssColor) {
  const m = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function relativeLuminance([r, g, b]) {
  const s = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}

function contrastRatio(fg, bg) {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

async function measurePair(page, fgSel, bgSel, label) {
  const fg = parseRgb(await page.locator(fgSel).evaluate((el) => getComputedStyle(el).color));
  const bg = parseRgb(
    await page.locator(bgSel).evaluate((el) => getComputedStyle(el).backgroundColor),
  );
  assert(fg && bg, `${label}: could not parse computed colors`);
  if (!fg || !bg) return;
  const ratio = contrastRatio(fg, bg);
  contrastChecks.push({ label, ratio: Number(ratio.toFixed(2)), minRequired: MIN_CONTRAST });
  assert(ratio >= MIN_CONTRAST, `${label} contrast ${ratio.toFixed(2)} < ${MIN_CONTRAST}`);
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("remcard-theme", t);
    } catch {
      /* ignore */
    }
  }, theme);
}

async function withSession(browser, token, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addCookies([
    {
      name: "remcard-token",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  return { context, page: await context.newPage() };
}

async function ensurePersisted13(page, storeToken) {
  await page.goto(`${PROF_URL}/partners/agent-terms`, { waitUntil: "networkidle", timeout: 120_000 });
  const doorsRow = page.locator("tr").filter({ hasText: "Двери" });
  await doorsRow.waitFor({ timeout: 60_000 });
  const poolInput = doorsRow.getByLabel("Общий %");
  await poolInput.fill("13");
  const saveWait = page.waitForResponse(
    (res) =>
      res.url().includes("/api/pro/limits/org") &&
      res.request().method() === "POST" &&
      res.status() === 200,
    { timeout: 60_000 },
  );
  await doorsRow.getByRole("button", { name: "Сохранить" }).click();
  await saveWait;
  await page.reload({ waitUntil: "networkidle" });
  const limitsGet = await page.request.get(`${PROF_URL}/api/remcard/api/pro/limits/org`, {
    headers: { Origin: PROF_URL, Cookie: `remcard-token=${storeToken}` },
  });
  assert(limitsGet.ok(), `limits GET ${limitsGet.status()}`);
  const body = await limitsGet.json();
  const doors = (body.limits ?? []).find((l) => l.category === "doors");
  assert(doors && Math.abs(Number(doors.poolPercent) - 13) < 0.01, "persisted 13% doors");
  assert((await poolInput.inputValue()) === "13", "input shows 13 after reload");
}

async function captureEditor(page, name) {
  fs.mkdirSync(ART_DIR, { recursive: true });
  await page.locator('[data-testid="agent-general-terms-lead"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(ART_DIR, `${name}.png`), fullPage: true });
}

async function assertTheme(page, expected) {
  const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  assert(theme === expected, `data-theme=${theme} expected ${expected}`);
}

async function checkReadability(page, themeTag) {
  const lead = page.locator('[data-testid="agent-general-terms-lead"]');
  const fg = parseRgb(await lead.evaluate((el) => getComputedStyle(el).color));
  const bg = parseRgb(
    await lead.evaluate((el) => {
      let node = el.parentElement;
      while (node) {
        const bgColor = getComputedStyle(node).backgroundColor;
        if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
          return bgColor;
        }
        node = node.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    }),
  );
  assert(fg && bg, `${themeTag} lead: parse colors`);
  if (fg && bg) {
    const ratio = contrastRatio(fg, bg);
    contrastChecks.push({
      label: `${themeTag} lead on panel surface`,
      ratio: Number(ratio.toFixed(2)),
      minRequired: MIN_CONTRAST,
    });
    assert(ratio >= MIN_CONTRAST, `${themeTag} lead/panel ${ratio.toFixed(2)}`);
  }
  await measurePair(
    page,
    '[data-testid="agent-general-terms-category-select"]',
    '[data-testid="agent-general-terms-category-select"]',
    `${themeTag} category select`,
  );
}

async function main() {
  fs.mkdirSync(ART_DIR, { recursive: true });
  if (!fs.existsSync(STATE_PATH)) {
    failures.push(`missing state ${STATE_PATH}`);
    finish();
    return;
  }

  execSync("pnpm exec tsx scripts/prof-admin-moderation-isolated/seed-agent-terms-invite-flow.ts", {
    cwd: NAV_ROOT,
    env: { ...process.env, CATALOG_QA_ROOT: path.join(NAV_ROOT, ".catalog-qa-isolated") },
    stdio: "pipe",
  });

  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const storeToken = state.roles?.agentTermsFlow?.storeOwner?.ownerSessionToken;
  if (!storeToken) {
    failures.push("store owner token missing");
    finish();
    return;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const { context, page } = await withSession(browser, storeToken, { width: 1440, height: 900 });
    await setTheme(page, "light");
    await ensurePersisted13(page, storeToken);
    await assertTheme(page, "light");
    await checkReadability(page, "light-1440");
    await captureEditor(page, "store-agent-terms-editor-light-1440");

    await setTheme(page, "dark");
    await page.reload({ waitUntil: "networkidle" });
    await assertTheme(page, "dark");
    await checkReadability(page, "dark-1440");
    await captureEditor(page, "store-agent-terms-editor-dark-1440");

    await page.setViewportSize({ width: 390, height: 844 });
    await setTheme(page, "light");
    await page.reload({ waitUntil: "networkidle" });
    await assertTheme(page, "light");
    await checkReadability(page, "light-390");
    await captureEditor(page, "store-agent-terms-editor-light-390");

    await setTheme(page, "dark");
    await page.reload({ waitUntil: "networkidle" });
    await assertTheme(page, "dark");
    await checkReadability(page, "dark-390");
    await captureEditor(page, "store-agent-terms-editor-dark-390");

    await context.close();
  } finally {
    await browser.close();
  }

  finish();
}

function finish() {
  const payload = { failures, runtime: RUNTIME, contrastChecks };
  fs.writeFileSync(path.join(ART_DIR, "capture.json"), JSON.stringify(payload, null, 2), "utf8");
  const report = `# UI delta — agent-terms editor theme

## Status
${failures.length ? "BLOCKED" : "READY FOR REVIEW"}

## Runtime
- Frontend (this capture): \`${RUNTIME.frontendSha}\`
- Backend (unchanged): \`${RUNTIME.backendSha}\`
- Capture: \`${RUNTIME.captureStartedAt}\`

## Scope
Dark/light contrast fix for \`PartnerAgentGeneralTermsEditor\` only. Full partnership logic gate remains on FE \`${RUNTIME.priorLogicGateFrontendSha}\` at \`${RUNTIME.priorLogicGateCapture}\` (not re-run).

## Commands
\`\`\`bash
pnpm exec tsc --noEmit
pnpm run build
pnpm exec vitest run src/components/partners/PartnerAgentGeneralTermsEditor.test.tsx
node scripts/public-agent-terms-and-invite-flow-01/capture-agent-terms-editor-ui.mjs
\`\`\`

## Contrast (computed)
${JSON.stringify(contrastChecks, null, 2)}

## Failures
${failures.length ? failures.map((f) => `- ${f}`).join("\n") : "- none"}

## Artifact note (non-blocking)
\`visual-clickthrough/agent-accept-dark-390.png\` from the prior full gate is a **light-theme outgoing queue** frame, not dark acceptance proof — do not use it as acceptance evidence.

## Not claimed
- Historical certificate snapshot lifecycle
- Concurrency of all partnership offer-write paths
`;
  fs.writeFileSync(path.join(ART_DIR, "REPORT.md"), report, "utf8");
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, ...payload }, null, 2));
}

main().catch((e) => {
  failures.push(String(e));
  finish();
});
