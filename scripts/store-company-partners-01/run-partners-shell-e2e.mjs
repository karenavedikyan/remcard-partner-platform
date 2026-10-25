/**
 * Isolated partners acceptance gate — strict UI flow, no loose invite/accept assertions.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/store-company-partners-01");
const ART = path.join(ART_DIR, "visual-shell");
const failures = [];
const INVITE_PERCENT = "8";
const TERM_CHANGE_PERCENT = "9";
const ALIAS_LABEL = "Gate alias store→co";

function proxyExtraHeaders() {
  return { Origin: PROF_URL };
}

const APPLICATION_RUNTIME = {
  frontendSha:
    process.env.E2E_APPLICATION_FRONTEND_SHA?.trim() ||
    execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", { encoding: "utf8" }).trim(),
  backendSha:
    process.env.E2E_APPLICATION_BACKEND_SHA?.trim() ||
    execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", { encoding: "utf8" }).trim(),
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT?.trim() || new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function loadHarness() {
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
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

function partnershipsBetween(list, userA, userB) {
  return (list ?? []).filter(
    (p) =>
      (p.storeUserId === userA && p.proUserId === userB) ||
      (p.storeUserId === userB && p.proUserId === userA),
  );
}

async function apiList(page) {
  const res = await page.request.get(`${PROF_URL}/api/remcard/api/partnership/list`, {
    headers: proxyExtraHeaders(),
  });
  assert(res.status() === 200, `list GET ${res.status()}`);
  return res.ok() ? res.json() : { partnerships: [] };
}

async function apiGetPartnership(page, id) {
  const { partnerships } = await apiList(page);
  return partnerships.find((p) => p.id === id) ?? null;
}

async function assertNoStoreCompanyLink(page, storeUserId, companyUserId, label) {
  const { partnerships } = await apiList(page);
  const between = partnershipsBetween(partnerships, storeUserId, companyUserId);
  assert(
    between.every((p) => p.status === "TERMINATED" || p.status === "REJECTED"),
    `${label}: no active/invited store↔company link before invite (${between.map((p) => p.status).join(",")})`,
  );
}

async function assertPartnershipSides(p, storeUserId, companyUserId, label) {
  assert(p?.storeUserId === storeUserId, `${label}: storeUserId`);
  assert(p?.proUserId === companyUserId, `${label}: proUserId`);
}

async function captureMatrix(page, prefix) {
  fs.mkdirSync(ART, { recursive: true });
  assert(!page.url().startsWith("about:"), `${prefix}: capture page not blank`);
  await page.getByTestId("agent-r04-partners").waitFor({ timeout: 60_000 });
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
      try {
        localStorage.setItem("remcard-theme", t);
      } catch {
        /* ignore */
      }
    }, theme);
    await page.waitForTimeout(150);
    for (const [suffix, viewport] of [
      ["1440", { width: 1440, height: 900 }],
      ["390", { width: 390, height: 844 }],
      ["320", { width: 320, height: 640 }],
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(120);
      const overflow = await page.evaluate(() => {
        const el = document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      assert(overflow <= 2, `${prefix}-${theme}-${suffix}: horizontal overflow ${overflow}px`);
      await page.screenshot({
        path: path.join(ART, `${prefix}-${theme}-${suffix}.png`),
        fullPage: true,
      });
    }
  }
}

async function prepareHubForCapture(page, rowHint) {
  await page.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("agent-r04-partners").waitFor({ timeout: 90_000 });
  const modal = page.getByTestId("agent-r04-modal-find");
  if (await modal.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await modal.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);
  }
  await page.getByRole("tab", { name: "Мои партнёры" }).click();
  await page.getByTestId("agent-r04-partners-list").waitFor({ timeout: 60_000 });
  await page.getByText(rowHint, { exact: false }).first().waitFor({ timeout: 60_000 });
}

