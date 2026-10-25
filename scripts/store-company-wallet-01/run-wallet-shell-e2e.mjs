/**
 * STORE/COMPANY business owner wallet gate (isolated harness).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { chromium, request as playwrightRequest } from "playwright";

const NAV_ROOT = path.resolve("/agent/repos/remcard-navigator");
const requireNav = createRequire(path.join(NAV_ROOT, "package.json"));
const ExcelJS = requireNav("exceljs");

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3430").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ?? path.join(NAV_ROOT, ".catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/store-company-wallet-01");
const ART = path.join(ART_DIR, "visual-shell");
const failures = [];

const GATE_CORR_ACCOUNT = "30101810400000000225";

const APPLICATION_RUNTIME = {
  frontendSha:
    process.env.E2E_APPLICATION_FRONTEND_SHA?.trim() ||
    execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", { encoding: "utf8" }).trim(),
  backendSha:
    process.env.E2E_APPLICATION_BACKEND_SHA?.trim() ||
    execSync(`git -C ${NAV_ROOT} rev-parse HEAD`, { encoding: "utf8" }).trim(),
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT?.trim() || new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function proxyHeaders(token) {
  const headers = { Origin: PROF_URL };
  if (token) headers.Cookie = `remcard-token=${token}`;
  return headers;
}

async function withApiToken(token) {
  return playwrightRequest.newContext({
    baseURL: PROF_URL,
    extraHTTPHeaders: proxyHeaders(token),
  });
}

function dbSnapshot(bonusId) {
  const out = execSync(
    `pnpm exec tsx scripts/prof-admin-moderation-isolated/wallet-gate-db-snapshot.ts`,
    {
      cwd: NAV_ROOT,
      env: { ...process.env, BONUS_ID: bonusId },
      encoding: "utf8",
    },
  );
  return JSON.parse(out.trim());
}

async function withSession(browser, token, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
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

function wipeVisualShellPngs() {
  fs.mkdirSync(ART, { recursive: true });
  for (const f of fs.readdirSync(ART)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(ART, f));
  }
}

function sumGateRows(rows, ids) {
  const set = new Set(ids);
  return rows.filter((r) => set.has(r.id)).reduce((a, r) => a + r.amount, 0);
}

function assertExactGateSettlements(api, gate, label) {
  const paySum = sumGateRows(api.payable, gate.payableBonusIds);
  const recvSum = sumGateRows(api.receivable, gate.receivableBonusIds);
  assert(paySum === gate.payableOpen, `${label}: payable exact ${paySum} !== ${gate.payableOpen}`);
  assert(recvSum === gate.receivableOpen, `${label}: receivable exact ${recvSum} !== ${gate.receivableOpen}`);
  for (const id of gate.payableBonusIds) {
    const row = api.payable.find((r) => r.id === id);
    assert(row?.accrualType === "bonus", `${label}: payable ${id} type`);
    assert(row?.orderId, `${label}: payable ${id} orderId`);
  }
}

async function fetchSettlements(page) {
  const res = await page.request.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`, {
    headers: proxyHeaders(),
  });
  assert(res.status() === 200, `settlements GET ${res.status()}`);
  return res.json();
}

function exportRowKey(row) {
  return `${row.orderId}|${row.amount}|${row.counterparty}|${row.status}`;
}

async function parseExportBufferExact(buffer, expectedRows, label) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.getWorksheet("Взаиморасчёты") ?? wb.worksheets[0];
  if (!sheet) throw new Error(`${label}: export_sheet_missing`);
  const header = sheet.getRow(1);
  const col = new Map();
  header.eachCell((cell, n) => col.set(String(cell.value).trim(), n));
  const orderCol = col.get("Заказ");
  const amountCol = col.get("Сумма, ₽");
  const partnerCol = col.get("Партнёр");
  const statusCol = col.get("Статус");
  assert(orderCol && amountCol && partnerCol && statusCol, `${label}: export_columns_missing`);
  const parsed = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const orderId = String(row.getCell(orderCol).value ?? "").trim();
    const amountRaw = row.getCell(amountCol).value;
    const amount =
      typeof amountRaw === "number"
        ? Math.round(amountRaw)
        : Math.round(Number(String(amountRaw).replace(/\s/g, "").replace(",", ".")));
    const counterparty = String(row.getCell(partnerCol).value ?? "").trim();
    const status = String(row.getCell(statusCol).value ?? "").trim();
    parsed.push({ orderId, amount, counterparty, status });
  });
  const expectedKeys = new Set(
    expectedRows.map((r) =>
      exportRowKey({
        orderId: r.orderId,
        amount: r.amount,
        counterparty: r.counterpartyName,
        status: r.status,
      }),
    ),
  );
  const parsedKeys = new Set(parsed.map((r) => exportRowKey(r)));
  assert(parsed.length === expectedRows.length, `${label}: export row count ${parsed.length} !== ${expectedRows.length}`);
  for (const key of expectedKeys) {
    assert(parsedKeys.has(key), `${label}: export missing row ${key}`);
  }
  for (const key of parsedKeys) {
    assert(expectedKeys.has(key), `${label}: export foreign/extra row ${key}`);
  }
  return parsed;
}

async function exportViaWorkspaceButton(page, expectedRows, label) {
  const downloadPromise = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: /Excel \(\.xlsx, весь отбор\)/i }).click();
  const download = await downloadPromise;
  const tmpPath = await download.path();
  assert(tmpPath, `${label}: download path missing`);
  const buf = fs.readFileSync(tmpPath);
  assert(buf.length > 100, `${label}: export file too small`);
  await parseExportBufferExact(buf, expectedRows, label);
}

async function requisitesUiFlow(page, label, tag, uniqueSuffix) {
  await page.getByTestId("business-wallet-tab-requisites").click();
  await page.getByTestId("business-wallet-requisites-scope").waitFor({ timeout: 60_000 });
  const listBefore = await page.request.get(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`, {
    headers: proxyHeaders(),
  });
  assert(listBefore.status() === 200, `${label}: requisites list ${listBefore.status()}`);
  const legalName = `Gate Wallet ${tag} ${uniqueSuffix}`;
  await page.getByRole("button", { name: /Добавить реквизиты|Добавить ещё реквизиты/ }).click();
  await page.getByTestId("agent-requisites-form").waitFor();
  await page.getByTestId("bank-type").selectOption("person");
  await page.getByTestId("bank-recipient").pressSequentially(legalName, { delay: 15 });
  await page.getByTestId("bank-inn").pressSequentially("7707083893", { delay: 10 });
  await page.getByTestId("bank-bank").pressSequentially("Gate Bank", { delay: 10 });
  await page.getByTestId("bank-bik").pressSequentially("044525225", { delay: 10 });
  await page.getByTestId("bank-account").pressSequentially("40817810099910004312", { delay: 10 });
  await page.getByTestId("bank-correspondent").pressSequentially(GATE_CORR_ACCOUNT, { delay: 10 });
  assert((await page.getByTestId("bank-recipient").inputValue()) === legalName, `${label}: form legalName bound`);
  assert(
    (await page.getByTestId("bank-correspondent").inputValue()) === GATE_CORR_ACCOUNT,
    `${label}: form corrAccount bound`,
  );
  const formValid = await page.getByTestId("agent-requisites-form").evaluate((form) => form.checkValidity());
  assert(formValid, `${label}: requisites form invalid before submit`);

  const saveWait = page.waitForResponse(
    (r) => {
      const u = r.url();
      return (
        u.includes("/agent-payout-requisites") &&
        !u.match(/agent-payout-requisites\/[^/?]+/) &&
        r.request().method() === "POST" &&
        r.status() >= 200 &&
        r.status() < 300
      );
    },
    { timeout: 60_000 },
  );
  await page.getByTestId("bank-save").click();
  const saveRes = await saveWait;
  assert(saveRes, `${label}: UI requisites POST missing (native validation or submit failed)`);
  const saved = await saveRes.json();
  const createdItem = saved.item;
  assert(createdItem?.id, `${label}: requisites POST created`);
  await page.getByTestId("agent-requisites-form").waitFor({ state: "hidden", timeout: 30_000 });

  const listAfter = await page.request.get(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`, {
    headers: proxyHeaders(),
  });
  const body = await listAfter.json();
  const item = (body.items ?? []).find((i) => i.id === createdItem.id);
  assert(item?.id, `${label}: requisites in list`);
  assert(!item?.accountNumber, `${label}: list masked account`);
  assert(item?.accountNumberMasked, `${label}: masked present`);

  const detail = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(item.id)}`,
    { headers: proxyHeaders() },
  );
  assert(detail.status() === 200, `${label}: detail GET ${detail.status()}`);
  const detailBody = await detail.json();
  assert(detailBody.item?.accountNumber?.includes("99910004312"), `${label}: authorized detail account`);
  assert(detailBody.item?.corrAccount?.includes(GATE_CORR_ACCOUNT.slice(-8)), `${label}: authorized detail corr`);
  const versionAfterCreate = detailBody.item?.version;
  assert(typeof versionAfterCreate === "number", `${label}: detail version after create`);

  const listIndex = (body.items ?? []).findIndex((i) => i.id === item.id);
  assert(listIndex >= 0, `${label}: requisites list index for ${item.id}`);
  const recordRow = page.getByTestId("bank-record").nth(listIndex);
  await recordRow.getByRole("button", { name: "Посмотреть" }).click();
  await recordRow.getByTestId("bank-record-detail").waitFor();
  assert(await recordRow.getByTestId("bank-detail-inn").isVisible(), `${label}: UI detail inn visible`);

  const stalePatch = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(item.id)}`,
    {
      headers: proxyHeaders(),
      data: {
        action: "revise",
        kind: "person",
        legalName: `${legalName} Stale`,
        inn: "7707083893",
        bankName: "Gate Bank",
        bik: "044525225",
        accountNumber: "40817810099910004312",
        corrAccount: GATE_CORR_ACCOUNT,
        expectedVersion: versionAfterCreate + 100,
      },
    },
  );
  assert(stalePatch.status() === 409, `${label}: stale requisites PATCH ${stalePatch.status()}`);

  const editedName = `${legalName} Edited`;
  await recordRow.getByRole("button", { name: "Изменить" }).click();
  await page.getByTestId("agent-requisites-form").waitFor();
  await page.getByTestId("bank-recipient").fill(editedName);
  const patchWait = page.waitForResponse(
    (r) =>
      r.url().includes(`/agent-payout-requisites/${encodeURIComponent(item.id)}`) &&
      r.request().method() === "PATCH" &&
      r.status() >= 200 &&
      r.status() < 300,
    { timeout: 60_000 },
  );
  await page.getByTestId("bank-save").click();
  const patchRes = await patchWait;
  assert(patchRes, `${label}: UI requisites PATCH missing`);
  const patchBody = await patchRes.json();
  const activeId = patchBody.item?.id ?? item.id;
  assert(patchBody.replacedId === item.id, `${label}: revise replaced prior id`);
  assert(patchBody.item?.legalName === editedName, `${label}: edit persisted in PATCH body`);
  assert(
    typeof patchBody.item?.version === "number" && patchBody.item.version > versionAfterCreate,
    `${label}: version bumped after edit`,
  );
  await page.getByTestId("agent-requisites-form").waitFor({ state: "hidden", timeout: 30_000 });

  const detailAfterEdit = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(activeId)}`,
    { headers: proxyHeaders() },
  );
  assert(detailAfterEdit.status() === 200, `${label}: detail after edit ${detailAfterEdit.status()}`);
  const detailEdited = await detailAfterEdit.json();
  assert(detailEdited.item?.legalName === editedName, `${label}: edit persisted on GET`);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("business-wallet-tab-requisites").click();
  await page.getByTestId("business-wallet-requisites-scope").getByText(editedName).first().waitFor({
    timeout: 30_000,
  });

  return { requisitesId: activeId, legalName: editedName, version: detailEdited.item.version };
}

async function assertReceivableFilters(page, api, walletGate, label) {
  const recvRow = api.receivable.find((r) => walletGate.receivableBonusIds.includes(r.id));
  assert(recvRow, `${label}: recv row for filters`);
  await page.getByRole("button", { name: /Фильтры/i }).click();
  await page.getByLabel("Поиск").fill("ZZZ-GATE-NO-MATCH");
  await page.waitForTimeout(400);
  assert(
    (await page.getByText("Нет открытых записей по текущему отбору.").count()) > 0,
    `${label}: search exclusion empty state`,
  );
  await page.getByLabel("Поиск").fill(recvRow.counterpartyName.slice(0, 6));
  await page.waitForTimeout(400);
  await page.getByTestId(`specialist-settlement-row-${recvRow.id}`).waitFor({ timeout: 15_000 });
  const rowText = await page.getByTestId(`specialist-settlement-row-${recvRow.id}`).innerText();
  assert(rowText.includes(String(recvRow.amount)), `${label}: filtered row amount visible`);
}

async function walletOwnerFlow(page, label, walletGate, ownerUserId) {
  await page.goto(`${PROF_URL}/settlements`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-owner-wallet").waitFor({ timeout: 90_000 });
  const api = await fetchSettlements(page);
  assertExactGateSettlements(api, walletGate, label);

  const reqInfo = await requisitesUiFlow(page, label, label, walletGate.tag ?? "gate");
  await page.getByTestId("business-wallet-tab-settlements").click();
  await page.getByTestId("specialist-settlements-workspace").waitFor();

  await page.getByTestId("specialist-wallet-receivable-total").click();
  const recvPartnerId = api.receivable.find((r) => walletGate.receivableBonusIds.includes(r.id))
    ?.counterpartyId;
  assert(recvPartnerId, `${label}: receivable counterparty`);
  await page.getByTestId(`specialist-partner-group-${recvPartnerId}`).click();
  const recvRow = api.receivable.find((r) => r.id === walletGate.receivableBonusIds[0]);
  assert(recvRow, `${label}: recv row`);
  await assertReceivableFilters(page, api, walletGate, label);
  const accrualLink = page.getByRole("link", { name: "Начисление" }).first();
  await accrualLink.click();
  await page.waitForURL(/\/history\//, { timeout: 60_000 });
  await page.goto(`${PROF_URL}/settlements`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-owner-wallet").waitFor({ timeout: 90_000 });

  await page.getByTestId("specialist-wallet-payable-total").click();
  const payRow = api.payable.find((r) => r.id === walletGate.payableBonusIds[0]);
  assert(payRow, `${label}: pay row`);
  await page.getByTestId(`specialist-partner-group-${payRow.counterpartyId}`).click();

  const purchaseLink = page.getByRole("link", { name: "Покупка" }).first();
  const purchaseHref = await purchaseLink.getAttribute("href");
  assert(purchaseHref?.includes(payRow.orderId), `${label}: purchase href orderId`);
  await purchaseLink.click();
  await page.waitForURL(new RegExp(`/history/purchases/${payRow.orderId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), {
    timeout: 60_000,
  });
  await page.goto(`${PROF_URL}/settlements`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-owner-wallet").waitFor({ timeout: 90_000 });
  await page.getByTestId("specialist-wallet-payable-total").click();
  await page.getByTestId(`specialist-partner-group-${payRow.counterpartyId}`).click();

  const exportExpected = api.payable.filter(
    (r) =>
      walletGate.payableBonusIds.includes(r.id) && r.counterpartyId === payRow.counterpartyId,
  );
  await exportViaWorkspaceButton(page, exportExpected, label);

  const payoutBonusId = walletGate.payableBonusIds[0];
  const before = dbSnapshot(payoutBonusId);
  assert(before.payoutRecordCount === 0, `${label}: payout records before ${before.payoutRecordCount}`);
  assert(before.bonus?.status === "CONFIRMED", `${label}: bonus open before payout`);
  assert(before.bonus?.amount === payRow.amount, `${label}: bonus amount snapshot`);

  await page.getByTestId(`specialist-settlements-record-payout-${payoutBonusId}`).click();
  await page.getByRole("heading", { name: "Зафиксировать выплату" }).waitFor();
  const idempotencyKey = `gate-wallet-${label}-${payoutBonusId}`;
  await page.route("**/api/remcard/api/bonus/**/pay", async (route) => {
    const headers = { ...route.request().headers(), "idempotency-key": idempotencyKey };
    await route.continue({ headers });
  });
  await page.getByRole("button", { name: /Подтвердить выплату наличными/i }).click();
  await page.getByRole("heading", { name: "Зафиксировать выплату" }).waitFor({ state: "hidden", timeout: 60_000 });

  const after = dbSnapshot(payoutBonusId);
  assert(after.payoutRecordCount === 1, `${label}: payout records after ${after.payoutRecordCount}`);
  assert(after.bonus?.status === "PAID", `${label}: bonus PAID`);
  assert(after.bonus?.paidAt, `${label}: paidAt set`);
  assert(after.bonus?.payoutMethod === "CASH", `${label}: payout method CASH`);
  assert(after.payoutRecords?.[0]?.payoutMethod === "CASH", `${label}: payout record method`);
  assert(after.payoutRecords?.[0]?.idempotencyKey, `${label}: idempotency key stored`);
  assert(after.payoutRecords?.[0]?.actorUserId === ownerUserId, `${label}: payout actor owner`);
  assert(after.payoutRecords?.[0]?.amount === payRow.amount, `${label}: payout amount snapshot`);

  const dup = await page.request.post(
    `${PROF_URL}/api/remcard/api/bonus/${encodeURIComponent(payoutBonusId)}/pay`,
    {
      headers: { ...proxyHeaders(), "Idempotency-Key": idempotencyKey },
      data: { payoutMethod: "CASH" },
    },
  );
  assert(dup.status() === 200, `${label}: replay status ${dup.status()}`);
  const dupBody = await dup.json();
  assert(dupBody.replay === true, `${label}: replay flag`);
  const afterDup = dbSnapshot(payoutBonusId);
  assert(afterDup.payoutRecordCount === 1, `${label}: still one payout record`);

  await page.waitForTimeout(500);
  const afterApi = await fetchSettlements(page);
  assert(
    !afterApi.payable.some((r) => r.id === payoutBonusId),
    `${label}: payable row closed in API`,
  );
  assert(
    afterApi.completed.some((r) => r.id === payoutBonusId),
    `${label}: payout row in completed API`,
  );
  await page.goto(`${PROF_URL}/settlements`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-owner-wallet").waitFor({ timeout: 90_000 });
  await page.getByTestId("specialist-wallet-payable-total").waitFor({ timeout: 60_000 });
  const payableTile = await page.getByTestId("specialist-wallet-payable-total").innerText();
  assert(!payableTile.includes(String(payRow.amount)), `${label}: payable summary excludes paid row`);

  return {
    payoutBonusId,
    requisitesId: reqInfo.requisitesId,
    requisitesVersion: reqInfo.version,
    payOrderId: payRow.orderId,
  };
}

