/**
 * Prototype parity visual gate: STORE/COMPANY /recommendations list shell.
 * Runtime SHAs pinned by run-browser-gate.sh at process start.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/store-company-certificates-parity-01");
const ART = path.join(ART_DIR, "visual-shell");
const failures = [];

function gitHead(repo) {
  return execSync(`git -C ${repo} rev-parse HEAD`, { encoding: "utf8" }).trim();
}

const APPLICATION_RUNTIME = {
  frontendSha:
    process.env.E2E_APPLICATION_FRONTEND_SHA?.trim() ||
    gitHead("/agent/repos/remcard-partner-platform"),
  backendSha:
    process.env.E2E_APPLICATION_BACKEND_SHA?.trim() ||
    gitHead("/agent/repos/remcard-navigator"),
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT?.trim() || new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function loadHarness() {
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
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

async function captureMatrix(page, prefix) {
  fs.mkdirSync(ART, { recursive: true });
  for (const theme of ["light", "dark"]) {
    await setTheme(page, theme);
    await page.waitForTimeout(200);
    for (const [suffix, viewport] of [
      ["1440", { width: 1440, height: 900 }],
      ["390", { width: 390, height: 844 }],
      ["320", { width: 320, height: 640 }],
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      assert(overflow <= 2, `${prefix}-${theme}-${suffix}: horizontal overflow ${overflow}px`);
      await page.screenshot({
        path: path.join(ART, `${prefix}-${theme}-${suffix}.png`),
        fullPage: true,
      });
    }
  }
}

async function waitForBusinessList(page) {
  await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "networkidle", timeout: 120_000 });
  const root = page.getByTestId("business-certificates-root");
  await root.waitFor({ timeout: 90_000 });
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? "";
      return !text.includes("Загрузка…") && !text.includes("Загрузка...");
    },
    { timeout: 90_000 },
  );
  return root;
}

async function assertPrototypeParity(page, label) {
  const root = page.getByTestId("business-certificates-root");
  const ctas = root.getByTestId("business-certificates-create-cta");
  assert((await ctas.count()) === 1, `${label}: exactly one primary create CTA`);
  const details = page.getByTestId("business-certificates-client-arrived");
  assert(await details.count(), `${label}: client-arrived details present`);
  const open = await details.evaluate((el) => el.open);
  assert(!open, `${label}: client-arrived details closed by default`);
  const scan = root.getByRole("link", {
    name: "Проверить сертификат",
    includeHidden: true,
  });
  assert((await scan.count()) === 1, `${label}: scanner link`);
  assert((await scan.getAttribute("href")) === "/scanner", `${label}: scanner href`);
}

async function exerciseRole(page, label, eyebrow, { populatedPrefix, filteredEmptyPrefix }) {
  const root = await waitForBusinessList(page);
  const body = await page.locator("body").innerText();
  assert(
    body.toLowerCase().includes(eyebrow.toLowerCase()),
    `${label}: eyebrow ${eyebrow}`,
  );
  await assertPrototypeParity(page, label);

  await captureMatrix(page, populatedPrefix);

  await page.getByTestId("agent-r03-search").fill("zz-parity-no-match-xyzzy");
  await page.waitForTimeout(500);
  await page.waitForFunction(
    () => {
      const empty = document.querySelector('[data-testid="business-certificates-empty"]');
      return empty && empty.textContent?.includes("Пока нет сертификатов");
    },
    { timeout: 30_000 },
  );
  const emptyCtas = root.getByRole("button", { name: /Создать сертификат/i });
  assert((await emptyCtas.count()) === 1, `${label}: filtered-empty single CTA`);
  await captureMatrix(page, filteredEmptyPrefix);

  await root.getByTestId("business-certificates-create-cta").click();
  await page.getByTestId("specialist-certificate-create-dialog").waitFor({ timeout: 60_000 });
  assert((await root.getByTestId("business-certificates-create-cta").count()) === 1, `${label}: dialog open, one list CTA`);
  await page.keyboard.press("Escape");
}

function writeArtifacts(flow) {
  const captureCompletedAt = new Date().toISOString();
  const payload = {
    ok: failures.length === 0,
    failures,
    application: {
      frontendSha: APPLICATION_RUNTIME.frontendSha,
      backendSha: APPLICATION_RUNTIME.backendSha,
      captureStartedAt: APPLICATION_RUNTIME.captureStartedAt,
      captureCompletedAt,
    },
    flow,
  };
  fs.mkdirSync(ART_DIR, { recursive: true });
  fs.writeFileSync(path.join(ART_DIR, "shell-gate.json"), `${JSON.stringify(payload, null, 2)}\n`);
  fs.writeFileSync(path.join(ART_DIR, "metadata-shell.json"), `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

async function main() {
  const harness = loadHarness();
  const storeToken = harness.roles?.store?.realOwner?.ownerSessionToken;
  const companyToken = harness.roles?.company?.realOwner?.ownerSessionToken;
  assert(storeToken, "missing store realOwner session");
  assert(companyToken, "missing company realOwner session");

  const browser = await chromium.launch({ headless: true });
  const flow = {};

  {
    const { context, page } = await withSession(browser, storeToken, { width: 1440, height: 900 });
    await exerciseRole(page, "store", "Магазин", {
      populatedPrefix: "store-certificates-populated",
      filteredEmptyPrefix: "store-certificates-filtered-empty",
    });
    flow.store = { parityChecks: true, populatedCapture: true, filteredEmptyCapture: true };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyToken, { width: 1440, height: 900 });
    await exerciseRole(page, "company", "Компания", {
      populatedPrefix: "company-certificates-populated",
      filteredEmptyPrefix: "company-certificates-filtered-empty",
    });
    flow.company = { parityChecks: true, populatedCapture: true, filteredEmptyCapture: true };
    await context.close();
  }

  await browser.close();
  const meta = writeArtifacts(flow);
  if (failures.length) {
    console.error(JSON.stringify(meta, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(meta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
