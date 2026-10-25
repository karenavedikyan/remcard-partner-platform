/**
 * Isolated gate: (1) prof-test delegated read + policy denials (2) ordinary owner full write flow.
 * Application runtime SHAs are pinned at process start (set by run-browser-gate.sh); never rewritten to match docs.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const NAV_URL = (process.env.NAV_E2E_URL ?? "http://127.0.0.1:3421").replace(/\/$/, "");
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const ART_DIR = path.resolve("artifacts/store-company-certificates-02-clean");
const ART = path.join(ART_DIR, "visual-shell");
const failures = [];

function gitHead(repo) {
  return execSync(`git -C ${repo} rev-parse HEAD`, { encoding: "utf8" }).trim();
}

const APPLICATION_RUNTIME = {
  frontendSha:
    process.env.E2E_APPLICATION_FRONTEND_SHA?.trim() ||
    gitHead("/agent/repos/remcard-partner-platform"),
  backendSha:
    process.env.E2E_APPLICATION_BACKEND_SHA?.trim() ||
    gitHead("/agent/repos/remcard-navigator"),
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT?.trim() || new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

function loadHarness() {
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("remcard-theme", t);
    } catch {
      /* ignore */
    }
  }, theme);
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
    await setTheme(page, theme);
    await page.waitForTimeout(200);
    for (const [suffix, viewport] of [
      ["1440", { width: 1440, height: 900 }],
      ["390", { width: 390, height: 844 }],
      ["320", { width: 320, height: 640 }],
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(ART, `${prefix}-${theme}-${suffix}.png`),
        fullPage: true,
      });
    }
  }
}

async function buildValidCreateBody(page) {
  const partnersRes = await page.request.get(
    `${PROF_URL}/api/remcard/api/store/certificate/available-partners`,
  );
  if (partnersRes.status() !== 200) {
    return { ok: false, reason: `available-partners ${partnersRes.status()}` };
  }
  const json = await partnersRes.json();
  const partner = json.partners?.[0];
  if (!partner?.storeUserId || !partner.categories?.length) {
    return { ok: false, reason: "no partner categories in harness" };
  }
  const cat = partner.categories[0];
  return {
    ok: true,
    body: {
      partners: [
        {
          storeUserId: partner.storeUserId,
          storeName: partner.storeName,
          partnershipId: partner.partnershipId ?? null,
          isSelfScan: Boolean(partner.isSelfScan),
          categories: [
            {
              category: cat.category,
              categoryLabel: cat.categoryLabel,
              discountPercent: cat.discountPercent ?? 5,
              issuerPercent: cat.issuerPercent ?? 5,
            },
          ],
        },
      ],
    },
  };
}

async function profTestWriteDenials(page, label) {
  const built = await buildValidCreateBody(page);
  assert(built.ok, `${label}: ${built.reason ?? "build create body"}`);
  const postRes = await page.request.post(`${PROF_URL}/api/remcard/api/store/certificate`, {
    data: built.body,
  });
  assert(postRes.status() === 403, `${label}: prof-test POST create denied (${postRes.status()})`);

  const listRes = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates?limit=5`,
  );
  assert(listRes.status() === 200, `${label}: list for PATCH probe ${listRes.status()}`);
  const listJson = await listRes.json();
  const certId = listJson.certificates?.[0]?.id;
  assert(certId, `${label}: cert id for PATCH deny`);
  const patchRes = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates/${encodeURIComponent(certId)}`,
    { data: { action: "archive" } },
  );
  assert(patchRes.status() === 403, `${label}: prof-test PATCH archive denied (${patchRes.status()})`);
}

