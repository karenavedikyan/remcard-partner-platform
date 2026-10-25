/**
 * Isolated shell gate: prof-test read paths + explicit write denials; UI detail/QR.
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
  assert(
    postRes.status() === 403 || postRes.status() === 400,
    `${label}: prof-test POST /api/store/certificate denied (${postRes.status()})`,
  );

  const patchRes = await page.request.patch(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates/${encodeURIComponent(certId)}`,
    { data: { action: "archive" } },
  );
  assert(patchRes.status() === 403, `${label}: prof-test PATCH archive denied (${patchRes.status()})`);
}

async function exerciseList(page, label, eyebrow) {
  await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByTestId("business-certificates-root").waitFor({ timeout: 90_000 });
  const body = await page.locator("body").innerText();
  assert(!/Мои рекомендации/i.test(body), `${label}: legacy list title`);
  assert(!/СПЕЦИАЛИСТ|АГЕНТ/i.test(body), `${label}: internal role labels`);
  assert(body.toLowerCase().includes(eyebrow.toLowerCase()), `${label}: eyebrow ${eyebrow}`);
  const listResp = await page.request.get(
    `${PROF_URL}/api/remcard/api/pro/business-owner-certificates?limit=5`,
  );
  assert(listResp.status() === 200, `${label}: list API ${listResp.status()}`);
  const listJson = await listResp.json();
  assert((listJson.totalCount ?? 0) > 0, `${label}: non-empty list`);
  return listJson.certificates?.[0]?.id ?? null;
}

async function exerciseDetailUi(page, label, certId) {
  const detailApi = await page.request.get(
    `${PROF_URL}/api/remcard/api/store/certificate/${encodeURIComponent(certId)}`,
  );
  assert(detailApi.status() === 200, `${label}: store certificate detail API ${detailApi.status()}`);
  const detailJson = await detailApi.json();
  assert(Boolean(detailJson.qrCode?.trim()), `${label}: detail includes qrCode for client link/QR`);

  await page.goto(
    `${PROF_URL}/recommendations?certificate=${encodeURIComponent(certId)}`,
    { waitUntil: "networkidle", timeout: 120_000 },
  );
  await page.getByTestId("specialist-certificate-detail-dialog").waitFor({ timeout: 90_000 });
  await page.getByTestId("specialist-certificate-preview").waitFor({ timeout: 30_000 });
  await page.getByTestId("certificate-code").waitFor({ timeout: 30_000 });
  await page.getByTestId("specialist-certificate-preview-qr").waitFor({ timeout: 60_000 });
  const pdfCode = (detailJson.promoCode ?? detailJson.qrCode ?? "").trim();
  assert(pdfCode, `${label}: detail includes promo/qr for PDF probe`);
  const pdfProbe = await page.request.get(
    `${PROF_URL}/api/remcard/api/certificate/${encodeURIComponent(pdfCode)}/pdf`,
  );
  assert(
    pdfProbe.status() === 403 || pdfProbe.status() === 404,
    `${label}: prof-test PDF route not served (${pdfProbe.status()})`,
  );
}

async function main() {
  const harness = loadHarness();
  const storeProf = harness.roles?.store?.delegationToken;
  const companyProf = harness.roles?.company?.delegationToken;
  const masterProf = harness.roles?.master?.delegationToken;
  const storeCertId = harness.roles?.store?.shellCertificateId;
  if (!storeProf || !companyProf || !storeCertId) {
    throw new Error("harness missing store prof token or shellCertificateId");
  }

  const browser = await chromium.launch({ headless: true });

  {
    const { context, page } = await withSession(browser, storeProf, { width: 1440, height: 900 });
    const certId = (await exerciseList(page, "store", "Магазин")) ?? storeCertId;
    await profTestWriteDenials(page, "store", certId);
    await exerciseDetailUi(page, "store", certId);
    await captureMatrix(page, "store-certificates");
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyProf, { width: 1440, height: 900 });
    await exerciseList(page, "company", "Компания");
    await captureMatrix(page, "company-certificates");
    await context.close();
  }

  if (masterProf) {
    const { context, page } = await withSession(browser, masterProf, { width: 1440, height: 900 });
    await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "networkidle", timeout: 120_000 });
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
    profTestWritePolicy: {
      allowedRead: [
        "GET /api/pro/business-owner-certificates",
        "GET /api/pro/business-owner-certificates/:id",
        "GET /api/store/certificate/:id",
      ],
      deniedWithoutAllowlistDelta: [
        "POST /api/store/certificate",
        "PATCH /api/pro/business-owner-certificates/:id",
        "GET /api/certificate/:id/pdf",
      ],
    },
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
