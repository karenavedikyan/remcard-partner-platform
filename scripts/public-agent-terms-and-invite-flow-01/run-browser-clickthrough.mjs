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

    await agentPage.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
    await agentPage.getByRole("tab", { name: "Найти в RemCard" }).click();
    const storeHeading =
      flow.storeOwner.organizationName?.trim() ||
      flow.storeOwner.displayName?.trim() ||
      "Agent terms store";
    const searchQuery = flow.storeOwner.displayName?.trim() || storeHeading;

    await agentPage.getByLabel("Кого ищем").selectOption("agent");
    await agentPage.getByLabel("Поиск").fill(searchQuery);
    const searchWait = agentPage.waitForResponse(
      (res) => res.url().includes("/partnership/search") && res.status() === 200,
      { timeout: 60_000 },
    );
    await agentPage.getByRole("button", { name: "Найти" }).click();
    await searchWait;

    await agentPage.getByRole("heading", { level: 3, name: storeHeading }).waitFor({ timeout: 60_000 });
    await agentPage
      .locator("details")
      .filter({ hasText: "Общие условия для агентов" })
      .first()
      .click();
    await agentPage.getByText(/12\.5%/).waitFor({ timeout: 30_000 });
    step("ui-read-12.5");

    await agentPage.getByRole("button", { name: "Пригласить" }).first().click();
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

    await storePage.setViewportSize({ width: 1440, height: 900 });
    await storePage.goto(`${PROF_URL}/partners/agent-terms`, { waitUntil: "networkidle", timeout: 120_000 });
    const poolInput = storePage.getByLabel(/Общий %|poolPercent/i).first();
    if (await poolInput.count()) {
      await poolInput.fill("13");
      const saveBtn = storePage.getByRole("button", { name: /Сохранить/i }).first();
      if (await saveBtn.count()) {
        await saveBtn.click();
      }
    }
    await storePage.setViewportSize({ width: 390, height: 844 });
    await capture(storePage, "store-agent-terms-editor-dark-390");
    await storeCtx.close();

    const { context: agentCtx2, page: agentPage2 } = await withSession(browser, agentToken, {
      width: 390,
      height: 844,
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
    const agentHub = agentPage2.getByTestId("agent-r04-partners");
    if (await agentHub.count()) {
      await agentPage2.getByRole("tab", { name: "Приглашения" }).click();
      await agentPage2.getByTestId("agent-invites-incoming").click();
      const storeRowAgent = agentPage2
        .getByTestId("agent-r04-partners-table-row")
        .filter({ hasText: storeHeading })
        .first();
      await storeRowAgent.getByRole("button", { name: "Детали" }).click();
    } else {
      await agentPage2.getByRole("tab", { name: "Мои партнёры" }).click();
    }
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
    await agentPage2.getByText(/11\.5%|11,5%|ACTIVE|актив/i).first().waitFor({ timeout: 60_000 });
    await capture(agentPage2, "agent-accept-dark-390");
    await agentCtx2.close();
  } finally {
    await browser.close();
  }

  finish();
}

function finish() {
  const payload = { failures, runtime: RUNTIME, evidenceSteps };
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
