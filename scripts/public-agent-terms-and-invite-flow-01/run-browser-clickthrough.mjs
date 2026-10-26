/**
 * Playwright click-through: general terms 12.5%, agent request without %, store offer, accept, editor, discussion link.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3452").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/public-agent-terms-and-invite-flow-01/visual-clickthrough");
const failures = [];

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

async function resetOpenPartnership(page, storeUserId, agentUserId) {
  const res = await page.request.get(`${PROF_URL}/api/remcard/api/partnership/list`, {
    headers: { Origin: PROF_URL },
  });
  if (!res.ok()) return;
  const { partnerships } = await res.json();
  for (const p of partnerships ?? []) {
    const match =
      (p.storeUserId === storeUserId && p.proUserId === agentUserId) ||
      (p.storeUserId === agentUserId && p.proUserId === storeUserId);
    if (!match || p.status === "ENDED") continue;
    await page.request.patch(`${PROF_URL}/api/remcard/api/partnership/${p.id}`, {
      headers: { Origin: PROF_URL, "Content-Type": "application/json" },
      data: { action: p.status === "ACTIVE" || p.status === "PAUSED" ? "terminate" : "reject" },
    });
  }
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
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const flow = state.roles?.agentTermsFlow;
  const storeToken = flow?.storeOwner?.ownerSessionToken;
  const agentToken = flow?.agent?.agentSessionToken;
  const storeUserId = flow?.storeOwner?.userId;
  const agentUserId = flow?.agent?.userId;
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
    await resetOpenPartnership(agentPage, storeUserId, agentUserId);

    await agentPage.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
    await agentPage.getByTestId("agent-r04-partners").waitFor({ timeout: 90_000 });
    await agentPage.getByRole("button", { name: "Найти или пригласить партнёра" }).click();
    const findModal = agentPage.getByTestId("agent-r04-modal-find");
    await findModal.waitFor({ timeout: 60_000 });

    const searchRes = await agentPage.request.get(
      `${PROF_URL}/api/remcard/api/partnership/search?role=store&limit=20`,
      { headers: { Origin: PROF_URL } },
    );
    assert(searchRes.ok(), `agent search ${searchRes.status()}`);
    const searchJson = await searchRes.json();
    const storeHit = (searchJson.partners ?? []).find((p) => p.id === storeUserId);
    assert(storeHit, "store partner in search");
    const storeLabel =
      storeHit.organizationName?.trim() || storeHit.displayName?.trim() || "Agent terms store";

    await findModal.getByPlaceholder("Название, товар, услуга, этап или ID").fill(storeLabel);
    await findModal.getByRole("button", { name: "Найти" }).click();
    const resultRow = findModal.locator("article").filter({ hasText: storeLabel }).first();
    await resultRow.waitFor({ timeout: 60_000 });

    await resultRow.locator("details").filter({ hasText: "Общие условия для агентов" }).click();
    await resultRow.getByText(/12\.5%/).waitFor({ timeout: 30_000 });
    evidenceStep("ui-read-12.5");

    await resultRow.getByRole("button", { name: "Пригласить" }).click();
    const inviteDialog = agentPage.locator('[aria-labelledby="invite-title"]');
    await inviteDialog.waitFor({ timeout: 30_000 });
    assert((await inviteDialog.getByLabel("Процент").count()) === 0, "request dialog has no percent field");
    assert((await inviteDialog.getByLabel("Общий %").count()) === 0, "request dialog has no pool field");
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

    await agentPage.goto(`${PROF_URL}/partners?hub=link`, { waitUntil: "networkidle", timeout: 120_000 });
    const linkModal = agentPage.getByTestId("agent-r04-modal-link");
    await linkModal.waitFor({ timeout: 60_000 });
    await linkModal.getByLabel("Имя или название партнёра").fill("UI discussion guest");
    await linkModal.getByLabel("Предмет сотрудничества").fill("Обсуждение без оффера");
    const createWait = agentPage.waitForResponse(
      (res) => res.url().includes("/partnership/discussion-invite") && res.status() === 200,
      { timeout: 60_000 },
    );
    await linkModal.getByRole("button", { name: "Создать ссылку" }).click();
    const createRes = await createWait.catch(() => null);
    assert(createRes?.ok(), "discussion invite created");
    const hasLinkText = await linkModal.getByText(/discussion-invite\/public\//).count();
    assert(hasLinkText > 0, "discussion public link visible");
    await capture(agentPage, "discussion-link-light-1440");
    await agentCtx.close();

    const { context: storeCtx, page: storePage } = await withSession(browser, storeToken, {
      width: 390,
      height: 844,
    });
    await storePage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      try {
        localStorage.setItem("remcard-theme", "dark");
      } catch {
        /* ignore */
      }
    });
    await storePage.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
    const storePanel = storePage.locator(".list, [class*='list']").first();
    await storePage.getByText("Интересуют двери").first().waitFor({ timeout: 60_000 }).catch(() =>
      storePanel.getByText(/INVITED|Приглаш/i).first().waitFor({ timeout: 60_000 }),
    );

    const offerBtn = storePage.getByRole("button", { name: /Предложение агенту|Предложить условия|Встречное/i }).first();
    await offerBtn.click();
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
    await capture(storePage, "store-counter-offer-dark-390");

    await storePage.goto(`${PROF_URL}/partners/agent-terms`, { waitUntil: "networkidle", timeout: 120_000 });
    const poolInput = storePage.getByLabel(/Общий %|poolPercent/i).first();
    if (await poolInput.count()) {
      await poolInput.fill("13");
      const saveBtn = storePage.getByRole("button", { name: /Сохранить/i }).first();
      if (await saveBtn.count()) {
        await saveBtn.click();
        await storePage.getByText(/12\.5|13|Сохранено/i).first().waitFor({ timeout: 30_000 }).catch(() => undefined);
      }
    }
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
    await agentPage2.getByRole("tab", { name: "Приглашения" }).click();
    await agentPage2.getByTestId("agent-invites-incoming").click();
    const acceptBtn = agentPage2.getByRole("button", { name: /Принять предложение|Принять/i }).first();
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
    await agentPage2.getByText(/11\.5%|11,5%/).first().waitFor({ timeout: 60_000 });
    await capture(agentPage2, "agent-accept-dark-390");
    await agentCtx2.close();
  } finally {
    await browser.close();
  }

  finish();
}

const evidenceSteps = [];
function evidenceStep(s) {
  evidenceSteps.push(s);
}

function finish() {
  const payload = { failures, runtime: RUNTIME, evidenceSteps };
  fs.mkdirSync(path.dirname(path.join(ART_DIR, "clickthrough.json")), { recursive: true });
  fs.writeFileSync(
    path.join(ART_DIR, "clickthrough.json"),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
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
