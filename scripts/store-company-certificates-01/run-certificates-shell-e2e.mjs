/**
 * Isolated shell gate: business org owners — list, detail, PDF, workspace archive, prof-test write deny.
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

async function profTestWriteDenials(page, label, certId) {
  const postRes = await page.request.post(`${PROF_URL}/api/remcard/api/store/certificate`, {
    data: { partners: [] },
  });
  assert(postRes.status() === 403 || postRes.status() === 400, `${label}: prof-test POST create denied (${postRes.status()})`);

  const patchRes = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates/${encodeURIComponent(certId)}`,
    { data: { action: "archive" } },
  );
  assert(patchRes.status() === 403, `${label}: prof-test PATCH archive denied (${patchRes.status()})`);
}

async function exerciseList(page, label, eyebrow) {
  const listRespPromise = page.waitForResponse(
    (r) =>
      r.url().includes("business-owner-certificates") &&
      !r.url().includes("/batch") &&
      r.status() === 200,
    { timeout: 90_000 },
  );
  await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("business-certificates-root").waitFor({ timeout: 90_000 });
  const body = await page.locator("body").innerText();
  assert(!/Мои рекомендации/i.test(body), `${label}: legacy list title`);
  assert(!/СПЕЦИАЛИСТ|АГЕНТ/i.test(body), `${label}: internal role labels`);
  assert(body.toLowerCase().includes(eyebrow.toLowerCase()), `${label}: eyebrow ${eyebrow}`);
  const listJson = await (await listRespPromise).json();
  assert((listJson.totalCount ?? 0) > 0, `${label}: non-empty list`);
  return listJson.certificates?.[0]?.id ?? null;
}

async function exerciseOwnerDetailAndPdf(page, label, certId) {
  const detailPromise = page.waitForResponse(
    (r) => r.url().includes(`/business-owner-certificates/${certId}`) && r.status() === 200,
    { timeout: 90_000 },
  );
  await page.goto(
    `${PROF_URL}/recommendations?certificate=${encodeURIComponent(certId)}`,
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await page.getByTestId("specialist-certificate-detail-dialog").waitFor({ timeout: 90_000 });
  await detailPromise;
  await page.getByTestId("certificate-code").waitFor({ timeout: 30_000 });
  const pdfRespPromise = page.waitForResponse(
    (r) => r.url().includes("/api/certificate/") && r.url().includes("/pdf") && r.status() === 200,
    { timeout: 90_000 },
  );
  await page.getByRole("button", { name: /PDF/i }).click();
  const pdfResp = await pdfRespPromise;
  const ct = pdfResp.headers()["content-type"] ?? "";
  assert(ct.includes("pdf"), `${label}: PDF content-type (${ct})`);
}

async function exerciseArchiveRestore(page, label, certId) {
  const archiveResp = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates/${encodeURIComponent(certId)}`,
    { data: { action: "archive" } },
  );
  assert(archiveResp.status() === 200, `${label}: owner archive (${archiveResp.status()})`);
  const restoreResp = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates/${encodeURIComponent(certId)}`,
    { data: { action: "restore" } },
  );
  assert(restoreResp.status() === 200, `${label}: owner restore (${restoreResp.status()})`);
}

async function main() {
  const harness = loadHarness();
  const storeProf = harness.roles?.store?.delegationToken;
  const companyProf = harness.roles?.company?.delegationToken;
  const storeOwner = harness.roles?.store?.ownerSessionToken;
  const companyOwner = harness.roles?.company?.ownerSessionToken;
  const masterProf = harness.roles?.master?.delegationToken;
  const storeCertId = harness.roles?.store?.shellCertificateId;
  if (!storeProf || !companyProf || !storeOwner || !storeCertId) {
    throw new Error("harness missing store tokens or shellCertificateId (run seed-business-certificates-shell)");
  }

  const browser = await chromium.launch({ headless: true });

  {
    const { context, page } = await withSession(browser, storeProf, { width: 1440, height: 900 });
    const certId = await exerciseList(page, "store-prof", "Магазин");
    await profTestWriteDenials(page, "store-prof", certId ?? storeCertId);
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, storeOwner, { width: 1440, height: 900 });
    await exerciseList(page, "store-owner", "Магазин");
    await exerciseOwnerDetailAndPdf(page, "store-owner", storeCertId);
    await exerciseArchiveRestore(page, "store-owner", storeCertId);
    await captureMatrix(page, "store-certificates");
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyProf, { width: 1440, height: 900 });
    await exerciseList(page, "company-prof", "Компания");
    await context.close();
  }

  if (companyOwner) {
    const { context, page } = await withSession(browser, companyOwner, { width: 1440, height: 900 });
    await exerciseList(page, "company-owner", "Компания");
    await captureMatrix(page, "company-certificates");
    await context.close();
  }

  if (masterProf) {
    const { context, page } = await withSession(browser, masterProf, { width: 1440, height: 900 });
    await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
    assert(
      (await page.getByTestId("business-certificates-root").count()) === 0,
      "master: must not use business-owner shell",
    );
    await context.close();
  }

  await browser.close();

  const meta = {
    frontendRuntimeSha: gitHead("/agent/repos/remcard-partner-platform"),
    backendRuntimeSha: gitHead("/agent/repos/remcard-navigator"),
    profUrl: PROF_URL,
    navUrl: NAV_URL,
    harnessState: STATE_PATH,
    capturedAt: new Date().toISOString(),
    failures,
    ok: failures.length === 0,
    profTestWritePolicy:
      "GET business-owner + store certificate allowed; POST /api/store/certificate and PATCH business-owner denied under prof-test delegation",
  };
  fs.mkdirSync(ART_DIR, { recursive: true });
  fs.writeFileSync(path.join(ART_DIR, "shell-gate.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join(ART_DIR, "metadata-shell.json"),
    JSON.stringify(
      {
        frontendRuntimeSha: meta.frontendRuntimeSha,
        backendRuntimeSha: meta.backendRuntimeSha,
        captureKind: "store-company-certificates-02-clean",
        profUrl: PROF_URL,
        navUrl: NAV_URL,
        capturedAt: meta.capturedAt,
      },
      null,
      2,
    ),
  );

  if (failures.length) {
    console.error(JSON.stringify({ ok: false, failures }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, art: ART, ...meta }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
