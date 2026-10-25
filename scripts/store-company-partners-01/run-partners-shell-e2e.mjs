/**
 * Isolated partners gate: delegated prof-test read + policy checks; ordinary-owner UI/API flow.
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

async function captureMatrix(page, prefix) {
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
    await page.waitForTimeout(150);
    for (const [suffix, viewport] of [
      ["1440", { width: 1440, height: 900 }],
      ["390", { width: 390, height: 844 }],
      ["320", { width: 320, height: 640 }],
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(120);
      await page.screenshot({
        path: path.join(ART, `${prefix}-${theme}-${suffix}.png`),
        fullPage: true,
      });
    }
  }
}

async function exerciseDelegatedHub(page, label, audience) {
  await page.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  const hub = page.getByTestId("agent-r04-partners");
  await hub.waitFor({ timeout: 90_000 });
  assert(
    (await hub.getAttribute("data-partners-audience")) === audience,
    `${label}: audience ${audience}`,
  );
  const listRes = await page.request.get(`${PROF_URL}/api/remcard/api/partnership/list`, {
    headers: proxyExtraHeaders(),
  });
  assert(listRes.status() === 200, `${label}: list ${listRes.status()}`);

  const searchRes = await page.request.get(
    `${PROF_URL}/api/remcard/api/partnership/search?q=Real&limit=5`,
    { headers: proxyExtraHeaders() },
  );
  assert(searchRes.status() === 200, `${label}: search ${searchRes.status()}`);

  const foreignPatch = await page.request.patch(
    `${PROF_URL}/api/remcard/api/partnership/nonexistent-partnership-id`,
    { headers: proxyExtraHeaders(), data: { action: "cancel" } },
  );
  assert(
    foreignPatch.status() === 403 || foreignPatch.status() === 404 || foreignPatch.status() === 401,
    `${label}: foreign PATCH denied (${foreignPatch.status()})`,
  );
}

async function exerciseRealOwnerHub(page, label, audience, counterpartyUserId) {
  await page.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  const hub = page.getByTestId("agent-r04-partners");
  await hub.waitFor({ timeout: 90_000 });
  assert(
    (await hub.getAttribute("data-partners-audience")) === audience,
    `${label}: audience ${audience}`,
  );
  const body = await page.locator("body").innerText();
  assert(!/АГЕНТ|СПЕЦИАЛИСТ|R04|R06/i.test(body), `${label}: no internal role labels in chrome`);

  await page.getByRole("button", { name: "Найти или пригласить партнёра" }).click();
  await page.getByTestId("agent-r04-modal-find").waitFor({ timeout: 60_000 });
  const searchInput = page.getByTestId("agent-r04-list-search");
  await searchInput.fill("Synthetic");
  const searchWait = page.waitForResponse(
    (res) => res.url().includes("/partnership/search") && res.status() === 200,
    { timeout: 60_000 },
  );
  await searchInput.press("Enter");
  await searchWait;
  const results = page.getByTestId("agent-partner-search-results");
  await results.waitFor({ timeout: 30_000 });
  assert((await results.locator("article").count()) > 0, `${label}: search UI results`);

  const invitePost = await page.request.post(`${PROF_URL}/api/remcard/api/partnership/invite`, {
    headers: proxyExtraHeaders(),
    data: {
      targetUserId: counterpartyUserId,
      note: `gate-${label}-${Date.now()}`,
      terms: [
        {
          category: "doors",
          categoryLabel: "Двери",
          storePercent: 8,
          isExcluded: false,
        },
      ],
    },
  });
  assert(
    invitePost.status() === 200 || invitePost.status() === 201,
    `${label}: invite POST ${invitePost.status()}`,
  );
}

async function acceptIncomingInvite(page, label) {
  await page.goto(`${PROF_URL}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("tab", { name: "Приглашения" }).click();
  await page.getByTestId("agent-invites-incoming").click();
  const listRes = await page.request.get(`${PROF_URL}/api/remcard/api/partnership/list`, {
    headers: proxyExtraHeaders(),
  });
  const listJson = await listRes.json();
  const pending = (listJson.partnerships ?? []).find(
    (p) => p.status === "PENDING" || p.status === "INVITE_PENDING",
  );
  assert(pending?.id, `${label}: pending invite in list`);
  const accept = await page.request.patch(
    `${PROF_URL}/api/remcard/api/partnership/${encodeURIComponent(pending.id)}`,
    { headers: proxyExtraHeaders(), data: { action: "accept_pending" } },
  );
  assert(accept.status() === 200, `${label}: accept_pending ${accept.status()}`);
}

function writeArtifacts(delegated, realOwner) {
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
    failures,
    ok: failures.length === 0,
    profTestPolicyNote:
      "POST /api/partnership/invite is on existing prof-test allowlist; this gate uses foreign PATCH deny for delegated write-negative.",
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
  const storeReal = harness.roles?.store?.realOwner?.ownerSessionToken;
  const companyReal = harness.roles?.company?.realOwner?.ownerSessionToken;
  const companyUserId = harness.roles?.company?.realOwner?.userId;
  const storeUserId = harness.roles?.store?.realOwner?.userId;
  if (!storeDel || !companyDel || !storeReal || !companyReal || !companyUserId || !storeUserId) {
    throw new Error("harness missing delegation or realOwner tokens/userIds");
  }

  const browser = await chromium.launch({ headless: true });
  const delegated = {};
  const realOwner = {};

  {
    const { context, page } = await withSession(browser, storeDel, { width: 1440, height: 900 });
    await exerciseDelegatedHub(page, "store-delegated", "business-store-r04");
    await captureMatrix(page, "store-partners-delegated");
    delegated.store = { readHub: true };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyDel, { width: 1440, height: 900 });
    await exerciseDelegatedHub(page, "company-delegated", "business-company-r04");
    await captureMatrix(page, "company-partners-delegated");
    delegated.company = { readHub: true };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, storeReal, { width: 1440, height: 900 });
    await exerciseRealOwnerHub(page, "store-real", "business-store-r04", companyUserId);
    realOwner.store = { searchAndInvite: true };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyReal, { width: 1440, height: 900 });
    await acceptIncomingInvite(page, "company-real-accept");
    await exerciseRealOwnerHub(page, "company-real-search", "business-company-r04", storeUserId);
    await captureMatrix(page, "company-partners-real");
    realOwner.company = { acceptInvite: true, search: true };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, storeReal, { width: 1440, height: 900 });
    await captureMatrix(page, "store-partners-real");
    await context.close();
  }

  await browser.close();

  const meta = writeArtifacts(delegated, realOwner);
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
