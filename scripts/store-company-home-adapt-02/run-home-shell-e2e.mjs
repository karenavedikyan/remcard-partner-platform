/**
 * Full CabinetShell acceptance on isolated catalog-qa loopback (production build).
 * Uses synthetic prof-test store/company tokens from ui-harness-state.json — no prod logins.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const NAV_URL = (process.env.NAV_E2E_URL ?? "http://127.0.0.1:3421").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART = path.resolve("artifacts/store-company-home-adapt-02/visual-shell");
const failures = [];
/** Non-fatal 401 observations (logged in shell-gate.json for audit). */
const observedHttp401 = [];
const checklist = { storeScannerHeadingAndFind: false, companyInviteWizardDialog: false };

function gitHead(repo) {
  return execSync(`git -C ${repo} rev-parse HEAD`, { encoding: "utf8" }).trim();
}

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function loadHarness() {
  if (!fs.existsSync(STATE_PATH)) {
    throw new Error(`missing harness state: ${STATE_PATH} (run seed-ui-harness.ts)`);
  }
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
  const page = await context.newPage();
  page.on("response", (res) => {
    if (res.status() !== 401) return;
    const url = res.url();
    observedHttp401.push({ url, method: res.request().method() });
    if (url.includes("business-home/metrics")) {
      failures.push(`FATAL metrics 401: ${url}`);
    }
  });
  page.on("pageerror", (err) => failures.push(`pageerror: ${String(err)}`));
  return { context, page };
}

async function assertHealthyHome(page, label) {
  await page.getByRole("heading", { level: 1, name: "Ваш кабинет" }).waitFor({ timeout: 60_000 });
  const banner = page.getByTestId("prof-test-mode-banner");
  assert(await banner.count(), `${label}: prof-test banner (full shell)`);
  const text = await page.locator("body").innerText();
  assert(!/Application error:/i.test(text), `${label}: fatal error screen`);
}

async function captureShell(page, name) {
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: path.join(ART, name), fullPage: true });
}

/** Poll until React commits primary stat (not loading "…"). */
async function waitForPrimarySales(page, expected, label) {
  const value = page.locator('[aria-live="polite"] > div').first().locator("strong");
  await value.waitFor({ state: "attached", timeout: 60_000 });
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const text = (await value.innerText()).trim();
    if (text === expected) return;
    if (text !== "…" && text !== "" && text !== expected) {
      failures.push(`${label}: primary sales expected ${expected} got ${text}`);
      return;
    }
    await page.waitForTimeout(75);
  }
  const final = (await value.innerText()).trim();
  failures.push(`${label}: primary sales expected ${expected} timed out (last=${final})`);
}

async function exerciseStoreTwoBranchMetrics(page, harness) {
  const store = harness.roles?.store ?? {};
  const branchA = store.branchIdA ?? store.branchId;
  const branchB = store.branchIdB;
  assert(branchA && branchB, "harness missing branchIdA/B (run seed-business-home-shell)");

  await page.goto(`${PROF_URL}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await assertHealthyHome(page, "store-2br");
  const select = page.getByTestId("business-home-branch-select");
  await select.waitFor({ timeout: 30_000 });

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`branchId=${branchA}`) && r.status() === 200,
      { timeout: 60_000 },
    ),
    select.selectOption(branchA),
  ]);
  await waitForPrimarySales(page, "1", "branch A");

  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes(`branchId=${branchB}`) && r.status() === 200,
      { timeout: 60_000 },
    ),
    select.selectOption(branchB),
  ]);
  await waitForPrimarySales(page, "0", "branch B");
}

async function exerciseStoreForeignDeny(token) {
  const res = await fetch(
    `${NAV_URL}/api/pro/business-home/metrics?branchId=cmforeign000000000000000000`,
    { headers: { cookie: `remcard-token=${token}` } },
  );
  assert(res.status === 200, `foreign branch HTTP ${res.status}`);
  const body = await res.json();
  assert(body.metrics?.primary?.state === "invalid_branch", "foreign branch must be invalid_branch");
}

async function exerciseStore(page) {
  await page.goto(`${PROF_URL}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await assertHealthyHome(page, "store");
  await page.getByRole("heading", { level: 2, name: /Начните с продажи по рекомендации/ }).waitFor();
  const cta = page.getByRole("link", { name: /Проверить сертификат/ });
  assert((await cta.getAttribute("href")) === "/scanner", "store CTA href /scanner");
  await cta.click();
  await page.waitForURL(/\/scanner/, { timeout: 30_000 });
  await page.getByRole("heading", { level: 1, name: "Сканер" }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: /^Найти$/ }).waitFor({ timeout: 30_000 });
  checklist.storeScannerHeadingAndFind = true;
}

