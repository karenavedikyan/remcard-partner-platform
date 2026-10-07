/**
 * PROF-D: logged-in CLIENT on invite → required steps → return to invite (browser).
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASE,
  CLIENT_USER_ID,
  acceptLoginConsents,
  createStoreLinkInvite,
  enterCode,
  fillMasterOnboarding,
} from "./m4d-link-invite-helpers.mjs";

const STORE_CODE = process.env.M4D_STORE_CODE;
const CLIENT_CODE = process.env.M4D_CLIENT_CODE;
if (!STORE_CODE || !CLIENT_CODE) {
  console.error("M4D_STORE_CODE and M4D_CLIENT_CODE required");
  process.exit(1);
}

const ARTIFACTS = process.env.M4D_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4d-link-invite";

const evidence = {
  scenario: "CLIENT invite → continuation → onboarding → invite",
  sawContinuation: false,
  reachedOnboarding: false,
  returnedToInvite: false,
  pass: false,
  notes: [],
};

async function runScenario() {
  await mkdir(path.join(ARTIFACTS, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const viewport = { width: 1440, height: 900 };

  try {
    process.env.M4D_STORE_CODE = STORE_CODE;
    const authorContext = await browser.newContext({ viewport, baseURL: BASE });
    const authorPage = await authorContext.newPage();
    const inviteUrl = await createStoreLinkInvite(authorPage);
    const invitePath = new URL(inviteUrl).pathname;

    const guestContext = await browser.newContext({ viewport, baseURL: BASE });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(`${invitePath}`);
    await guestPage.getByRole("link", { name: /войти или зарегистрироваться/i }).click();
    await enterCode(guestPage, CLIENT_CODE);
    await acceptLoginConsents(guestPage);
    await guestPage.waitForURL(/\/invite\/|\/onboarding|\/login/, { timeout: 60000 });

    const sessionDeadline = Date.now() + 45000;
    while (Date.now() < sessionDeadline) {
      const meResp = await guestPage.request.get(`${BASE}/api/remcard/api/auth/me`);
      const me = await meResp.json();
      if (me?.user?.id === CLIENT_USER_ID) break;
      await guestPage.waitForTimeout(500);
    }

    await guestPage.goto(invitePath, { waitUntil: "domcontentloaded" });
    await guestPage.waitForFunction(
      () => !document.body.textContent?.includes("Загружаем приглашение"),
      undefined,
      { timeout: 45000 },
    );

    const continueBtn = guestPage.getByRole("button", {
      name: /продолжить (регистрацию|вход)/i,
    });
    await continueBtn.waitFor({ timeout: 45000 });
    evidence.sawContinuation = true;
    await continueBtn.click();
    await guestPage.waitForURL(/\/onboarding/, { timeout: 30000 });
    evidence.reachedOnboarding = true;
    expectReturnTo(guestPage.url(), invitePath, evidence);

    await fillMasterOnboarding(guestPage);
    await guestPage.getByRole("button", { name: /^продолжить$/i }).click();
    await guestPage.waitForURL(/\/invite\//, { timeout: 60000 });
    evidence.returnedToInvite = guestPage.url().includes("/invite/");

    const meResp = await guestPage.request.get(`${BASE}/api/remcard/api/auth/me`);
    const me = await meResp.json();
    if (me?.user?.id !== CLIENT_USER_ID) {
      throw new Error("Wrong user after onboarding return");
    }

    evidence.pass =
      evidence.sawContinuation && evidence.reachedOnboarding && evidence.returnedToInvite;

    await authorContext.close();
    await guestContext.close();
  } finally {
    await browser.close();
    const reportPath = path.join(ARTIFACTS, "report_client_flow.json");
    await writeFile(reportPath, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify(evidence, null, 2));
  }

  if (!evidence.pass) process.exit(1);
}

function expectReturnTo(url, invitePath, ev) {
  const parsed = new URL(url);
  const returnTo = parsed.searchParams.get("returnTo");
  if (!returnTo?.includes("/invite/")) {
    ev.notes.push(`returnTo missing on onboarding URL: ${url}`);
  }
}

runScenario().catch((err) => {
  evidence.notes.push(String(err?.message ?? err));
  console.error(err);
  process.exit(1);
});
