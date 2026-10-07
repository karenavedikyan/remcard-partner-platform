/**
 * PROF-D browser acceptance (scenario B):
 * store creates link → guest landing → CLIENT onboarding → explicit accept → ACTIVE.
 *
 * Prerequisites: run-m4d-browser-link-invite.sh (test DB codes, dev servers).
 * Real Telegram/MAX bot E2E NOT VERIFIED.
 */

import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.M4D_PARTNER_URL ?? "http://127.0.0.1:3000";
const STORE_CODE = process.env.M4D_STORE_CODE;
const CLIENT_CODE = process.env.M4D_CLIENT_CODE;
if (!STORE_CODE || !CLIENT_CODE || !/^\d{6}$/.test(STORE_CODE) || !/^\d{6}$/.test(CLIENT_CODE)) {
  console.error("M4D_STORE_CODE and M4D_CLIENT_CODE (6 digits) required");
  process.exit(1);
}

const ARTIFACTS = process.env.M4D_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4d-link-invite";
const MOBILE = process.argv.includes("--mobile");
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const CLIENT_USER_ID = "m1fix-client-000000000001";

function approveClientForPartnershipAccept() {
  const db = process.env.DATABASE_URL ?? "";
  if (!db.includes("remcard_prof_test")) return;
  execSync(
    `psql "${db}" -v ON_ERROR_STOP=1 -c "UPDATE \\"User\\" SET \\"catalogStatus\\"='APPROVED', \\"partnerType\\"='MASTER', specializations=ARRAY['doors']::text[], \\"isPublic\\"=true WHERE id='${CLIENT_USER_ID}';"`,
    { stdio: "pipe" },
  );
}

const evidence = {
  scenario: "B: link invite → CLIENT → accept → ACTIVE",
  viewport: MOBILE ? "390x844" : "1440x900",
  inviteUrl: null,
  partnershipActive: false,
  authorSeesPartner: false,
  pass: false,
  notes: ["Real Telegram/MAX bot E2E NOT VERIFIED — codes minted in test DB only."],
};

async function enterCode(page, code) {
  const input = page.getByRole("textbox", { name: /код из сообщения/i });
  await input.waitFor({ timeout: 15000 });
  await input.fill(code);
  await page.getByRole("button", { name: /^продолжить$/i }).click();
}