async function exerciseDelegatedList(page, label, eyebrow) {
  await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-certificates-root").waitFor({ timeout: 90_000 });
  const body = await page.locator("body").innerText();
  assert(!/Мои рекомендации/i.test(body), `${label}: legacy list title`);
  assert(body.toLowerCase().includes(eyebrow.toLowerCase()), `${label}: eyebrow ${eyebrow}`);
  const listResp = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates?limit=10`,
  );
  assert(listResp.status() === 200, `${label}: list API ${listResp.status()}`);
  const listJson = await listResp.json();
  assert((listJson.totalCount ?? 0) > 0, `${label}: non-empty list`);
  return listJson;
}

async function exerciseDelegatedDetailReadOnly(page, label, certId) {
  await page.goto(
    `${PROF_URL}/recommendations?certificate=${encodeURIComponent(certId)}`,
    { waitUntil: "networkidle", timeout: 120_000 },
  );
  await page.getByTestId("specialist-certificate-detail-dialog").waitFor({ timeout: 90_000 });
  await page.getByTestId("certificate-detail-view-only-issuer").waitFor({ timeout: 30_000 });
  assert(
    (await page.getByRole("button", { name: "Изменить скидки" }).count()) === 0,
    `${label}: discount button hidden for view-only cert`,
  );
  const detailApi = await page.request.get(
    `${PROF_URL}/api/remcard/api/store/certificate/${encodeURIComponent(certId)}`,
  );
  assert(detailApi.status() === 200, `${label}: store detail read ${detailApi.status()}`);
  const detailJson = await detailApi.json();
  const pdfCode = (detailJson.promoCode ?? detailJson.qrCode ?? "").trim();
  const pdfProbe = await page.request.get(
    `${PROF_URL}/api/remcard/api/certificate/${encodeURIComponent(pdfCode)}/pdf`,
  );
  assert(
    pdfProbe.status() === 403 || pdfProbe.status() === 404,
    `${label}: prof-test PDF not served (${pdfProbe.status()})`,
  );
}

async function createCertificateViaUi(page, label) {
  await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-certificates-root").waitFor({ timeout: 90_000 });
  const listBefore = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates?limit=50`,
  );
  const beforeJson = await listBefore.json();
  const beforeIds = new Set((beforeJson.certificates ?? []).map((c) => c.id));

  await page.getByRole("button", { name: /Создать сертификат/i }).first().click();
  await page.getByTestId("specialist-certificate-create-dialog").waitFor({ timeout: 60_000 });
  await page.getByTestId("specialist-certificate-create-step-1").waitFor({ timeout: 60_000 });

  const checkbox = page
    .getByTestId("specialist-certificate-create-step-1")
    .locator('input[type="checkbox"]')
    .first();
  await checkbox.waitFor({ timeout: 30_000 });
  await checkbox.check();

  await page.getByRole("button", { name: "Далее: скидки" }).click();
  await page.getByTestId("specialist-certificate-create-step-2").waitFor({ timeout: 60_000 });

  const postWait = page.waitForResponse(
    (res) =>
      res.url().includes("/api/remcard/api/store/certificate") &&
      res.request().method() === "POST",
    { timeout: 120_000 },
  );
  await page.getByRole("button", { name: "Создать сертификат" }).click();
  const postRes = await postWait;
  assert(postRes.status() === 200, `${label}: UI POST create ${postRes.status()}`);
  const created = await postRes.json();
  assert(created.id, `${label}: created cert id`);

  await page.getByTestId("specialist-certificate-preview").waitFor({ timeout: 60_000 });

  let foundId = created.id;
  for (let i = 0; i < 8; i++) {
    const listRes = await page.request.get(
      `${PROF_URL}/api/remcard/api/pro/business-owner-certificates?limit=50`,
    );
    const listJson = await listRes.json();
    const hit = (listJson.certificates ?? []).find((c) => !beforeIds.has(c.id));
    if (hit?.id) {
      foundId = hit.id;
      break;
    }
    await page.waitForTimeout(500);
  }
  assert(foundId, `${label}: new cert visible in list`);
  return { certId: foundId, createdJson: created };
}

