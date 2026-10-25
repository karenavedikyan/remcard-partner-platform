/**
 * STORE/COMPANY business owner wallet gate (isolated harness).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const NAV_ROOT = path.resolve("/agent/repos/remcard-navigator");
const requireNav = createRequire(path.join(NAV_ROOT, "package.json"));
const ExcelJS = requireNav("exceljs");

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3430").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ?? path.join(NAV_ROOT, ".catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/store-company-wallet-01");
const ART = path.join(ART_DIR, "visual-shell");
const failures = [];

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

function proxyHeaders() {
  return { Origin: PROF_URL };
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

async function parseExportBuffer(buffer, expectedAccrualIds) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.getWorksheet("Заказы") ?? wb.worksheets[0];
  if (!sheet) throw new Error("export_sheet_missing");
  const header = sheet.getRow(1);
  const col = new Map();
  header.eachCell((cell, n) => col.set(String(cell.value).trim(), n));
  const idCol = col.get("ID начисления");
  const amountCol = col.get("Остаток, ₽") ?? col.get("Сумма, ₽");
  assert(idCol && amountCol, "export_columns_missing");
  const found = new Set();
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = String(row.getCell(idCol).value ?? "").trim();
    if (expectedAccrualIds.includes(id)) found.add(id);
  });
  return found;
}

async function exportOpenPayable(page, gate, label) {
  const qs = new URLSearchParams({
    scope: "open",
    direction: "payable",
    q: "",
    status: "open",
    from: "",
    to: "",
    sort: "debt-desc",
  });
  const res = await page.request.post(
    `${PROF_URL}/api/remcard/api/pro/wallet/settlements/export?${qs}`,
    { headers: proxyHeaders() },
  );
  assert(res.status() === 200, `${label}: export status ${res.status()}`);
  const buf = Buffer.from(await res.body());
  const found = await parseExportBuffer(buf, gate.payableBonusIds);
  for (const id of gate.payableBonusIds) {
    assert(found.has(id), `${label}: export missing accrual ${id}`);
  }
}

async function requisitesUiFlow(page, label, tag) {
  await page.getByTestId("business-wallet-tab-requisites").click();
  await page.getByTestId("business-wallet-requisites-scope").waitFor({ timeout: 60_000 });
  const listBefore = await page.request.get(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`, {
    headers: proxyHeaders(),
  });
  assert(listBefore.status() === 200, `${label}: requisites list ${listBefore.status()}`);
  const masked = await listBefore.json();
  const legalName = `Gate Wallet ${tag}`;
  await page.getByRole("button", { name: /Добавить реквизиты|Добавить ещё реквизиты/ }).click();
  await page.getByTestId("agent-requisites-form").waitFor();
  await page.getByTestId("bank-recipient").fill(legalName);
  await page.getByTestId("bank-inn").fill("7707083893");
  await page.getByTestId("bank-bank").fill("Gate Bank");
  await page.getByTestId("bank-bik").fill("044525225");
  await page.getByTestId("bank-account").fill("40817810099910004312");
  await page.getByTestId("bank-save").click();
  await page.waitForTimeout(800);
  const listAfter = await page.request.get(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`, {
    headers: proxyHeaders(),
  });
  const body = await listAfter.json();
  const item = (body.items ?? []).find((i) => i.legalName === legalName);
  assert(item?.id, `${label}: requisites created`);
  assert(!item?.accountNumber, `${label}: list masked account`);
  assert(item?.accountNumberMasked, `${label}: masked present`);
  const detail = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-payout-requisites/${encodeURIComponent(item.id)}`,
    { headers: proxyHeaders() },
  );
  assert(detail.status() === 200, `${label}: detail GET ${detail.status()}`);
  const detailBody = await detail.json();
  assert(detailBody.item?.accountNumber?.includes("99910004312"), `${label}: authorized detail`);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("business-wallet-tab-requisites").click();
  await page.getByText(legalName).waitFor({ timeout: 30_000 });
  return { requisitesId: item.id, legalName };
}

async function walletOwnerFlow(page, label, walletGate) {
  await page.goto(`${PROF_URL}/settlements`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-owner-wallet").waitFor({ timeout: 90_000 });
  const api = await fetchSettlements(page);
  assertExactGateSettlements(api, walletGate, label);

  await page.getByTestId("specialist-wallet-receivable-total").click();
  const recvPartnerId = api.receivable.find((r) => walletGate.receivableBonusIds.includes(r.id))
    ?.counterpartyId;
  assert(recvPartnerId, `${label}: receivable counterparty`);
  await page.getByTestId(`specialist-partner-group-${recvPartnerId}`).click();
  const recvRow = api.receivable.find((r) => r.id === walletGate.receivableBonusIds[0]);
  assert(recvRow, `${label}: recv row`);
  const accrualLink = page.getByRole("link", { name: "Начисление" }).first();
  const purchaseLink = page.getByRole("link", { name: "Покупка" }).first();
  await accrualLink.click();
  await page.waitForURL(/\/history\//, { timeout: 60_000 });
  await page.goto(`${PROF_URL}/settlements`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-owner-wallet").waitFor({ timeout: 90_000 });
  await page.getByTestId("specialist-wallet-payable-total").click();
  const payRow = api.payable.find((r) => r.id === walletGate.payableBonusIds[0]);
  assert(payRow, `${label}: pay row`);
  await page.getByTestId(`specialist-partner-group-${payRow.counterpartyId}`).click();

  await exportOpenPayable(page, walletGate, label);

  const payoutBonusId = walletGate.payableBonusIds[0];
  const before = dbSnapshot(payoutBonusId);
  assert(before.payoutRecordCount === 0, `${label}: payout records before ${before.payoutRecordCount}`);
  assert(before.bonus?.status === "CONFIRMED", `${label}: bonus open before payout`);

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

  const afterApi = await fetchSettlements(page);
  assert(
    !afterApi.payable.some((r) => r.id === payoutBonusId),
    `${label}: payable row closed in API`,
  );

  await page.getByRole("button", { name: /Фильтры/i }).click();
  await page.getByLabel("Поиск").fill(payRow.counterpartyName.slice(0, 4));
  await page.waitForTimeout(300);

  const reqInfo = await requisitesUiFlow(page, label, label);
  await page.getByTestId("business-wallet-tab-settlements").click();
  await page.getByTestId("specialist-settlements-workspace").waitFor();

  return { payoutBonusId, requisitesId: reqInfo.requisitesId };
}

async function delegatedWalletPolicy(page, label, walletGate) {
  const settlements = await page.request.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`, {
    headers: proxyHeaders(),
  });
  assert(settlements.status() === 200, `${label}: delegated settlements read ${settlements.status()}`);
  const reqPost = await page.request.post(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`, {
    headers: proxyHeaders(),
    data: {
      kind: "person",
      legalName: "Gate delegated write attempt",
      inn: "7707083893",
      bankName: "Test Bank",
      bik: "044525225",
      accountNumber: "40817810099910004312",
    },
  });
  assert(reqPost.status() === 403, `${label}: requisites write ${reqPost.status()}`);
  const body = await reqPost.json();
  assert(body.code === "PROF_TEST_BLOCKED", `${label}: requisites code`);
  const bonusId = walletGate?.payableBonusIds?.[0];
  if (bonusId) {
    const before = dbSnapshot(bonusId).payoutRecordCount;
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
    const after = dbSnapshot(bonusId).payoutRecordCount;
    assert(after === before, `${label}: payout record count unchanged`);
  }
}

async function foreignAccessDenied(page, actorLabel, foreignBonusId) {
  const pay = await page.request.post(
    `${PROF_URL}/api/remcard/api/bonus/${encodeURIComponent(foreignBonusId)}/pay`,
    {
      headers: { ...proxyHeaders(), "Idempotency-Key": `foreign-${foreignBonusId}` },
      data: { payoutMethod: "CASH" },
    },
  );
  assert(pay.status() === 403 || pay.status() === 404, `${actorLabel}: foreign payout ${pay.status()}`);
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
  const storeWallet = harness.roles?.store?.walletGate;
  const companyWallet = harness.roles?.company?.walletGate;
  assert(storeReal && companyReal, "missing real owner tokens");
  assert(storeWallet && companyWallet, "missing walletGate fixture");

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

  if (storeDel) {
    const { context, page } = await withSession(browser, storeDel);
    await delegatedWalletPolicy(page, "store-delegated", storeWallet);
    await context.close();
    flow.delegatedStore = { requisitesWriteDenied: true, payoutWriteDenied: true };
  }

  {
    const { context, page } = await withSession(browser, companyReal);
    await foreignAccessDenied(page, "company-foreign", storeWallet.payableBonusIds[0]);
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, storeReal);
    flow.store = await walletOwnerFlow(page, "store-real", storeWallet);
    await captureWallet(page, "store-wallet-real");
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyReal);
    flow.company = await walletOwnerFlow(page, "company-real", companyWallet);
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