async function requisitesListSnapshot(api) {
  const res = await api.get(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`, {
    headers: proxyHeaders(),
  });
  assert(res.status() === 200, `requisites list snapshot ${res.status()}`);
  const body = await res.json();
  const items = body.items ?? [];
  return {
    count: items.length,
    primaryId: items.find((i) => i.isPrimary)?.id ?? null,
  };
}

async function delegatedWalletPolicy(page, label, walletGate, ownerRequisitesId) {
  assert(ownerRequisitesId, `${label}: missing owner requisites fixture id`);
  const settlements = await page.request.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`, {
    headers: proxyHeaders(),
  });
  assert(settlements.status() === 200, `${label}: delegated settlements read ${settlements.status()}`);
  const reqBefore = await requisitesListSnapshot(page.request);
  const detailBefore = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(ownerRequisitesId)}`,
    { headers: proxyHeaders() },
  );
  assert(detailBefore.status() === 200, `${label}: delegated owner requisites read ${detailBefore.status()}`);
  const detailBeforeBody = await detailBefore.json();
  const versionBefore = detailBeforeBody.item?.version;

  const reqPost = await page.request.post(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`, {
    headers: proxyHeaders(),
    data: {
      kind: "person",
      legalName: "Gate delegated write attempt",
      inn: "7707083893",
      bankName: "Test Bank",
      bik: "044525225",
      accountNumber: "40817810099910004312",
      corrAccount: GATE_CORR_ACCOUNT,
    },
  });
  assert(reqPost.status() === 403, `${label}: requisites write ${reqPost.status()}`);
  const body = await reqPost.json();
  assert(body.code === "PROF_TEST_BLOCKED", `${label}: requisites create code`);

  const patchCases = [
    { action: "setPrimary" },
    { action: "archive" },
    {
      action: "revise",
      kind: "person",
      legalName: "Delegated revise attempt",
      inn: "7707083893",
      bankName: "Gate Bank",
      bik: "044525225",
      accountNumber: "40817810099910004312",
      corrAccount: GATE_CORR_ACCOUNT,
      expectedVersion: versionBefore,
    },
  ];
  for (const patchBody of patchCases) {
    const patch = await page.request.patch(
      `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(ownerRequisitesId)}`,
      { headers: proxyHeaders(), data: patchBody },
    );
    assert(patch.status() === 403, `${label}: requisites PATCH ${patchBody.action} ${patch.status()}`);
    const patchJson = await patch.json();
    assert(patchJson.code === "PROF_TEST_BLOCKED", `${label}: PATCH ${patchBody.action} code`);
  }
  const reqAfter = await requisitesListSnapshot(page.request);
  assert(reqAfter.count === reqBefore.count, `${label}: requisites count unchanged`);
  assert(reqAfter.primaryId === reqBefore.primaryId, `${label}: primary requisites unchanged`);
  const detailAfter = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(ownerRequisitesId)}`,
    { headers: proxyHeaders() },
  );
  const detailAfterBody = await detailAfter.json();
  assert(detailAfterBody.item?.version === versionBefore, `${label}: requisites version unchanged`);

  const bonusId = walletGate?.payableBonusIds?.[0];
  assert(bonusId, `${label}: missing gate bonus id`);
  const beforePay = dbSnapshot(bonusId).payoutRecordCount;
  const pay = await page.request.post(
    `${PROF_URL}/api/remcard/api/bonus/${encodeURIComponent(bonusId)}/pay`,
    {
      headers: { ...proxyHeaders(), "Idempotency-Key": `gate-delegated-${bonusId}` },
      data: { payoutMethod: "CASH" },
    },
  );
  assert(
    pay.status() === 403 || pay.status() === 401,
    `${label}: payout write ${pay.status()} (expected policy deny)`,
  );
  const afterPay = dbSnapshot(bonusId).payoutRecordCount;
  assert(afterPay === beforePay, `${label}: payout record count unchanged`);
}

async function foreignAccessMatrix(page, actorLabel, foreign, opts = {}) {
  const { bonusId, requisitesId, foreignOrderId } = foreign;
  const includePayout = opts.includePayout !== false;
  let beforePay = dbSnapshot(bonusId).payoutRecordCount;
  if (includePayout) {
    const pay = await page.request.post(
      `${PROF_URL}/api/remcard/api/bonus/${encodeURIComponent(bonusId)}/pay`,
      {
        headers: { ...proxyHeaders(), "Idempotency-Key": `foreign-${bonusId}` },
        data: { payoutMethod: "CASH" },
      },
    );
    assert(pay.status() === 403 || pay.status() === 404, `${actorLabel}: foreign payout ${pay.status()}`);
  }

  const settlements = await page.request.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`, {
    headers: proxyHeaders(),
  });
  assert(settlements.status() === 200, `${actorLabel}: own settlements read`);
  const ownBody = await settlements.json();
  assert(
    !ownBody.payable.some((r) => r.id === bonusId) && !ownBody.receivable.some((r) => r.id === bonusId),
    `${actorLabel}: foreign bonus absent from own ledger`,
  );

  if (requisitesId) {
    let ownerVersionBefore = null;
    if (opts.ownerVerifyToken) {
      const ownerApi = await withApiToken(opts.ownerVerifyToken);
      const ownerDetail = await ownerApi.get(
        `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(requisitesId)}`,
      );
      assert(ownerDetail.status() === 200, `${actorLabel}: owner verify detail ${ownerDetail.status()}`);
      ownerVersionBefore = (await ownerDetail.json()).item?.version ?? null;
      await ownerApi.dispose();
    }
    const reqDetail = await page.request.get(
      `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(requisitesId)}`,
      { headers: proxyHeaders() },
    );
    assert(
      reqDetail.status() === 403 || reqDetail.status() === 404,
      `${actorLabel}: foreign requisites detail ${reqDetail.status()}`,
    );
    const reqPatch = await page.request.patch(
      `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(requisitesId)}`,
      {
        headers: proxyHeaders(),
        data: { action: "setPrimary" },
      },
    );
    assert(
      reqPatch.status() === 403 || reqPatch.status() === 404,
      `${actorLabel}: foreign requisites patch ${reqPatch.status()}`,
    );
    if (opts.ownerVerifyToken && ownerVersionBefore != null) {
      const ownerApi = await withApiToken(opts.ownerVerifyToken);
      const ownerAfter = await ownerApi.get(
        `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(requisitesId)}`,
      );
      const ownerAfterBody = await ownerAfter.json();
      assert(
        ownerAfterBody.item?.version === ownerVersionBefore,
        `${actorLabel}: foreign patch left owner requisites version`,
      );
      await ownerApi.dispose();
    }
  }

  if (foreignOrderId) {
    const exportForeign = await page.request.post(
      `${PROF_URL}/api/remcard/api/pro/wallet/settlements/export?scope=open&direction=payable&status=open&sort=debt-desc`,
      { headers: proxyHeaders() },
    );
    assert(exportForeign.status() === 200, `${actorLabel}: export HTTP ${exportForeign.status()}`);
    const buf = Buffer.from(await exportForeign.body());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const sheet = wb.worksheets[0];
    let foreignRow = false;
    sheet?.eachRow((row, n) => {
      if (n === 1) return;
      const text = row.values?.join("|") ?? "";
      if (text.includes(foreignOrderId)) foreignRow = true;
    });
    assert(!foreignRow, `${actorLabel}: export must not leak foreign order ${foreignOrderId}`);
  }

  if (includePayout) {
    const afterPay = dbSnapshot(bonusId).payoutRecordCount;
    assert(afterPay === beforePay, `${actorLabel}: foreign payout left DB unchanged`);
  }
}