async function exerciseDelegatedHub(page, label, audience, foreignPartnershipId) {
  await page.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  const hub = page.getByTestId("agent-r04-partners");
  await hub.waitFor({ timeout: 90_000 });
  assert(
    (await hub.getAttribute("data-partners-audience")) === audience,
    `${label}: audience ${audience}`,
  );

  const searchRole = audience === "business-company-r04" ? "pro" : "store";
  const searchRes = await page.request.get(
    `${PROF_URL}/api/remcard/api/partnership/search?role=${searchRole}&limit=5`,
    { headers: proxyExtraHeaders() },
  );
  assert(searchRes.status() === 200, `${label}: search ${searchRes.status()}`);
  const searchJson = await searchRes.json();
  assert((searchJson.partners ?? []).length > 0, `${label}: prof-test discovery rows`);

  const beforeForeign = await apiGetPartnership(page, foreignPartnershipId);
  assert(beforeForeign?.id === foreignPartnershipId, `${label}: foreign partnership exists`);
  const beforeStatus = beforeForeign.status;

  const foreignPatch = await page.request.patch(
    `${PROF_URL}/api/remcard/api/partnership/${encodeURIComponent(foreignPartnershipId)}`,
    { headers: proxyExtraHeaders(), data: { action: "cancel" } },
  );
  assert(foreignPatch.status() === 403, `${label}: foreign PATCH denied (${foreignPatch.status()})`);

  const afterForeign = await apiGetPartnership(page, foreignPartnershipId);
  assert(afterForeign?.status === beforeStatus, `${label}: foreign partnership unchanged`);
}

async function uiInviteStoreToCompany(page, companyMeta, storeUserId, companyUserId) {
  await assertNoStoreCompanyLink(page, storeUserId, companyUserId, "store-pre-invite");

  await page.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("button", { name: "Найти или пригласить партнёра" }).click();
  const modal = page.getByTestId("agent-r04-modal-find");
  await modal.waitFor({ timeout: 60_000 });

  await modal.getByPlaceholder("Название, товар, услуга, этап или ID").fill(companyMeta.publicId);
  const searchWait = page.waitForResponse(
    (res) => res.url().includes("/partnership/search") && res.status() === 200,
    { timeout: 60_000 },
  );
  await modal.getByRole("button", { name: "Найти" }).click();
  await searchWait;

  const targetRow = modal.locator("article").filter({ hasText: companyMeta.displayName });
  assert((await targetRow.count()) > 0, "store-invite: search UI shows company target");
  await targetRow.getByRole("button", { name: "Пригласить" }).click();

  const inviteDialog = page.getByRole("dialog");
  await inviteDialog.waitFor({ timeout: 30_000 });
  const percentField = inviteDialog.getByLabel("Процент");
  if ((await percentField.count()) > 0) {
    await percentField.first().fill(INVITE_PERCENT);
  } else {
    await inviteDialog.getByRole("checkbox").check();
  }

  const inviteWait = page.waitForResponse(
    (res) => res.url().includes("/partnership/invite") && res.status() === 200,
    { timeout: 60_000 },
  );
  await inviteDialog.getByRole("button", { name: "Отправить приглашение" }).click();
  const inviteRes = await inviteWait;
  const inviteBody = await inviteRes.json();
  const partnershipId = inviteBody.partnershipId ?? inviteBody.partnership?.id;
  assert(partnershipId, "store-invite: partnershipId from invite UI");

  const invited = inviteBody.partnership ?? (await apiGetPartnership(page, partnershipId));
  assert(invited?.status === "INVITED", `store-invite: status INVITED (${invited?.status})`);
  await assertPartnershipSides(invited, storeUserId, companyUserId, "store-invite");

  await page.keyboard.press("Escape");
  await modal.waitFor({ state: "hidden", timeout: 15_000 }).catch(() => undefined);

  return partnershipId;
}

