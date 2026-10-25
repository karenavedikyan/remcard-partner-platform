/**
 * STORE/COMPANY business owner wallet gate (isolated harness).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3430").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/store-company-wallet-01");
const ART = path.join(ART_DIR, "visual-shell");
const failures = [];

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

function proxyHeaders() {
  return { Origin: PROF_URL };
}

async function withSession(browser, token, viewport = { width: 1440, height: 900 }) {
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

function wipeVisualShellPngs() {
  fs.mkdirSync(ART, { recursive: true });
  for (const f of fs.readdirSync(ART)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(ART, f));
  }
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

async function fetchSettlements(page) {
  const res = await page.request.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`, {
    headers: proxyHeaders(),
  });
  assert(res.status() === 200, `settlements GET ${res.status()}`);
  return res.json();
}

async function walletOwnerFlow(page, label, walletGate) {
  await page.goto(`${PROF_URL}/settlements`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-owner-wallet").waitFor({ timeout: 90_000 });
  const api = await fetchSettlements(page);
  assert(api.payable.length >= 1, `${label}: payable rows`);
  assert(api.receivable.length >= 1, `${label}: receivable rows`);
  assert(
    api.payable.some((r) => r.amount > 0),
    `${label}: payable amount`,
  );
  if (walletGate?.payableOpen) {
    const apiPaySum = api.payable.reduce((a, r) => a + r.amount, 0);
    assert(apiPaySum >= walletGate.payableOpen, `${label}: payable sum ${apiPaySum}`);
  }

  const payableTile = page.getByTestId("specialist-wallet-payable-total");
  await payableTile.click();
  await page.getByRole("heading", { name: /К выплате партнёрам|Я должен/ }).waitFor();
  const partnerBtn = page.locator("[data-testid^='specialist-partner-group-']").first();
  await partnerBtn.waitFor({ timeout: 30_000 });
  await partnerBtn.click();

  const payoutBtn = page.locator("[data-testid^='specialist-settlements-record-payout-']").first();
  const hasPayout = (await payoutBtn.count()) > 0;
  let payoutBonusId = null;
  if (hasPayout) {
    const testId = await payoutBtn.getAttribute("data-testid");
    payoutBonusId = testId?.replace("specialist-settlements-record-payout-", "") ?? null;
    await payoutBtn.click();
    await page.getByRole("heading", { name: "Зафиксировать выплату" }).waitFor();
    const confirm = page.getByRole("button", {
      name: /Подтвердить выплату наличными|Подтвердить выполненный перевод/,
    });
    await confirm.first().click();
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 60_000 });
    const after = await fetchSettlements(page);
    assert(
      !after.payable.some((r) => r.id === payoutBonusId),
      `${label}: payable row closed after payout`,
    );
    const dup = await page.request.post(
      `${PROF_URL}/api/remcard/api/bonus/${encodeURIComponent(payoutBonusId)}/pay`,
      {
        headers: { ...proxyHeaders(), "Idempotency-Key": `gate-dup-${payoutBonusId}` },
        data: { payoutMethod: "CASH" },
      },
    );
    assert(dup.status() === 200 || dup.status() === 409, `${label}: payout replay ${dup.status()}`);
  }

  await page.getByTestId("business-wallet-tab-requisites").click();
  await page.getByTestId("business-wallet-requisites-scope").waitFor({ timeout: 60_000 });

  await page.getByTestId("business-wallet-tab-settlements").click();
  await page.getByTestId("specialist-settlements-workspace").waitFor();

  await page.getByRole("button", { name: /Excel/ }).click();
  await page.waitForTimeout(500);

  await page.getByTestId("specialist-wallet-receivable-total").click();
  await page.locator("[data-testid^='specialist-partner-group-']").first().waitFor();

  return { payoutBonusId, hasPayout };
}

async function delegatedWalletPolicy(page, label) {
  const settlements = await page.request.get(`${PROF_URL}/api/remcard/api/pro/wallet/settlements`, {
    headers: proxyHeaders(),
  });
  assert(settlements.status() === 200 || settlements.status() === 403, `${label}: settlements ${settlements.status()}`);
  const reqPost = await page.request.post(`${PROF_URL}/api/remcard/api/pro/agent-payout-requisites`, {
    headers: proxyHeaders(),
    data: {
      label: "Injected",
      recipientName: "Test",
      inn: "7707083893",
      accountNumber: "40817810099910004312",
      bik: "044525225",
      bankName: "Bank",
    },
  });
  assert(reqPost.status() === 403, `${label}: requisites write ${reqPost.status()}`);
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

  if (storeDel) {
    const { context, page } = await withSession(browser, storeDel);
    await delegatedWalletPolicy(page, "store-delegated");
    await context.close();
    flow.delegatedStore = { requisitesWriteDenied: true };
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
    console.error(JSON.stringify({ ok: false, failures, application: { ...APPLICATION_RUNTIME, captureCompletedAt } }, null, 2));
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