async function exerciseRealOwnerPostCreate(page, label, certId) {
  await page.goto(
    `${PROF_URL}/recommendations?certificate=${encodeURIComponent(certId)}`,
    { waitUntil: "networkidle", timeout: 120_000 },
  );
  await page.getByTestId("specialist-certificate-detail-dialog").waitFor({ timeout: 90_000 });
  await page.getByTestId("specialist-certificate-preview-qr").waitFor({ timeout: 60_000 });
  await page.getByRole("link", { name: "Посмотреть как клиент" }).waitFor({ timeout: 30_000 });

  const detailApi = await page.request.get(
    `${PROF_URL}/api/remcard/api/store/certificate/${encodeURIComponent(certId)}`,
  );
  const detailJson = await detailApi.json();
  const pdfCode = (detailJson.promoCode ?? detailJson.qrCode ?? "").trim();
  const pdfRes = await page.request.get(
    `${PROF_URL}/api/remcard/api/certificate/${encodeURIComponent(pdfCode)}/pdf`,
  );
  assert(pdfRes.status() === 200, `${label}: PDF ${pdfRes.status()}`);
  const ct = pdfRes.headers()["content-type"] ?? "";
  assert(ct.includes("pdf"), `${label}: PDF content-type ${ct}`);
  const buf = Buffer.from(await pdfRes.body());
  assert(buf.slice(0, 4).toString("utf8") === "%PDF", `${label}: PDF magic`);

  await page.getByRole("button", { name: "Изменить скидки" }).click();
  await page.getByRole("dialog").filter({ hasText: /скидк/i }).waitFor({ timeout: 30_000 });
  const discountInput = page.getByLabel(/Скидка клиенту/i).first();
  await discountInput.fill("6");
  const patchWait = page.waitForResponse(
    (res) =>
      res.url().includes("/business-owner-certificates/") && res.request().method() === "PATCH",
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: /Сохранить/i }).click();
  const patchRes = await patchWait;
  assert(patchRes.status() === 200, `${label}: discount PATCH ${patchRes.status()}`);

  const aliasPatch = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates/${encodeURIComponent(certId)}`,
    { data: { userAlias: `gate-${label}-${Date.now()}` } },
  );
  assert(aliasPatch.status() === 200, `${label}: alias PATCH ${aliasPatch.status()}`);

  const archivePatch = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates/${encodeURIComponent(certId)}`,
    { data: { action: "archive" } },
  );
  assert(archivePatch.status() === 200, `${label}: archive PATCH ${archivePatch.status()}`);

  const restorePatch = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates/${encodeURIComponent(certId)}`,
    { data: { action: "restore" } },
  );
  assert(restorePatch.status() === 200, `${label}: restore PATCH ${restorePatch.status()}`);
}

async function exerciseRealOwnerFull(page, label) {
  const { certId } = await createCertificateViaUi(page, label);
  await exerciseRealOwnerPostCreate(page, label, certId);
  return certId;
}

async function masterNegative(page) {
  await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText ?? "";
      if (/Application error/i.test(text)) return false;
      if (text.includes("Загрузка…") || text.includes("Загрузка...")) return false;
      return true;
    },
    { timeout: 90_000 },
  );
  const count = await page.getByTestId("business-certificates-root").count();
  assert(count === 0, "master: must not use business-owner shell after load");
}

function writeArtifacts(delegated, realOwner) {
  const captureCompletedAt = new Date().toISOString();
  const meta = {
    applicationRuntime: {
      frontendSha: APPLICATION_RUNTIME.frontendSha,
      backendSha: APPLICATION_RUNTIME.backendSha,
      captureStartedAt: APPLICATION_RUNTIME.captureStartedAt,
      captureCompletedAt,
    },
    profUrl: PROF_URL,
    navUrl: NAV_URL,
    harnessState: STATE_PATH,
    delegatedProfTestReadGate: delegated,
    realOwnerFullFlow: realOwner,
    failures,
    ok: failures.length === 0,
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
        captureKind: "store-company-certificates-02-clean",
        profUrl: PROF_URL,
        navUrl: NAV_URL,
      },
      null,
      2,
    ),
  );
  return meta;
}

async function main() {
  const harness = loadHarness();
  const storeProf = harness.roles?.store?.delegationToken;
  const companyProf = harness.roles?.company?.delegationToken;
  const masterProf = harness.roles?.master?.delegationToken;
  const viewOnlyCertId = harness.roles?.store?.viewOnlyShellCertificateId;
  const storeRealToken = harness.roles?.store?.realOwner?.ownerSessionToken;
  const companyRealToken = harness.roles?.company?.realOwner?.ownerSessionToken;

  if (!storeProf || !companyProf || !storeRealToken || !companyRealToken) {
    throw new Error("harness missing delegation or realOwner session tokens");
  }

  const browser = await chromium.launch({ headless: true });
  const delegated = { store: {}, company: {}, master: {} };
  const realOwner = { store: {}, company: {} };

  {
    const { context, page } = await withSession(browser, storeProf, { width: 1440, height: 900 });
    await exerciseDelegatedList(page, "store-delegated", "Магазин");
    await profTestWriteDenials(page, "store-delegated");
    if (viewOnlyCertId) {
      await exerciseDelegatedDetailReadOnly(page, "store-delegated-viewonly", viewOnlyCertId);
    }
    await captureMatrix(page, "store-certificates-delegated");
    delegated.store = { readList: true, writeDenials: true, viewOnlyDetail: Boolean(viewOnlyCertId) };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyProf, { width: 1440, height: 900 });
    await exerciseDelegatedList(page, "company-delegated", "Компания");
    await profTestWriteDenials(page, "company-delegated");
    delegated.company = { readList: true, writeDenials: true };
    await captureMatrix(page, "company-certificates-delegated");
    await context.close();
  }

  if (masterProf) {
    const { context, page } = await withSession(browser, masterProf, { width: 1440, height: 900 });
    await masterNegative(page);
    delegated.master = { noBusinessShell: true };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, storeRealToken, { width: 1440, height: 900 });
    const certId = await exerciseRealOwnerFull(page, "store-real-owner");
    realOwner.store = { createDetailPdfMutations: true, certId };
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyRealToken, { width: 1440, height: 900 });
    const certId = await exerciseRealOwnerFull(page, "company-real-owner");
    realOwner.company = { createDetailPdfMutations: true, certId };
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