async function uiAcceptIncomingCompany(page, partnershipId, storeMeta, storeUserId, companyUserId) {
  await page.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("tab", { name: "Приглашения" }).click();
  await page.getByTestId("agent-invites-incoming").click();

  const fromApi = await apiGetPartnership(page, partnershipId);
  assert(fromApi?.status === "INVITED", `company-pre-accept: INVITED (${fromApi?.status})`);
  await assertPartnershipSides(fromApi, storeUserId, companyUserId, "company-pre-accept");

  const row = page
    .locator('[data-testid="agent-r04-partners-table-row"]')
    .filter({ hasText: storeMeta.displayName });
  assert((await row.count()) > 0, "company-accept: incoming row for store");
  await row.getByRole("button", { name: "Детали" }).click();

  const acceptWait = page.waitForResponse(
    (res) =>
      res.url().includes(`/api/partnership/${partnershipId}`) &&
      res.request().method() === "PATCH" &&
      res.status() === 200,
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Принять", exact: true }).click();
  await acceptWait;

  const active = await apiGetPartnership(page, partnershipId);
  assert(active?.status === "ACTIVE", `company-post-accept: ACTIVE (${active?.status})`);
  const term = (active?.terms ?? []).find((t) => t.category === "doors" && !t.isExcluded);
  assert(term && Number(term.storePercent) === Number(INVITE_PERCENT), "company-post-accept: doors terms");
}

async function uiTermChangeCycle(storePage, companyPage, partnershipId, storeUserId, companyUserId) {
  await storePage.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  const storeRow = storePage
    .locator('[data-testid="agent-r04-partners-table-row"]')
    .filter({ hasText: "Synthetic company" });
  await storeRow.getByRole("button", { name: "Детали" }).click();
  await storePage.getByRole("button", { name: "Изменение условий" }).click();
  await storePage
    .getByLabel(/Двери \(сейчас/)
    .fill(TERM_CHANGE_PERCENT);
  const proposeWait = storePage.waitForResponse(
    (res) => res.url().includes("/term-change") && res.request().method() === "POST" && res.status() === 200,
    { timeout: 60_000 },
  );
  await storePage.getByRole("button", { name: "Предложить изменение условий" }).click();
  await proposeWait;

  await companyPage.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  const companyRow = companyPage
    .locator('[data-testid="agent-r04-partners-table-row"]')
    .filter({ hasText: "Synthetic store" });
  await companyRow.getByRole("button", { name: "Детали" }).click();
  await companyPage.getByRole("button", { name: "Изменение условий" }).click();
  const approveWait = companyPage.waitForResponse(
    (res) => res.url().includes("/term-change") && res.url().includes("/respond") && res.status() === 200,
    { timeout: 60_000 },
  );
  await companyPage.getByRole("button", { name: "Согласовать" }).click();
  await approveWait;

  const storeP = await apiGetPartnership(storePage, partnershipId);
  const companyP = await apiGetPartnership(companyPage, partnershipId);
  assert(storeP?.status === "ACTIVE" && companyP?.status === "ACTIVE", "term-change: both ACTIVE");
  await assertPartnershipSides(storeP, storeUserId, companyUserId, "term-change-store");
  const term = (storeP?.terms ?? []).find((t) => t.category === "doors" && !t.isExcluded);
  assert(term && Number(term.storePercent) === Number(TERM_CHANGE_PERCENT), "term-change: applied percent");
}

async function uiAliasArchiveRestore(page, partnershipId, companyPage, storeUserId, companyUserId) {
  await page.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  const row = page
    .locator('[data-testid="agent-r04-partners-table-row"]')
    .filter({ hasText: "Synthetic company" });
  await row.getByRole("button", { name: "Переименовать для себя" }).click();
  const aliasDialog = page.getByTestId("partner-personal-alias-dialog");
  await aliasDialog.waitFor({ timeout: 30_000 });
  await aliasDialog.getByLabel("Подпись в вашем списке").fill(ALIAS_LABEL);
  const aliasWait = page.waitForResponse(
    (res) =>
      res.url().includes("/partnership-list-preferences/") && res.request().method() === "PATCH",
    { timeout: 60_000 },
  );
  await aliasDialog.getByRole("button", { name: "Сохранить" }).click();
  await aliasWait;

  await row.getByRole("button", { name: "В архив" }).click();
  await page.waitForTimeout(500);

  const companyView = await apiGetPartnership(companyPage, partnershipId);
  assert(companyView?.status === "ACTIVE", "archive: counterparty still ACTIVE");
  assert(!companyView?.listPreference?.archivedAt, "archive: no counterparty personal archive");

  await page.getByTestId("list-archive-view").selectOption("archive");
  await page.getByText(ALIAS_LABEL).first().waitFor({ timeout: 30_000 });

  await row.getByRole("button", { name: "Вернуть из архива" }).click();
  await page.getByTestId("list-archive-view").selectOption("active");

  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(ALIAS_LABEL).first().waitFor({ timeout: 60_000 });

  const storeP = await apiGetPartnership(page, partnershipId);
  await assertPartnershipSides(storeP, storeUserId, companyUserId, "alias-reload-store");
}

function writeArtifacts(delegated, realOwner, flowMeta) {
  const captureCompletedAt = new Date().toISOString();
  const meta = {
    applicationRuntime: {
      ...APPLICATION_RUNTIME,
      captureCompletedAt,
    },
    profUrl: PROF_URL,
    harnessState: STATE_PATH,
    delegatedProfTestReadGate: delegated,
    realOwnerFullFlow: realOwner,
    flowMeta,
    failures,
    ok: failures.length === 0,
    profTestPolicyNote:
      "Delegated: read + PATCH cancel on existing foreign partnershipId → 403, record unchanged. POST invite not used for delegated full flow.",
  };
  fs.mkdirSync(ART_DIR, { recursive: true });
  fs.writeFileSync(path.join(ART_DIR, "shell-gate.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join(ART_DIR, "metadata-shell.json"),
    JSON.stringify(
      {
        frontendApplicationSha: APPLICATION_RUNTIME.frontendSha,
        backendApplicationSha: APPLICATION_RUNTIME.backendSha,
        captureStartedAt: APPLICATION_RUNTIME.captureStartedAt,
        captureCompletedAt,
        captureKind: "store-company-partners-01",
        profUrl: PROF_URL,
      },
      null,
      2,
    ),
  );
  return meta;
}

async function main() {
  const harness = loadHarness();
  const storeDel = harness.roles?.store?.delegationToken;
  const companyDel = harness.roles?.company?.delegationToken;
  const storeRealMeta = harness.roles?.store?.realOwner;
  const companyRealMeta = harness.roles?.company?.realOwner;
  if (!storeDel || !companyDel || !storeRealMeta?.ownerSessionToken || !companyRealMeta?.ownerSessionToken) {
    throw new Error("harness missing tokens");
  }
  const {
    userId: storeUserId,
    ownerSessionToken: storeReal,
    publicId: storePublicId,
    displayName: storeDisplayName,
    partnershipId: foreignPartnershipId,
  } = storeRealMeta;
  const {
    userId: companyUserId,
    ownerSessionToken: companyReal,
    publicId: companyPublicId,
    displayName: companyDisplayName,
  } = companyRealMeta;
  if (!storePublicId || !companyPublicId || !foreignPartnershipId) {
    throw new Error("harness missing publicId or foreign partnershipId — re-run seed-business-owner-real-sessions");
  }

  const browser = await chromium.launch({ headless: true });
  const delegated = {};
  const realOwner = {};
  let flowPartnershipId = null;

  {
    const { context, page } = await withSession(browser, storeDel, { width: 1440, height: 900 });
    await exerciseDelegatedHub(page, "store-delegated", "business-store-r04", foreignPartnershipId);
    await prepareHubForCapture(page, "Мои партнёры");
    await captureMatrix(page, "store-partners-delegated");
    delegated.store = { readHub: true, foreignDeny403: true };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyDel, { width: 1440, height: 900 });
    await exerciseDelegatedHub(page, "company-delegated", "business-company-r04", foreignPartnershipId);
    await prepareHubForCapture(page, "Мои партнёры");
    await captureMatrix(page, "company-partners-delegated");
    delegated.company = { readHub: true, foreignDeny403: true };
    await context.close();
  }

  let storeContext;
  let companyContext;
  let storePage;
  let companyPage;
  {
    storeContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await storeContext.addCookies([
      {
        name: "remcard-token",
        value: storeReal,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    storePage = await storeContext.newPage();

    companyContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await companyContext.addCookies([
      {
        name: "remcard-token",
        value: companyReal,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
    companyPage = await companyContext.newPage();

    flowPartnershipId = await uiInviteStoreToCompany(
      storePage,
      { publicId: companyPublicId, displayName: companyDisplayName },
      storeUserId,
      companyUserId,
    );
    realOwner.store = { uiInvite: true, partnershipId: flowPartnershipId };

    await uiAcceptIncomingCompany(
      companyPage,
      flowPartnershipId,
      { displayName: storeDisplayName },
      storeUserId,
      companyUserId,
    );
    realOwner.company = { uiAccept: true, partnershipId: flowPartnershipId };

    const storeActive = await apiGetPartnership(storePage, flowPartnershipId);
    const companyActive = await apiGetPartnership(companyPage, flowPartnershipId);
    assert(storeActive?.status === "ACTIVE" && companyActive?.status === "ACTIVE", "both sides ACTIVE after accept");

    await uiTermChangeCycle(storePage, companyPage, flowPartnershipId, storeUserId, companyUserId);
    realOwner.termChange = { partnershipId: flowPartnershipId, percent: TERM_CHANGE_PERCENT };

    await uiAliasArchiveRestore(storePage, flowPartnershipId, companyPage, storeUserId, companyUserId);
    realOwner.workspace = { alias: ALIAS_LABEL, archiveRestore: true };

    await prepareHubForCapture(storePage, ALIAS_LABEL);
    await captureMatrix(storePage, "store-partners-real");
    await prepareHubForCapture(companyPage, storeDisplayName);
    await captureMatrix(companyPage, "company-partners-real");

    await storeContext.close();
    await companyContext.close();
  }

  await browser.close();

  const meta = writeArtifacts(delegated, realOwner, {
    partnershipId: flowPartnershipId,
    storeUserId,
    companyUserId,
    invitePercent: INVITE_PERCENT,
  });
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures, applicationRuntime: meta.applicationRuntime }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, applicationRuntime: meta.applicationRuntime, delegated, realOwner }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