async function exerciseCompany(page) {
  await page.goto(`${PROF_URL}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await assertHealthyHome(page, "company");
  await page.getByRole("heading", { level: 2, name: /Соберите команду компании/ }).waitFor();
  const cta = page.getByRole("link", { name: /Пригласить сотрудника/ });
  assert((await cta.getAttribute("href"))?.includes("section=team"), "company CTA team section");
  await cta.click();
  await page.waitForURL(/section=team/, { timeout: 30_000 });
  const wizardOpen = page.getByTestId("team-open-invite-wizard").first();
  await wizardOpen.waitFor({ timeout: 60_000 });
  await wizardOpen.click();
  await page.getByRole("dialog", { name: /Пригласить сотрудника/ }).waitFor({ timeout: 30_000 });
  checklist.companyInviteWizardDialog = true;
}

async function assertMasterNotBusinessHome(page) {
  await page.goto(`${PROF_URL}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 60_000 });
  const text = await page.locator("main").innerText();
  assert(!/Начните с продажи по рекомендации/.test(text), "master must not get store business home");
  assert(!/Соберите команду компании/.test(text), "master must not get company business home");
}

async function captureMatrix(page, prefix) {
  for (const theme of ["light", "dark"]) {
    for (const width of [1440, 375, 320]) {
      await page.setViewportSize({ width, height: width <= 375 ? 844 : 900 });
      await setTheme(page, theme);
      await page.goto(`${PROF_URL}/`, { waitUntil: "networkidle", timeout: 120_000 });
      await assertHealthyHome(page, `${prefix}-${theme}-${width}`);
      await captureShell(page, `${prefix}-${theme}-${width}.png`);
    }
  }
}

async function main() {
  const harness = loadHarness();
  const storeToken = harness.roles?.store?.delegationToken;
  const companyToken = harness.roles?.company?.delegationToken;
  const masterToken = harness.roles?.master?.delegationToken;
  if (!storeToken || !companyToken || !masterToken) {
    throw new Error("ui-harness-state missing store/company/master delegationToken");
  }

  const browser = await chromium.launch({ headless: true });

  await exerciseStoreForeignDeny(storeToken);

  {
    const { context, page } = await withSession(browser, storeToken, { width: 1440, height: 900 });
    await exerciseStoreTwoBranchMetrics(page, harness);
    await exerciseStore(page);
    await captureMatrix(page, "store-home");
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyToken, { width: 1440, height: 900 });
    await exerciseCompany(page);
    await captureMatrix(page, "company-home");
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, masterToken, { width: 1440, height: 900 });
    await assertMasterNotBusinessHome(page);
    await context.close();
  }

  await browser.close();

  const feRuntime =
    process.env.HOME_ADAPT_FE_RUNTIME_SHA?.trim() ||
    gitHead("/agent/repos/remcard-partner-platform");
  const beRuntime =
    process.env.HOME_ADAPT_BE_RUNTIME_SHA?.trim() ||
    gitHead("/agent/repos/remcard-navigator");

  const meta = {
    frontendRuntimeSha: feRuntime,
    backendRuntimeSha: beRuntime,
    profUrl: PROF_URL,
    navUrl: NAV_URL,
    harnessState: STATE_PATH,
    capturedAt: new Date().toISOString(),
    observedHttp401,
    ctaChecks: { ...checklist },
    failures,
    ok: failures.length === 0,
  };
  fs.mkdirSync(path.dirname(ART), { recursive: true });
  const metaPath = path.join(path.dirname(ART), "shell-gate.json");
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join(path.dirname(ART), "metadata-shell.json"),
    JSON.stringify(
      {
        frontendRuntimeSha: meta.frontendRuntimeSha,
        backendRuntimeSha: meta.backendRuntimeSha,
        captureKind: "cabinet-shell-isolated",
        profUrl: PROF_URL,
        navUrl: NAV_URL,
        capturedAt: meta.capturedAt,
      },
      null,
      2,
    ),
  );

  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, art: ART, ...meta }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
