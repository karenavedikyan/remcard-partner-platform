/**
 * Incoming third-party cert: UI link / change / unlink + API readback + deny cases.
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
let captureCompletedAt = null;

const APPLICATION_RUNTIME = {
  frontendSha:
    process.env.E2E_APPLICATION_FRONTEND_SHA?.trim() ||
    execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", { encoding: "utf8" }).trim(),
  backendSha:
    process.env.E2E_APPLICATION_BACKEND_SHA?.trim() ||
    execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", { encoding: "utf8" }).trim(),
  captureStartedAt:
    process.env.E2E_CAPTURE_STARTED_AT?.trim() || new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function proxyHeaders() {
  return { Origin: PROF_URL };
}

function wipeVisualShellPngs() {
  fs.mkdirSync(ART, { recursive: true });
  for (const name of fs.readdirSync(ART)) {
    if (name.endsWith(".png")) fs.unlinkSync(path.join(ART, name));
  }
}

function writeArtifacts(flow, ok) {
  fs.mkdirSync(ART_DIR, { recursive: true });
  const payload = {
    ok,
    failures,
    application: { ...APPLICATION_RUNTIME, captureCompletedAt },
    flow,
    migrationPaths: [
      "20261025143000_store_company_incoming_client_order_link",
      "20261025180000_incoming_client_link_revision_audit",
    ],
  };
  fs.writeFileSync(path.join(ART_DIR, "shell-gate.json"), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(ART_DIR, "metadata-shell.json"), JSON.stringify(payload, null, 2));
  fs.writeFileSync(path.join(ART_DIR, "shell-browser-gate.exit"), ok ? "0\n" : "1\n");
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

async function capturePair(page, prefix) {
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

async function fetchOrder(page, orderId) {
  const res = await page.request.get(
    `${PROF_URL}/api/remcard/api/store/orders/${encodeURIComponent(orderId)}`,
    { headers: proxyHeaders() },
  );
  return { status: res.status(), body: res.ok() ? await res.json() : null };
}

async function resetLinkIfAny(page, orderId, label) {
  const first = await fetchOrder(page, orderId);
  assert(first.status === 200, `${label}: order GET ${first.status}`);
  let revision = first.body?.order?.receivingLinkRevision ?? 0;
  if (first.body?.order?.receivingClient) {
    const unlink = await page.request.patch(
      `${PROF_URL}/api/remcard/api/store/orders/${encodeURIComponent(orderId)}/receiving-client`,
      {
        headers: proxyHeaders(),
        data: { action: "unlink", expectedVersion: revision },
      },
    );
    assert(unlink.status() === 200, `${label}: pre-unlink ${unlink.status()}`);
    revision += 1;
  }
  return revision;
}

async function uiCreateClient(page, displayName) {
  await page.getByRole("button", { name: "Новый клиент" }).click();
  const dialog = page.getByTestId("agent-client-form-dialog");
  await dialog.waitFor({ timeout: 30_000 });
  await dialog.locator("label").filter({ hasText: "Имя" }).locator("input").fill(displayName);
  await dialog.getByRole("button", { name: "Создать" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 60_000 }).catch(() => undefined);
}

async function captureClientReceivingLinked(page, prefix, clientId) {
  await page.goto(`${PROF_URL}/clients/${encodeURIComponent(clientId)}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  const receiving = page.getByTestId("client-receiving-purchases");
  await receiving.waitFor({ timeout: 60_000 });
  await receiving.evaluate((el) => {
    if (el instanceof HTMLDetailsElement) el.open = true;
  });
  await page.waitForTimeout(150);
  await capturePair(page, `${prefix}-client-receiving-linked`);
}

async function uiLinkClient(page, clientDisplayName, label) {
  await page.getByTestId("receiving-client-search").fill(clientDisplayName.slice(0, 8));
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: clientDisplayName }).click();
  const saveBtn = page.getByRole("button", { name: /Сохранить привязку|Сменить клиента/ });
  await saveBtn.click();
  await page.getByTestId("receiving-client-pending").waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "Подтвердить" }).click();
  await page.waitForTimeout(500);
}

async function runIncomingFlow(browser, state, roleKey, prefix, foreignClientId, staffToken) {
  const role = state.roles?.[roleKey];
  const token = role?.realOwner?.ownerSessionToken;
  const orderId = role?.gateIncomingOrderId;
  const localClientId = role?.gateIncomingLocalClientId;
  assert(token, `${prefix}: missing owner token`);
  assert(orderId && localClientId, `${prefix}: missing incoming fixture ids`);
  if (!token || !orderId || !localClientId) {
    return { orderId, localClientId, prefix, aborted: true };
  }

  const { context, page } = await withSession(browser, token);
  const flow = { orderId, localClientId, prefix };

  const baselineOrder = await fetchOrder(page, orderId);
  const baselineBonusLen = baselineOrder.body?.order?.linkedAccruals?.length ?? 0;
  const baselineTotal = baselineOrder.body?.order?.totalAmount;

  let revision = await resetLinkIfAny(page, orderId, prefix);

  const clientMeta = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-clients/${encodeURIComponent(localClientId)}`,
    { headers: proxyHeaders() },
  );
  assert(clientMeta.status() === 200, `${prefix}: local client GET`);
  const clientJson = await clientMeta.json();
  const clientName = clientJson.client?.displayName ?? "";
  assert(clientName, `${prefix}: client display name`);
  const receivingBefore = clientJson.receivingPurchases ?? [];
  assert(!receivingBefore.some((p) => p.id === orderId), `${prefix}: receiving empty before link`);

  await page.goto(`${PROF_URL}/history/purchases/${encodeURIComponent(orderId)}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByTestId("purchase-receiving-client-panel").waitFor({ timeout: 60_000 });
  await uiLinkClient(page, clientName, prefix);

  const afterLink = await fetchOrder(page, orderId);
  assert(afterLink.body?.order?.receivingClient?.agentClientId === localClientId, `${prefix}: linked id`);
  assert(
    afterLink.body?.order?.receivingLinkRevision > revision,
    `${prefix}: revision bumped after link`,
  );
  revision = afterLink.body?.order?.receivingLinkRevision;

  const clientAfter = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-clients/${encodeURIComponent(localClientId)}`,
    { headers: proxyHeaders() },
  );
  const clientAfterJson = clientAfter.ok() ? await clientAfter.json() : {};
  assert(
    (clientAfterJson.receivingPurchases ?? []).some((p) => p.id === orderId),
    `${prefix}: exact order in receiving list`,
  );
  assert(
    !(clientAfterJson.receivingPurchases ?? []).some(
      (p) => p.id === orderId && p.recommenderName?.includes("+7999"),
    ),
    `${prefix}: no foreign phone in recommender`,
  );

  await capturePair(page, `${prefix}-purchase-linked`);
  await captureClientReceivingLinked(page, prefix, localClientId);

  const batchLinked = await page.request.post(`${PROF_URL}/api/remcard/api/pro/agent-clients/batch`, {
    headers: proxyHeaders(),
    data: { action: "delete", ids: [localClientId] },
  });
  assert(batchLinked.status() === 200, `${prefix}: batch delete HTTP ${batchLinked.status()}`);
  const batchLinkedJson = await batchLinked.json();
  assert(
    (batchLinkedJson.skipped ?? []).some(
      (s) => s.id === localClientId && s.reason === "has_receiving_order_links",
    ),
    `${prefix}: batch skip linked client`,
  );

  const altName = `${prefix} alt ${Date.now()}`;
  await page.goto(`${PROF_URL}/history/purchases/${encodeURIComponent(orderId)}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByTestId("purchase-receiving-client-panel").waitFor({ timeout: 60_000 });
  await uiCreateClient(page, altName);
  const listAfterCreate = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-clients?limit=50`,
    { headers: proxyHeaders() },
  );
  const listJson = listAfterCreate.ok() ? await listAfterCreate.json() : { clients: [] };
  const altClientId = (listJson.clients ?? []).find((c) => c.displayName === altName)?.id;
  assert(altClientId, `${prefix}: alt client id from UI create`);

  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("purchase-receiving-client-panel").waitFor({ timeout: 60_000 });
  await uiLinkClient(page, altName, prefix);

  const afterChange = await fetchOrder(page, orderId);
  assert(
    afterChange.body?.order?.receivingClient?.agentClientId === altClientId,
    `${prefix}: changed client id`,
  );
  revision = afterChange.body?.order?.receivingLinkRevision;

  const oldClient = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-clients/${encodeURIComponent(localClientId)}`,
    { headers: proxyHeaders() },
  );
  const oldJson = oldClient.ok() ? await oldClient.json() : {};
  assert(
    !(oldJson.receivingPurchases ?? []).some((p) => p.id === orderId),
    `${prefix}: order removed from previous client card`,
  );

  const foreignPatch = await page.request.patch(
    `${PROF_URL}/api/remcard/api/store/orders/${encodeURIComponent(orderId)}/receiving-client`,
    {
      headers: proxyHeaders(),
      data: {
        action: "link",
        agentClientId: foreignClientId,
        expectedVersion: afterChange.body?.order?.receivingLinkRevision ?? revision,
      },
    },
  );
  assert(
    foreignPatch.status() === 404 || foreignPatch.status() === 403,
    `${prefix}: foreign client deny ${foreignPatch.status()}`,
  );

  if (staffToken) {
    const staffCtx = await withSession(browser, staffToken);
    const staffPatch = await staffCtx.page.request.patch(
      `${PROF_URL}/api/remcard/api/store/orders/${encodeURIComponent(orderId)}/receiving-client`,
      {
        headers: proxyHeaders(),
        data: {
          action: "link",
          agentClientId: localClientId,
          expectedVersion: afterChange.body?.order?.receivingLinkRevision ?? revision,
        },
      },
    );
    assert(
      staffPatch.status() === 403 || staffPatch.status() === 401,
      `${prefix}: staff link deny ${staffPatch.status()}`,
    );
    await staffCtx.context.close();
  }

  const batchAlt = await page.request.post(`${PROF_URL}/api/remcard/api/pro/agent-clients/batch`, {
    headers: proxyHeaders(),
    data: { action: "delete", ids: [altClientId, localClientId] },
  });
  const batchAltJson = batchAlt.ok() ? await batchAlt.json() : {};
  assert(
    (batchAltJson.skipped ?? []).some(
      (s) => s.id === altClientId && s.reason === "has_receiving_order_links",
    ),
    `${prefix}: batch skip alt while linked`,
  );

  await page.getByRole("button", { name: "Снять привязку" }).click();
  await page.getByTestId("receiving-client-pending").waitFor();
  await page.getByRole("button", { name: "Подтвердить" }).click();
  await page.waitForTimeout(400);

  const afterUnlink = await fetchOrder(page, orderId);
  assert(!afterUnlink.body?.order?.receivingClient, `${prefix}: unlinked`);
  const altAfter = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/agent-clients/${encodeURIComponent(altClientId)}`,
    { headers: proxyHeaders() },
  );
  const altAfterJson = altAfter.ok() ? await altAfter.json() : {};
  assert(
    !(altAfterJson.receivingPurchases ?? []).some((p) => p.id === orderId),
    `${prefix}: absent after unlink`,
  );

  const finalOrder = await fetchOrder(page, orderId);
  assert(finalOrder.body?.order?.totalAmount === baselineTotal, `${prefix}: total unchanged`);
  assert(
    (finalOrder.body?.order?.linkedAccruals?.length ?? 0) === baselineBonusLen,
    `${prefix}: bonus links unchanged`,
  );

  flow.completed = true;
  await context.close();
  return flow;
}

async function main() {
  wipeVisualShellPngs();
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const storeForeignClientId = state.roles?.store?.gateForeignClientId;
  const companyForeignClientId = state.roles?.company?.gateForeignClientId;
  assert(companyForeignClientId, "missing company foreign CRM id for store deny");
  assert(storeForeignClientId, "missing store foreign CRM id for company deny");
  const storeStaff = state.roles?.store?.delegationToken ?? null;

  const browser = await chromium.launch({ headless: true });
  const flow = {};
  try {
    flow.store = await runIncomingFlow(
      browser,
      state,
      "store",
      "store",
      companyForeignClientId,
      storeStaff,
    );
    flow.company = await runIncomingFlow(
      browser,
      state,
      "company",
      "company",
      storeForeignClientId,
      null,
    );

    const companyToken = state.roles?.company?.realOwner?.ownerSessionToken;
    const storeIncomingOrderId = state.roles?.store?.gateIncomingOrderId;
    if (companyToken && storeIncomingOrderId) {
      const { context, page } = await withSession(browser, companyToken);
      const cross = await page.request.get(
        `${PROF_URL}/api/remcard/api/store/orders/${encodeURIComponent(storeIncomingOrderId)}`,
        { headers: proxyHeaders() },
      );
      assert(cross.status() === 404 || cross.status() === 403, `company cross store order ${cross.status()}`);
      flow.companyCrossStoreOrderDenied = cross.status();
      await context.close();
    }
  } finally {
    await browser.close();
  }

  captureCompletedAt = new Date().toISOString();
  const ok = failures.length === 0;
  writeArtifacts(flow, ok);
  const stdout = { ok, application: { ...APPLICATION_RUNTIME, captureCompletedAt }, failures, flow };
  console.log(JSON.stringify(stdout, null, 2));
  if (!ok) {
    process.exit(1);
  }
}

main().catch((e) => {
  captureCompletedAt = new Date().toISOString();
  failures.push(String(e?.stack ?? e));
  writeArtifacts({ fatal: String(e) }, false);
  console.error(JSON.stringify({ ok: false, failures }, null, 2));
  process.exit(1);
});