async function acceptLoginConsents(page) {
  const consentsTitle = page.getByRole("heading", { name: /обязательные соглашения/i });
  const visible = await consentsTitle
    .waitFor({ state: "visible", timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return;
  const boxes = page.locator('input[type="checkbox"]');
  const count = await boxes.count();
  for (let i = 0; i < count; i += 1) {
    await boxes.nth(i).check();
  }
  await page.getByRole("button", { name: /^продолжить$/i }).click();
}

async function fillMasterOnboarding(page) {
  await page.getByText(/регистрация партнёра/i).waitFor({ timeout: 15000 });
  await page
    .waitForFunction(
      () => !document.body.textContent?.includes("Проверяем…"),
      undefined,
      { timeout: 15000 },
    )
    .catch(() => {});

  await page.locator('input[type="radio"][value="MASTER"]').check();
  await page.getByLabel(/город работы/i).fill("Краснодар");

  const firstStage = page.locator('input[type="checkbox"]').nth(1);
  await firstStage.check();

  const offer = page.locator("label").filter({ hasText: /публичную оферту/i }).locator('input[type="checkbox"]');
  if (await offer.count()) {
    await offer.first().check();
  }
}

async function runScenario() {
  await mkdir(ARTIFACTS, { recursive: true });
  await mkdir(path.join(ARTIFACTS, "screenshots"), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const shot = async (page, name) => {
    const file = path.join(ARTIFACTS, "screenshots", `${MOBILE ? "mobile" : "desktop"}_${name}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  };

  let inviteUrl = null;

  try {
    // Author: create link
    const authorContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const authorPage = await authorContext.newPage();
    await authorPage.goto("/login");
    await enterCode(authorPage, STORE_CODE);
    await acceptLoginConsents(authorPage);
    await authorPage.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });

    await authorPage.goto("/partners");
    await authorPage.getByRole("tab", { name: /пригласить по ссылке/i }).click();
    await authorPage.getByText(/пригласить по ссылке/i).first().waitFor();

    const percentInputs = authorPage.getByLabel(/общий процент/i);
    if (await percentInputs.count()) {
      await percentInputs.first().fill("12");
    }
    const excludeLabels = authorPage.locator("label").filter({ hasText: /^исключить$/i });
    const excludeCount = await excludeLabels.count();
    for (let i = 1; i < excludeCount; i += 1) {
      await excludeLabels.nth(i).locator('input[type="checkbox"]').check();
    }

    await authorPage.getByRole("button", { name: /^создать ссылку$/i }).click();
    await authorPage.getByText(/ссылка создана/i).waitFor({ timeout: 15000 });
    await shot(authorPage, "01_link_created");

    const linkField = authorPage.getByLabel(/^ссылка$/i);
    inviteUrl = await linkField.inputValue();
    evidence.inviteUrl = inviteUrl;

    // Guest: landing → auth → accept
    const guestContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(inviteUrl.replace(BASE, ""));
    await guestPage.getByText(/приглашает вас к сотрудничеству/i).waitFor({ timeout: 15000 });
    await guestPage.getByText(/12%/).waitFor();
    await shot(guestPage, "02_landing");

    await guestPage.getByRole("link", { name: /войти или зарегистрироваться/i }).click();
    await guestPage.waitForURL(/\/login/, { timeout: 15000 });
    await enterCode(guestPage, CLIENT_CODE);
    await acceptLoginConsents(guestPage);

    await guestPage.waitForFunction(
      () =>
        window.location.pathname.includes("/onboarding") ||
        window.location.pathname.includes("/invite/"),
      undefined,
      { timeout: 30000 },
    );
    if (guestPage.url().includes("/onboarding")) {
      await fillMasterOnboarding(guestPage);
      await guestPage
        .waitForFunction(
          () => {
            const btn = [...document.querySelectorAll("button")].find((b) =>
              /^продолжить$/i.test(b.textContent?.trim() ?? ""),
            );
            return btn && !btn.disabled;
          },
          undefined,
          { timeout: 20000 },
        )
        .catch(() => {});
      await guestPage.getByRole("button", { name: /^продолжить$/i }).click();
    }

    await guestPage.waitForURL((url) => !url.pathname.includes("/onboarding"), { timeout: 45000 });
    approveClientForPartnershipAccept();
    if (!guestPage.url().includes("/invite/")) {
      evidence.notes.push(`Post-onboarding URL: ${guestPage.url()} — opening invite explicitly`);
      await guestPage.goto(new URL(inviteUrl).pathname + new URL(inviteUrl).search);
    }
    await guestPage.getByRole("button", { name: /^принять условия$/i }).waitFor({ timeout: 20000 });
    await guestPage.getByRole("button", { name: /^принять условия$/i }).click();
    await guestPage.waitForURL(/\/partners/, { timeout: 45000 }).catch(async () => {
      const errText = await guestPage.locator('[role="alert"]').allTextContents();
      evidence.notes.push(`Accept redirect failed: ${errText.join(" ")}`);
    });
    if (!guestPage.url().includes("/partners")) {
      throw new Error(`Expected /partners after accept, got ${guestPage.url()}`);
    }
    await shot(guestPage, "03_accepted_partnership");

    const listResp = await guestPage.request.get(`${BASE}/api/remcard/api/partnership/list`);
    const listJson = await listResp.json();
    const active = (listJson.partnerships ?? []).some(
      (p) =>
        p.status === "ACTIVE" &&
        (p.storeUser?.id === "m1fix-store-000000000001" ||
          p.proUser?.id === "m1fix-store-000000000001"),
    );
    evidence.partnershipActive = active;

    await authorPage.reload();
    await authorPage.goto("/partners");
    await authorPage.getByRole("tab", { name: /^мои партнёры$/i }).click();
    await authorPage.getByRole("heading", { name: /M1 Клиент/i }).waitFor({ timeout: 15000 });
    await shot(authorPage, "04_author_sees_partner");
    evidence.authorSeesPartner = true;

    evidence.pass = active && evidence.authorSeesPartner;
    await authorContext.close();
    await guestContext.close();
  } finally {
    await browser.close();
    const reportPath = path.join(ARTIFACTS, `report_${MOBILE ? "mobile" : "desktop"}.json`);
    await writeFile(reportPath, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
  }

  if (!evidence.pass) process.exit(1);
}

runScenario().catch((err) => {
  evidence.notes.push(String(err?.message ?? err));
  console.error(err);
  process.exit(1);
});