async function staffWalletForbidden(api, label, bonusId) {
  const beforePay = dbSnapshot(bonusId).payoutRecordCount;
  const res = await api.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`);
  assert(res.status() === 403, `${label}: staff settlements ${res.status()}`);
  const exp = await api.post(
    `${PROF_URL}/api/remcard/api/pro/wallet/settlements/export?scope=open&direction=payable&status=open&sort=debt-desc`,
  );
  assert(exp.status() === 403, `${label}: staff export ${exp.status()}`);
  const req = await api.get(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`);
  assert(req.status() === 403, `${label}: staff requisites list ${req.status()}`);
  const pay = await api.post(`${PROF_URL}/api/remcard/api/bonus/${encodeURIComponent(bonusId)}/pay`, {
    headers: { "Idempotency-Key": `staff-forbidden-${bonusId}` },
    data: { payoutMethod: "CASH" },
  });
  assert(pay.status() === 403 || pay.status() === 401, `${label}: staff payout ${pay.status()}`);
  assert(dbSnapshot(bonusId).payoutRecordCount === beforePay, `${label}: staff payout DB unchanged`);
}

async function staffWalletAuthorized(api, label, walletGate, bonusId, foreignRequisitesId) {
  const res = await api.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`);
  assert(res.status() === 200, `${label}: authorized staff settlements ${res.status()}`);
  assertExactGateSettlements(await res.json(), walletGate, label);
  const exp = await api.post(
    `${PROF_URL}/api/remcard/api/pro/wallet/settlements/export?scope=open&direction=payable&status=open&sort=debt-desc`,
  );
  assert(exp.status() === 200, `${label}: authorized staff export ${exp.status()}`);
  const req = await api.get(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`);
  assert(req.status() === 200, `${label}: authorized staff requisites list ${req.status()}`);
  if (foreignRequisitesId) {
    const foreignDetail = await api.get(
      `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(foreignRequisitesId)}`,
    );
    assert(
      foreignDetail.status() === 403 || foreignDetail.status() === 404,
      `${label}: staff foreign requisites ${foreignDetail.status()}`,
    );
  }
  const beforePay = dbSnapshot(bonusId).payoutRecordCount;
  const pay = await api.post(`${PROF_URL}/api/remcard/api/bonus/${encodeURIComponent(bonusId)}/pay`, {
    headers: { "Idempotency-Key": `staff-auth-${bonusId}` },
    data: { payoutMethod: "CASH" },
  });
  assert(pay.status() === 403, `${label}: authorized staff payout denied ${pay.status()}`);
  assert(dbSnapshot(bonusId).payoutRecordCount === beforePay, `${label}: authorized staff payout DB unchanged`);
}

