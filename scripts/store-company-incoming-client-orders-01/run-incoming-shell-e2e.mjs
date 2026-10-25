/**
 * Isolated gate: incoming third-party cert → link local CRM → client receiving list.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/store-company-incoming-client-orders-01");
const ART = path.join(ART_DIR, "visual-shell");
const failures = [];

const APPLICATION_RUNTIME = {
  frontendSha: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  backendSha: execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  captureStartedAt: new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function proxyHeaders() {
  return { Origin: PROF_URL };
}

async function withSession(browser, token) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
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

async function capturePurchaseAndClient(page, prefix) {
  fs.mkdirSync(ART, { recursive: true });
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
      try {
        localStorage.setItem("remcard-theme", t);
      } catch {
        /* ignore */
      }
    }, theme);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(120);
    await page.screenshot({
      path: path.join(ART, `${prefix}-${theme}-390.png`),
      fullPage: true,
    });
  }
}

async function runRole(browser, state, roleKey, prefix) {
  const role = state.roles?.[roleKey];
  const token = role?.realOwner?.token;
  const orderId = role?.gateIncomingOrderId;
  const localClientId = role?.gateIncomingLocalClientId;
  assert(token, `${prefix}: missing owner token`);
  assert(orderId && localClientId, `${prefix}: missing incoming fixture ids`);

  const { context, page } = await withSession(browser, token);

  const linkRes = await page.request.patch(
    `${PROF_URL}/api/remcard/api/store/orders/${encodeURIComponent(orderId)}/receiving-client`,
    {
      headers: proxyHeaders(),
      data: { action: "link", agentClientId: localClientId },
    },
  );
  assert(linkRes.status() === 200, `${prefix}: link ${linkRes.status()}`);

  const clientRes = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-clients/${encodeURIComponent(localClientId)}`,
    { headers: proxyHeaders() },
  );
  assert(clientRes.status() === 200, `${prefix}: client GET ${clientRes.status()}`);
  const clientJson = await clientRes.json();
  const receiving = clientJson.receivingPurchases ?? [];
  assert(
    receiving.some((p) => p.id === orderId),
    `${prefix}: receiving list missing order ${orderId}`,
  );

  await page.goto(`${PROF_URL}/history/purchases/${encodeURIComponent(orderId)}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByTestId("purchase-receiving-client-panel").waitFor({ timeout: 60_000 });
  await capturePurchaseAndClient(page, `${prefix}-purchase`);

  await page.goto(`${PROF_URL}/clients/${encodeURIComponent(localClientId)}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByTestId("client-receiving-purchases").waitFor({ timeout: 60_000 });
  await capturePurchaseAndClient(page, `${prefix}-client`);

  await context.close();
}

async function main() {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const browser = await chromium.launch({ headless: true });
  try {
    await runRole(browser, state, "store", "store");
    await runRole(browser, state, "company", "company");
  } finally {
    await browser.close();
  }

  const captureCompletedAt = new Date().toISOString();
  fs.mkdirSync(ART_DIR, { recursive: true });
  const ok = failures.length === 0;
  fs.writeFileSync(
    path.join(ART_DIR, "shell-gate.json"),
    JSON.stringify(
      {
        ok,
        failures,
        application: APPLICATION_RUNTIME,
        captureCompletedAt,
      },
      null,
      2,
    ),
  );
  fs.writeFileSync(path.join(ART_DIR, "shell-browser-gate.exit"), ok ? "0\n" : "1\n");
  if (!ok) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(
    JSON.stringify({ ok, ...APPLICATION_RUNTIME, captureCompletedAt }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
