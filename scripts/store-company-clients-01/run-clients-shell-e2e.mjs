/**
 * Isolated clients gate for STORE/COMPANY org owners.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/store-company-clients-01");
const ART = path.join(ART_DIR, "visual-shell");
const failures = [];
const CLIENT_NAME = `Gate UI client ${Date.now()}`;

function proxyHeaders() {
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

async function withSession(browser, token) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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

async function captureMatrix(page, prefix) {
  fs.mkdirSync(ART, { recursive: true });
  assert(!page.url().startsWith("about:"), `${prefix}: not blank`);
  await page.getByTestId("business-clients-root").waitFor({ timeout: 60_000 });
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
      await page.waitForTimeout(100);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert(overflow <= 2, `${prefix}-${theme}-${suffix}: overflow ${overflow}px`);
      await page.screenshot({ path: path.join(ART, `${prefix}-${theme}-${suffix}.png`), fullPage: true });
    }
  }
}

async function delegatedReadAndForeignDeny(page, foreignClientId, label) {
  await page.goto(`${PROF_URL}/clients`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-clients-root").waitFor({ timeout: 90_000 });
  const list = await page.request.get(`${PROF_URL}/api/remcard/api/pro/agent-clients`, {
    headers: proxyHeaders(),
  });
  assert(list.status() === 200, `${label}: list ${list.status()}`);
  const patch = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/agent-clients/${encodeURIComponent(foreignClientId)}`,
    { headers: proxyHeaders(), data: { action: "archive" } },
  );
  assert(patch.status() === 404 || patch.status() === 403, `${label}: foreign PATCH ${patch.status()}`);
}

async function realOwnerFlow(page, label) {
  await page.goto(`${PROF_URL}/clients`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-clients-root").waitFor({ timeout: 90_000 });
  assert((await page.getByText("Магазин").count()) > 0 || (await page.getByText("Компания").count()) > 0, `${label}: business eyebrow`);

  await page.getByRole("button", { name: "Добавить клиента" }).click();
  const dialog = page.getByTestId("agent-client-form-dialog");
  await dialog.waitFor({ timeout: 30_000 });
  await dialog.locator('label').filter({ hasText: "Имя" }).locator("input").fill(CLIENT_NAME);
  await dialog.locator('label').filter({ hasText: "Город" }).locator("input").fill("Краснодар");
  const createWait = page.waitForResponse(
    (res) => res.url().includes("/pro/agent-clients") && res.request().method() === "POST" && res.status() === 200,
    { timeout: 60_000 },
  );
  await dialog.getByRole("button", { name: "Сохранить" }).click();
  const createRes = await createWait;
  const createBody = await createRes.json();
  const clientId = createBody.client?.id;
  assert(clientId, `${label}: created client id`);

  await page.getByRole("link", { name: CLIENT_NAME }).waitFor({ timeout: 30_000 });
  await page.getByRole("link", { name: CLIENT_NAME }).click();
  await page.getByTestId("business-client-detail-root").waitFor({ timeout: 60_000 });

  await page.getByRole("button", { name: "Редактировать" }).click();
  await dialog.waitFor({ timeout: 30_000 });
  await dialog.locator('label').filter({ hasText: "Заметка" }).locator("textarea").fill("Gate note persisted");
  await dialog.getByRole("button", { name: "Сохранить" }).click();
  await page.getByText("Gate note persisted").waitFor({ timeout: 30_000 });

  const certLink = page.getByTestId("business-client-create-cert");
  await certLink.waitFor({ timeout: 30_000 });
  const href = await certLink.getAttribute("href");
  assert(href?.includes(`clientId=${encodeURIComponent(clientId)}`), `${label}: cert builder clientId`);
  assert(href?.includes("/recommendations/new"), `${label}: business cert route`);

  await page.getByRole("button", { name: "В архив" }).click();
  await page.waitForTimeout(400);
  await page.goto(`${PROF_URL}/clients`, { waitUntil: "networkidle" });
  await page.getByTestId("agent-r03-collection-toolbar").locator("select").first().selectOption("archived");
  await page.getByRole("link", { name: CLIENT_NAME }).waitFor({ timeout: 30_000 });
  await page.getByRole("button", { name: "Восстановить" }).first().click();
  await page.getByTestId("agent-r03-collection-toolbar").locator("select").first().selectOption("active");
  await page.getByRole("link", { name: CLIENT_NAME }).waitFor({ timeout: 30_000 });

  return clientId;
}

function writeArtifacts(meta) {
  const captureCompletedAt = new Date().toISOString();
  const payload = {
    applicationRuntime: { ...APPLICATION_RUNTIME, captureCompletedAt },
    profUrl: PROF_URL,
    ...meta,
    failures,
    ok: failures.length === 0,
  };
  fs.mkdirSync(ART_DIR, { recursive: true });
  fs.writeFileSync(path.join(ART_DIR, "shell-gate.json"), JSON.stringify(payload, null, 2));
  fs.writeFileSync(
    path.join(ART_DIR, "metadata-shell.json"),
    JSON.stringify(
      {
        frontendApplicationSha: APPLICATION_RUNTIME.frontendSha,
        backendApplicationSha: APPLICATION_RUNTIME.backendSha,
        captureStartedAt: APPLICATION_RUNTIME.captureStartedAt,
        captureCompletedAt,
        captureKind: "store-company-clients-01",
        profUrl: PROF_URL,
      },
      null,
      2,
    ),
  );
}

async function main() {
  const harness = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const storeDel = harness.roles?.store?.delegationToken;
  const storeReal = harness.roles?.store?.realOwner?.ownerSessionToken;
  const companyReal = harness.roles?.company?.realOwner?.ownerSessionToken;
  const foreignClientId = harness.roles?.company?.gateForeignClientId;
  if (!storeDel || !storeReal || !companyReal || !foreignClientId) {
    throw new Error("harness missing tokens or gateForeignClientId");
  }

  const browser = await chromium.launch({ headless: true });
  const flow = {};

  {
    const { context, page } = await withSession(browser, storeDel);
    await delegatedReadAndForeignDeny(page, foreignClientId, "store-delegated");
    flow.delegatedStore = { foreignDeny: true };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, storeReal);
    flow.storeRealClientId = await realOwnerFlow(page, "store-real");
    await page.goto(`${PROF_URL}/clients`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: CLIENT_NAME }).click();
    await page.getByTestId("business-client-detail-root").waitFor();
    await captureMatrix(page, "store-clients-real");
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyReal);
    await page.goto(`${PROF_URL}/clients`, { waitUntil: "networkidle" });
    await page.getByTestId("business-clients-root").waitFor({ timeout: 90_000 });
    await captureMatrix(page, "company-clients-real");
    flow.companyReal = { hub: true };
    await context.close();
  }

  await browser.close();
  writeArtifacts({ flow, foreignClientId });
  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, flow }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