async function staffWalletRevoked(api, label) {
  const res = await api.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`);
  assert(res.status() === 401, `${label}: revoked staff settlements ${res.status()}`);
  const exp = await api.post(
    `${PROF_URL}/api/remcard/api/pro/wallet/settlements/export?scope=open&direction=payable&status=open&sort=debt-desc`,
  );
  assert(exp.status() === 401, `${label}: revoked staff export ${exp.status()}`);
  const req = await api.get(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`);
  assert(req.status() === 401, `${label}: revoked staff requisites ${req.status()}`);
}

async function captureWallet(page, prefix) {
  await page.getByTestId("business-owner-wallet").waitFor({ timeout: 90_000 });
  await page.getByTestId("specialist-settlements-workspace").waitFor({ timeout: 90_000 });
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
      try {
        localStorage.setItem("remcard-theme", t);
      } catch {
        /* ignore */
      }
    }, theme);
    for (const [suffix, viewport] of [
      ["1440", { width: 1440, height: 900 }],
      ["390", { width: 390, height: 844 }],
      ["320", { width: 320, height: 640 }],
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(80);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      assert(overflow <= 2, `${prefix}-${theme}-${suffix}: overflow ${overflow}px`);
      await page.screenshot({
        path: path.join(ART, `${prefix}-${theme}-${suffix}.png`),
        fullPage: true,
      });
    }
  }
}

