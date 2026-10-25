/**
 * Isolated shell gate: store/company owners see unified certificates UI on /recommendations.
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
const ART = path.resolve("artifacts/store-company-certificates-01/visual-shell");
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

async function exerciseCertificates(page, label, eyebrow) {
  const listRespPromise = page.waitForResponse(
    (r) =>
      r.url().includes("business-owner-certificates") &&
      !r.url().includes("/batch") &&
      r.status() === 200,
    { timeout: 90_000 },
  );
  await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const root = page.getByTestId("business-certificates-root");
  await root.waitFor({ timeout: 90_000 });
  const body = await page.locator("body").innerText();
  assert(!/Мои рекомендации/i.test(body), `${label}: legacy list title`);
  assert(!/СПЕЦИАЛИСТ|АГЕНТ/i.test(body), `${label}: internal role labels`);
  assert(body.toLowerCase().includes(eyebrow.toLowerCase()), `${label}: eyebrow ${eyebrow}`);
  assert(body.includes("Сертификаты"), `${label}: page title`);
  const listResp = await listRespPromise;
  const listJson = await listResp.json();
  assert((listJson.totalCount ?? 0) > 0, `${label}: non-empty certificate list`);
  assert(await page.getByTestId("agent-r03-capture-body").count(), `${label}: list body`);
}

async function main() {
  const harness = loadHarness();
  const storeToken = harness.roles?.store?.delegationToken;
  const companyToken = harness.roles?.company?.delegationToken;
  const masterToken = harness.roles?.master?.delegationToken;
  if (!storeToken || !companyToken) {
    throw new Error("harness missing store/company delegationToken");
  }

  const browser = await chromium.launch({ headless: true });

  {
    const { context, page } = await withSession(browser, storeToken, { width: 1440, height: 900 });
    await exerciseCertificates(page, "store", "Магазин");
    await captureMatrix(page, "store-certificates");
    await context.close();
  }

  {
    const { context, page } = await withSession(browser, companyToken, { width: 1440, height: 900 });
    await exerciseCertificates(page, "company", "Компания");
    await captureMatrix(page, "company-certificates");
    await context.close();
  }

  if (masterToken) {
    const { context, page } = await withSession(browser, masterToken, { width: 1440, height: 900 });
    await page.goto(`${PROF_URL}/recommendations`, { waitUntil: "domcontentloaded", timeout: 120_000 });
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
  };
  fs.mkdirSync(path.dirname(ART), { recursive: true });
  fs.writeFileSync(path.join(path.dirname(ART), "shell-gate.json"), JSON.stringify(meta, null, 2));
  fs.writeFileSync(
    path.join(path.dirname(ART), "metadata-shell.json"),
    JSON.stringify(
      {
        frontendRuntimeSha: meta.frontendRuntimeSha,
        backendRuntimeSha: meta.backendRuntimeSha,
        captureKind: "store-company-certificates-shell",
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
