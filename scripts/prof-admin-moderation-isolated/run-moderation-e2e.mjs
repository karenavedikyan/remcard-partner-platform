/**
 * PROF admin moderation browser gate — fails on server errors, wrong URLs, missing DOM.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3400").replace(/\/$/, "");
const NAV_URL = (process.env.NAV_E2E_URL ?? "http://127.0.0.1:3401").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const OUT_BASE =
  process.env.PROF_MOD_E2E_ARTIFACTS ??
  path.join("/agent/repos/remcard-navigator/artifacts/prof-admin-catalog-moderation-01/screenshots");
const PASSED_DIR = path.join(OUT_BASE, "passed");
const FAILED_DIR = path.join(OUT_BASE, "failed");

const ADMIN_LOGIN = process.env.CATALOG_QA_ADMIN_LOGIN ?? "catqa-admin@catalog.invalid";
const ADMIN_PASSWORD = process.env.CATALOG_QA_ADMIN_PASSWORD ?? "catalog-qa-admin-pass-16-chars";

const failures = [];

function loadFixtures() {
  const modPath = path.join(path.dirname(STATE_PATH), "moderation-fixtures.json");
  if (!fs.existsSync(modPath)) throw new Error(`missing moderation fixtures: ${modPath}`);
  return JSON.parse(fs.readFileSync(modPath, "utf8"));
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function hardAssert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertHealthyPage(page, label) {
  const url = page.url();
  assert(!url.includes("Application%20error"), `${label}: application error URL`);
  const text = await page.locator("body").innerText().catch(() => "");
  assert(!/Application error:/i.test(text), `${label}: Next.js fatal error screen`);
  assert(!/a server-side exception has occurred/i.test(text), `${label}: server-side exception`);
  assert(!/Что-то пошло не так/i.test(text), `${label}: app error boundary`);
}

async function screenshot(page, relName, passed = true) {
  const dir = passed ? PASSED_DIR : FAILED_DIR;
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, relName), fullPage: true });
}

async function adminPasswordLogin(page, returnTo) {
  const capsResp = page.waitForResponse(
    (r) =>
      r.url().includes("/api/remcard/api/pro/admin/auth/capabilities") &&
      r.request().method() === "GET",
    { timeout: 45000 },
  );
  await page.goto(`${PROF_URL}/login?mode=admin&returnTo=${encodeURIComponent(returnTo)}`, {
    waitUntil: "domcontentloaded",
  });
  await assertHealthyPage(page, "admin login");
  const caps = await capsResp;
  hardAssert(caps.ok(), `admin capabilities HTTP ${caps.status()}`);
  const capsJson = await caps.json();
  hardAssert(
    capsJson?.adminPasswordLogin === true,
    "admin password login disabled in capabilities response",
  );
  await page.getByTestId("admin-login-modal").waitFor({ timeout: 15000 });
  await page.getByTestId("admin-login-form").waitFor({ state: "visible", timeout: 45000 });
  await page.getByTestId("admin-login-input").fill(ADMIN_LOGIN);
  await page.getByTestId("admin-password-input").fill(ADMIN_PASSWORD);
  const loginResp = page.waitForResponse(
    (r) => r.url().includes("password-login") && r.request().method() === "POST",
    { timeout: 20000 },
  );
  await page.getByTestId("admin-login-form").locator('button[type="submit"]').click();
  const resp = await loginResp;
  hardAssert(resp.ok(), `password-login HTTP ${resp.status()}`);
  await page.waitForLoadState("networkidle");
  const cookies = await page.context().cookies();
  hardAssert(
    cookies.some((c) => c.name === "remcard-token" && c.value),
    "remcard-token cookie missing after password login",
  );
  const detailResp = page.waitForResponse(
    (r) => r.url().includes("/organizations/") && r.request().method() === "GET" && r.ok(),
    { timeout: 20000 },
  );
  await page.goto(`${PROF_URL}${returnTo}`, { waitUntil: "domcontentloaded" });
  await detailResp;
  await assertHealthyPage(page, "after admin login");
}

async function runMainSiteSmoke(page) {
  page.on("pageerror", (err) => failures.push(`remcard pageerror: ${err.message}`));
  for (const [name, p] of [
    ["main-home-1440", "/"],
    ["main-team-1440", "/team"],
    ["main-catalog-1440", "/catalog"],
  ]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    const resp = await page.goto(`${NAV_URL}${p}`, { waitUntil: "domcontentloaded" });
    assert(resp && resp.status() < 500, `${name}: HTTP ${resp?.status()}`);
    await assertHealthyPage(page, name);
    await screenshot(page, `${name}.png`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const mob = await page.goto(`${NAV_URL}/`, { waitUntil: "domcontentloaded" });
  assert(mob && mob.status() < 500, `main-home-390 HTTP ${mob?.status()}`);
  await assertHealthyPage(page, "main-home-390");
  await screenshot(page, "main-home-390.png");

  const staffLogin = await page.goto(`${NAV_URL}/login?login=staff`, { waitUntil: "domcontentloaded" });
  assert(staffLogin && staffLogin.status() < 500, "login=staff redirect entry");
  await assertHealthyPage(page, "login-staff-entry");
}

async function runProfModerationFlow(browser, fx) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (err) => failures.push(`prof pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") failures.push(`prof console error: ${msg.text()}`);
  });

  const orgReturn = `/admin/moderation/organizations/${fx.pendingOrgId}`;
  await adminPasswordLogin(page, orgReturn);
  assert(page.url().includes(fx.pendingOrgId), "deep link lands on seeded org after login");
  await page.getByRole("button", { name: /Одобрить заявку/i }).waitFor({ timeout: 20000 });
  await page.getByRole("heading", { level: 1, name: fx.pendingOrgTitle }).waitFor({ timeout: 5000 });
  await screenshot(page, "org-detail-1440.png");

  await page.getByRole("button", { name: /список/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 10000 });
  await page.getByTestId("catalog-public-preview").waitFor({ timeout: 10000 });
  await screenshot(page, "org-preview-list-1440.png");
  await page.getByRole("button", { name: /^Закрыть$/i }).click();

  await page.getByRole("button", { name: /полная карточка/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 10000 });
  await page.getByTestId("moderation-catalog-full-preview").waitFor({ timeout: 20000 });
  await screenshot(page, "org-preview-full-1440.png");
  await page.getByRole("button", { name: /^Закрыть$/i }).click();

  await page.getByRole("button", { name: /Вернуть на доработку/i }).click();
  const reviseField = page.getByLabel(/Что нужно исправить/i);
  await reviseField.waitFor({ timeout: 5000 });
  await reviseField.fill("E2E revise org: первое второе");
  await screenshot(page, "org-revise-dialog-1440.png");
  await page.getByRole("button", { name: /^Отмена$/i }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await assertHealthyPage(page, "org-detail-390");
  await page.getByRole("button", { name: /список/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 10000 });
  await screenshot(page, "org-preview-dialog-390.png");
  await page.getByRole("button", { name: /^Закрыть$/i }).click();
  await screenshot(page, "org-detail-390.png");

  await page.setViewportSize({ width: 1440, height: 900 });

  async function orgModerationAction(orgId, title, action, text) {
    await page.goto(`${PROF_URL}/admin/moderation/organizations/${orgId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("heading", { level: 1, name: title }).waitFor({ timeout: 15000 });
    if (action === "revise") {
      await page.getByRole("button", { name: /Вернуть на доработку/i }).click();
      await page.getByLabel(/Что нужно исправить/i).fill(text);
      const respP = page.waitForResponse(
        (r) => r.url().includes(`/organizations/${orgId}/revise`) && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: /Отправить на доработку/i }).click();
      const r = await respP;
      assert(r.ok(), `org revise ${orgId} HTTP ${r.status()}`);
      await screenshot(page, "org-after-revise-1440.png");
    } else if (action === "reject") {
      await page.getByRole("button", { name: /Отклонить заявку/i }).click();
      await page.getByLabel(/Причина/i).fill(text);
      const respP = page.waitForResponse(
        (r) => r.url().includes(`/organizations/${orgId}/reject`) && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: /^Отклонить$/i }).last().click();
      const r = await respP;
      assert(r.ok(), `org reject ${orgId} HTTP ${r.status()}`);
      await screenshot(page, "org-after-reject-1440.png");
    }
    await assertHealthyPage(page, `org-${action}-${orgId}`);
  }

  await orgModerationAction(
    fx.orgReviseOrgId,
    fx.orgReviseOrgTitle,
    "revise",
    "E2E org revise: уточните описание и контакты.",
  );
  await orgModerationAction(
    fx.orgRejectOrgId,
    fx.orgRejectOrgTitle,
    "reject",
    "E2E org reject: заявка не соответствует правилам каталога.",
  );

  await page.goto(`${PROF_URL}${orgReturn}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1, name: fx.pendingOrgTitle }).waitFor({ timeout: 15000 });
  const orgApproveResp = page.waitForResponse(
    (r) =>
      r.url().includes(`/organizations/${fx.pendingOrgId}/approve`) && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: /Одобрить заявку/i }).click();
  await page.getByRole("button", { name: /Подтвердить одобрение/i }).click();
  const oa = await orgApproveResp;
  assert(oa.ok(), `org approve HTTP ${oa.status()}`);
  await page.getByText(/Решение по организации сохранено/i).waitFor({ timeout: 10000 });
  await screenshot(page, "org-after-approve-1440.png");

  await page.goto(`${PROF_URL}/admin/moderation`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Модерация каталога" }).waitFor();
  const queueApi = page.waitForResponse(
    (r) => r.url().includes("/api/pro/admin/moderation?") && r.request().method() === "GET",
  );
  await page.reload();
  const q = await queueApi;
  assert(q.ok(), `queue GET ${q.status()}`);
  const queueJson = await q.json();
  const rowCount = queueJson?.items?.length ?? 0;
  const totalPending = queueJson?.counts?.totalPending ?? 0;
  hardAssert(rowCount > 0 && totalPending > 0, "queue API returned zero rows for screenshot");
  await page.getByRole("table").waitFor({ timeout: 15000 });
  await page.locator("tbody tr").first().waitFor({ timeout: 15000 });
  await assertHealthyPage(page, "queue-1440");
  await screenshot(page, "queue-1440.png");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("tbody tr").first().waitFor({ timeout: 15000 });
  await assertHealthyPage(page, "queue-390");
  await screenshot(page, "queue-390.png");

  await page.setViewportSize({ width: 1440, height: 900 });

  async function partnerAction(userId, title, action, reasonOrComment, expectStatus) {
    await page.goto(`${PROF_URL}/admin/moderation/partners/${userId}`, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: title }).waitFor({ timeout: 10000 });
    page.once("dialog", (d) => d.accept());
    if (action === "revise") {
      await page.getByPlaceholder("Комментарий для доработки").fill(reasonOrComment);
      const respP = page.waitForResponse(
        (r) => r.url().includes(`/partners/${userId}/revise`) && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: /Вернуть на доработку/i }).click();
      const r = await respP;
      assert(r.status() === expectStatus, `partner revise ${userId} HTTP ${r.status()}`);
    } else if (action === "reject") {
      await page.getByPlaceholder("Причина отклонения").fill(reasonOrComment);
      const respP = page.waitForResponse(
        (r) => r.url().includes(`/partners/${userId}/reject`) && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: /Отклонить/i }).click();
      const r = await respP;
      assert(r.status() === expectStatus, `partner reject ${userId} HTTP ${r.status()}`);
    } else {
      const respP = page.waitForResponse(
        (r) => r.url().includes(`/partners/${userId}/approve`) && r.request().method() === "POST",
      );
      await page.getByRole("button", { name: /^Одобрить$/i }).click();
      const r = await respP;
      assert(r.ok(), `partner approve ${userId} HTTP ${r.status()}`);
    }
    await assertHealthyPage(page, `partner-${action}-${userId}`);
    await screenshot(page, `partner-${action}-${userId}-1440.png`);
  }

  await partnerAction(
    fx.partnerReviseUserId,
    fx.partnerReviseTitle,
    "revise",
    "E2E revise: добавьте фото и описание услуг.",
    200,
  );
  await partnerAction(
    fx.partnerRejectUserId,
    fx.partnerRejectTitle,
    "reject",
    "E2E reject: профиль не соответствует правилам каталога.",
    200,
  );
  await partnerAction(fx.partnerApproveUserId, fx.partnerApproveTitle, "approve", null, 200);

  await page.goto(
    `${PROF_URL}/admin/moderation/organizations/${fx.branchRejectOrgId}?branch=${fx.branchRejectBranchId}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.locator(`#branch-${fx.branchRejectBranchId}`).waitFor({ timeout: 10000 });
  const br = page.waitForResponse(
    (r) =>
      r.url().includes(`/branches/${fx.branchRejectBranchId}/reject`) && r.request().method() === "POST",
  );
  await page
    .locator(`#branch-${fx.branchRejectBranchId}`)
    .getByRole("button", { name: /^Отклонить$/i })
    .click();
  await page.getByLabel(/Причина отказа/i).fill("E2E branch reject: неверный адрес филиала.");
  await page.getByRole("button", { name: /^Отклонить$/i }).last().click();
  const brs = await br;
  assert(brs.ok(), `branch reject HTTP ${brs.status()}`);
  await screenshot(page, "branch-after-reject-1440.png");

  await ctx.close();
}

async function assertProfStaticAssetsHealthy() {
  const loginHtml = await (await fetch(`${PROF_URL}/login`)).text();
  const webpackMatch = loginHtml.match(/\/_next\/static\/chunks\/(webpack-[a-f0-9]+\.js)/);
  hardAssert(webpackMatch, "PROF login HTML missing webpack chunk reference");
  const chunkUrl = `${PROF_URL}/_next/static/chunks/${webpackMatch[1]}`;
  const chunkResp = await fetch(chunkUrl);
  hardAssert(
    chunkResp.ok,
    `PROF stale/mismatched build: ${chunkUrl} HTTP ${chunkResp.status} (restart next after rm -rf .next)`,
  );
}

async function main() {
  fs.mkdirSync(PASSED_DIR, { recursive: true });
  fs.mkdirSync(FAILED_DIR, { recursive: true });
  const fx = loadFixtures();

  const healthProf = await fetch(`${PROF_URL}/login`);
  assert(healthProf.ok, `PROF /login ${healthProf.status}`);
  await assertProfStaticAssetsHealthy();
  const healthNav = await fetch(`${NAV_URL}/api/health`);
  assert(healthNav.ok, `navigator health ${healthNav.status}`);

  const browser = await chromium.launch({ headless: true });
  try {
    const mainCtx = await browser.newContext();
    const mainPage = await mainCtx.newPage();
    await runMainSiteSmoke(mainPage);
    await mainCtx.close();

    await runProfModerationFlow(browser, fx);
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error("[moderation-e2e] FAILURES:");
    for (const f of failures) console.error(" -", f);
    process.exit(1);
  }
  console.log(`[moderation-e2e] OK — passed screenshots in ${PASSED_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