function writeArtifacts(flow, captureCompletedAt) {
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
}

async function main() {
  wipeVisualShellPngs();
  const harness = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const storeReal = harness.roles?.store?.realOwner?.ownerSessionToken;
  const companyReal = harness.roles?.company?.realOwner?.ownerSessionToken;
  const storeDel = harness.roles?.store?.delegationToken;
  const companyDel = harness.roles?.company?.delegationToken;
  const storeWallet = harness.roles?.store?.walletGate;
  const companyWallet = harness.roles?.company?.walletGate;
  const storeStaff = harness.roles?.store?.walletStaff;
  const storeOwnerRequisitesId = harness.roles?.store?.walletOwnerRequisitesId;
  const companyOwnerRequisitesId = harness.roles?.company?.walletOwnerRequisitesId;
  const storeOwnerUserId = harness.roles?.store?.realOwner?.userId;
  const companyOwnerUserId = harness.roles?.company?.realOwner?.userId;
  assert(storeReal && companyReal, "missing real owner tokens");
  assert(storeDel && companyDel, "missing prof-test delegation tokens");
  assert(storeWallet && companyWallet, "missing walletGate fixture");
  assert(
    storeStaff?.restrictedSessionToken &&
      storeStaff?.authorizedSessionToken &&
      storeStaff?.revokedSessionToken,
    "missing store walletStaff fixtures (run seed-business-wallet-gate-access-fixtures)",
  );
  assert(storeOwnerRequisitesId && companyOwnerRequisitesId, "missing seeded owner requisites ids");
  assert(storeOwnerUserId && companyOwnerUserId, "missing owner user ids");

  const browser = await chromium.launch({ headless: true });
  const flow = {};

  {
    const anon = await browser.newContext();
    const anonRes = await (await anon.newPage()).request.get(
      `${PROF_URL}/api/remcard/api/pro/wallet/settlements`,
      { headers: proxyHeaders() },
    );
    assert(anonRes.status() === 401, `anonymous settlements ${anonRes.status()}`);
    await anon.close();
    flow.anonymousDenied = true;
  }

  {
    const restrictedApi = await withApiToken(storeStaff.restrictedSessionToken);
    await staffWalletForbidden(restrictedApi, "store-staff-restricted", storeWallet.payableBonusIds[0]);
    await restrictedApi.dispose();
    const authorizedApi = await withApiToken(storeStaff.authorizedSessionToken);
    await staffWalletAuthorized(
      authorizedApi,
      "store-staff-authorized",
      storeWallet,
      storeWallet.payableBonusIds[0],
      companyOwnerRequisitesId,
    );
    await authorizedApi.dispose();
    const revokedApi = await withApiToken(storeStaff.revokedSessionToken);
    await staffWalletRevoked(revokedApi, "store-staff-revoked");
    await revokedApi.dispose();
    flow.storeStaff = { restricted: true, authorized: true, revoked: true };
  }

  {
    const { context, page } = await withSession(browser, storeDel);
    await delegatedWalletPolicy(page, "store-delegated", storeWallet, storeOwnerRequisitesId);
    await context.close();
    flow.delegatedStore = { requisitesMutationsDenied: true, payoutWriteDenied: true };
  }

  {
    const { context, page } = await withSession(browser, companyDel);
    await delegatedWalletPolicy(page, "company-delegated", companyWallet, companyOwnerRequisitesId);
    await context.close();
    flow.delegatedCompany = { requisitesMutationsDenied: true, payoutWriteDenied: true };
  }

  {
    const { context, page } = await withSession(browser, companyReal);
    await foreignAccessMatrix(page, "company-foreign-pre", {
      bonusId: storeWallet.payableBonusIds[0],
      requisitesId: null,
      foreignOrderId: null,
    });
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, storeReal);
    flow.store = await walletOwnerFlow(page, "store-real", storeWallet, storeOwnerUserId);
    await captureWallet(page, "store-wallet-real");
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyReal);
    await foreignAccessMatrix(
      page,
      "company-foreign-post",
      {
        bonusId: storeWallet.payableBonusIds[0],
        requisitesId: flow.store?.requisitesId,
        foreignOrderId: flow.store?.payOrderId ?? null,
      },
      { includePayout: false, ownerVerifyToken: storeReal },
    );
    flow.company = await walletOwnerFlow(page, "company-real", companyWallet, companyOwnerUserId);
    await captureWallet(page, "company-wallet-real");
    await context.close();
  }

  await browser.close();
  const captureCompletedAt = new Date().toISOString();
  writeArtifacts(flow, captureCompletedAt);
  if (failures.length) {
    console.error(
      JSON.stringify({ ok: false, failures, application: { ...APPLICATION_RUNTIME, captureCompletedAt } }, null, 2),
    );
    process.exit(1);
  }
  console.log(
    JSON.stringify(
      { ok: true, failures: [], application: { ...APPLICATION_RUNTIME, captureCompletedAt }, flow },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  failures.push(String(e?.stack ?? e));
  writeArtifacts({ fatal: String(e) }, new Date().toISOString());
  process.exit(1);
});
