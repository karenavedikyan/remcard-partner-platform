/**
 * Playwright click-through: general terms 12.5%, agent request without %, store offer, accept, editor, discussion link.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const NAV_ROOT = process.env.NAV_ROOT ?? "/agent/repos/remcard-navigator";
const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3452").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ?? path.join(NAV_ROOT, ".catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/public-agent-terms-and-invite-flow-01/visual-clickthrough");
const failures = [];
const evidenceSteps = [];
const presentation = {};

const RUNTIME = {
  frontendSha: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  backendSha: execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT ?? new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function step(name) {
  evidenceSteps.push(name);
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

async function capture(page, name) {
  fs.mkdirSync(ART_DIR, { recursive: true });
  await page.screenshot({ path: path.join(ART_DIR, `${name}.png`), fullPage: true });
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
    env: {
      ...process.env,
      CATALOG_QA_ROOT: path.join(NAV_ROOT, ".catalog-qa-isolated"),
    },
    stdio: "pipe",
  });

  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const flow = state.roles?.agentTermsFlow;
  const storeToken = flow?.storeOwner?.ownerSessionToken;
  const agentToken = flow?.agent?.agentSessionToken;
  const storeUserId = flow?.storeOwner?.userId;
  if (!storeToken || !agentToken) {
    failures.push("agentTermsFlow tokens missing");
    finish();
    return;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const { context: agentCtx, page: agentPage } = await withSession(browser, agentToken, {
      width: 1440,
      height: 900,
    });
    await agentPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      try {
        localStorage.setItem("remcard-theme", "light");
      } catch {
        /* ignore */
      }
    });

    const storeHeading =
      flow.storeOwner.organizationName?.trim() ||
      flow.storeOwner.displayName?.trim() ||
      "Agent terms store";
    const searchQuery = flow.storeOwner.displayName?.trim() || storeHeading;

    const r04StatusRes = await agentPage.request.get(`${PROF_URL}/api/remcard/api/pro/r04/status`, {
      headers: { Origin: PROF_URL, Cookie: `remcard-token=${agentToken}` },
    });
    assert(r04StatusRes.ok(), `agent r04 status ${r04StatusRes.status()}`);
    const r04Status = await r04StatusRes.json();
    presentation.agentR04Api = {
      featureEnabled: Boolean(r04Status.featureEnabled),
      eligible: Boolean(r04Status.eligible),
    };
    assert(r04Status.featureEnabled && r04Status.eligible, "principal agent must be R04-eligible in gate");

    await agentPage.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
    assert(
      (await agentPage.getByTestId("agent-r04-partners").count()) > 0,
      "agent partners shell must be shared-r04 (not legacy store/specialist nav)",
    );
    presentation.agentHub = "shared-r04";

    await agentPage.getByRole("button", { name: "Найти или пригласить партнёра" }).click();
    const findModal = agentPage.getByTestId("agent-r04-modal-find");
    await findModal.waitFor({ timeout: 60_000 });
    const partnerType = findModal.getByTestId("active-partner-type");
    if (await partnerType.count()) {
      await partnerType.selectOption("store");
    }
    await findModal.getByPlaceholder("Название, товар, услуга, этап или ID").fill(searchQuery);
    const searchWait = agentPage.waitForResponse(
      (res) => res.url().includes("/partnership/search") && res.status() === 200,
      { timeout: 60_000 },
    );
    await findModal.getByRole("button", { name: "Найти" }).click();
    await searchWait;

    const storeResult = findModal
      .locator("article")
      .filter({ hasText: storeHeading })
      .first();
    await storeResult.waitFor({ timeout: 60_000 });
    await storeResult.locator("details").filter({ hasText: "Общие условия для агентов" }).click();
    await storeResult.getByText(/12\.5%/).waitFor({ timeout: 30_000 });
    step("ui-read-12.5-pro-search-store");

    await storeResult.getByRole("button", { name: "Пригласить" }).click();
    const inviteDialog = agentPage.locator('[aria-labelledby="invite-title"]');
    await inviteDialog.waitFor({ timeout: 30_000 });
    await inviteDialog
      .getByText(/Числовые ставки указывает принимающий партнёр/i)
      .waitFor({ timeout: 15_000 });
    assert((await inviteDialog.locator(".termsList").count()) === 0, "request dialog has no terms rows");
    await inviteDialog
      .getByLabel("Предмет сотрудничества / интересующие товары или услуги")
      .fill("Интересуют двери (UI gate)");
    const inviteWait = agentPage.waitForResponse(
      (res) => res.url().includes("/partnership/invite") && res.status() === 200,
      { timeout: 60_000 },
    );
    await inviteDialog.getByRole("button", { name: "Отправить запрос" }).click();
    const inviteRes = await inviteWait;
    const inviteBody = await inviteRes.json();
    const partnershipId = inviteBody.partnershipId ?? inviteBody.partnership?.id;
    assert(partnershipId, "partnershipId from UI invite");
    await capture(agentPage, "agent-request-dialog-light-1440");
    await agentPage.keyboard.press("Escape");

    const discussionPost = await agentPage.request.post(
      `${PROF_URL}/api/remcard/api/partnership/discussion-invite`,
      {
        headers: {
          Origin: PROF_URL,
          Cookie: `remcard-token=${agentToken}`,
          "Content-Type": "application/json",
        },
        data: {
          recipientLabel: "UI discussion guest",
          cooperationSubject: "Обсуждение без оффера",
        },
      },
    );
    assert(discussionPost.ok(), `discussion invite ${discussionPost.status()}`);
    const discussionBody = await discussionPost.json();
    const publicRes = await agentPage.request.get(`${PROF_URL}${discussionBody.previewPath}`, {
      headers: { Origin: PROF_URL },
    });
    assert([200, 302].includes(publicRes.status()), `discussion public stage ${publicRes.status()}`);
    step("discussion-public-link");
    await agentCtx.close();

    const { context: storeCtx, page: storePage } = await withSession(browser, storeToken, {
      width: 1440,
      height: 900,
    });
    await storePage.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
    await storePage.getByTestId("agent-r04-partners").waitFor({ timeout: 60_000 });
    presentation.storeHub = "shared-r04-business-store";
    await storePage.getByRole("tab", { name: "Приглашения" }).click();
    await storePage.getByTestId("agent-invites-incoming").click();
    const listRes = await storePage.request.get(`${PROF_URL}/api/remcard/api/partnership/list`, {
      headers: { Origin: PROF_URL, Cookie: `remcard-token=${storeToken}` },
    });
    assert(listRes.ok(), `store list ${listRes.status()}`);
    const listJson = await listRes.json();
    const pending = (listJson.partnerships ?? []).find((p) => p.id === partnershipId);
    assert(pending?.status === "INVITED", `store sees invite (${pending?.status})`);

    const agentName = flow.agent.displayName?.trim() || "Agent terms agent";
    const storeRow = storePage
      .getByTestId("agent-r04-partners-table-row")
      .filter({ hasText: agentName })
      .first();
    await storeRow.getByRole("button", { name: "Детали" }).click();
    await storePage.getByRole("button", { name: "Предложение агенту" }).click();
    const counterDialog = storePage.locator('[aria-labelledby="counter-offer-title"]');
    await counterDialog.waitFor({ timeout: 30_000 });
    await counterDialog.getByLabel("Общий %").fill("11.5");
    assert((await counterDialog.getByLabel("Комментарий").count()) === 0, "counter-offer has no comment field");
    const offerWait = storePage.waitForResponse(
      (res) =>
        res.url().includes(`/api/partnership/${partnershipId}`) &&
        res.request().method() === "PATCH" &&
        res.status() === 200,
      { timeout: 60_000 },
    );
    await counterDialog.getByRole("button", { name: "Отправить" }).click();
    await offerWait;
    await storePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      try {
        localStorage.setItem("remcard-theme", "dark");
      } catch {
        /* ignore */
      }
    });
    await storePage.setViewportSize({ width: 390, height: 844 });
    await capture(storePage, "store-counter-offer-dark-390");

    await storePage.setViewportSize({ width: 390, height: 844 });
    await storePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      try {
        localStorage.setItem("remcard-theme", "dark");
      } catch {
        /* ignore */
      }
    });
    await storePage.goto(`${PROF_URL}/partners/agent-terms`, { waitUntil: "networkidle", timeout: 120_000 });
    const themeBeforeSave = await storePage.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    assert(themeBeforeSave === "dark", `editor theme before save (${themeBeforeSave})`);
    const doorsRow = storePage.locator("tr").filter({ hasText: "Двери" });
    await doorsRow.waitFor({ timeout: 60_000 });
    const poolInput = doorsRow.getByLabel("Общий %");
    await poolInput.fill("13");
    const saveWait = storePage.waitForResponse(
      (res) =>
        res.url().includes("/api/pro/limits/org") &&
        res.request().method() === "POST" &&
        res.status() === 200,
      { timeout: 60_000 },
    );
    await doorsRow.getByRole("button", { name: "Сохранить" }).click();
    await saveWait;
    await storePage.reload({ waitUntil: "networkidle" });
    const limitsGet = await storePage.request.get(`${PROF_URL}/api/remcard/api/pro/limits/org`, {
      headers: { Origin: PROF_URL, Cookie: `remcard-token=${storeToken}` },
    });
    assert(limitsGet.ok(), `limits GET after save ${limitsGet.status()}`);
    const limitsBody = await limitsGet.json();
    const doorsLimit = (limitsBody.limits ?? []).find((l) => l.category === "doors");
    assert(
      doorsLimit && Math.abs(Number(doorsLimit.poolPercent) - 13) < 0.01,
      "saved general limit 13% persisted",
    );
    await doorsRow.getByLabel("Общий %").waitFor({ timeout: 30_000 });
    assert((await doorsRow.getByLabel("Общий %").inputValue()) === "13", "editor shows 13 after reload");
    step("editor-save-13-reload");
    const themeAfterReload = await storePage.evaluate(() =>
      document.documentElement.getAttribute("data-theme"),
    );
    assert(themeAfterReload === "dark", `editor theme after reload (${themeAfterReload})`);
    await capture(storePage, "store-agent-terms-editor-dark-390");
    await storeCtx.close();

    const { context: agentCtx2, page: agentPage2 } = await withSession(browser, agentToken, {
      width: 1440,
      height: 900,
    });
    await agentPage2.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      try {
        localStorage.setItem("remcard-theme", "dark");
      } catch {
        /* ignore */
      }
    });
    await agentPage2.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
    await agentPage2.getByTestId("agent-r04-partners").waitFor({ timeout: 60_000 });
    await agentPage2.getByRole("tab", { name: "Приглашения" }).click();
    // Agent initiated the store invite — counter-offer appears under «Отправленные», not «Входящие».
    await agentPage2.getByTestId("agent-invites-outgoing").click();
    const storeLabel =
      flow.storeOwner.organizationName?.trim() ||
      flow.storeOwner.displayName?.trim() ||
      "Agent terms store";
    const incomingRow = agentPage2
      .getByTestId("agent-r04-partners-table-row")
      .filter({ hasText: storeLabel })
      .first();
    await incomingRow.waitFor({ timeout: 60_000 });
    await incomingRow.getByRole("button", { name: "Детали" }).click();
    const acceptBtn = agentPage2.getByRole("button", { name: "Принять условия" }).first();
    await acceptBtn.waitFor({ timeout: 60_000 });
    const acceptWait = agentPage2.waitForResponse(
      (res) =>
        res.url().includes(`/api/partnership/${partnershipId}`) &&
        res.request().method() === "PATCH" &&
        res.status() === 200,
      { timeout: 60_000 },
    );
    await acceptBtn.click();
    await acceptWait;
    const agentListRes = await agentPage2.request.get(`${PROF_URL}/api/remcard/api/partnership/list`, {
      headers: { Origin: PROF_URL, Cookie: `remcard-token=${agentToken}` },
    });
    assert(agentListRes.ok(), `agent list after accept ${agentListRes.status()}`);
    const agentList = await agentListRes.json();
    const accepted = (agentList.partnerships ?? []).find((p) => p.id === partnershipId);
    assert(accepted?.status === "ACTIVE", `agent accept → ACTIVE (${accepted?.status})`);
    const doorsTerm = accepted?.terms?.find((t) => t.category === "doors" && !t.isExcluded);
    assert(
      doorsTerm && Math.abs(Number(doorsTerm.storePercent) - 11.5) < 0.01,
      "agent accepted 11.5% doors term",
    );
    step("agent-accept-11.5-ui");
    await agentPage2.setViewportSize({ width: 390, height: 844 });
    await capture(agentPage2, "agent-accept-dark-390");
    await agentCtx2.close();
  } finally {
    await browser.close();
  }

  finish();
}

function finish() {
  const payload = { failures, runtime: RUNTIME, evidenceSteps, presentation };
  fs.mkdirSync(ART_DIR, { recursive: true });
  fs.writeFileSync(path.join(ART_DIR, "clickthrough.json"), JSON.stringify(payload, null, 2), "utf8");
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
