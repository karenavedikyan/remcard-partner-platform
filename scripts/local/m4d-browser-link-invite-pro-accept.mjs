/**
 * PROF-D C: existing APPROVED PRO accepts without onboarding.
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASE,
  PRO_MASTER_ID,
  STORE_USER_ID,
  acceptLoginConsents,
  createStoreLinkInvite,
  enterCode,
} from "./m4d-link-invite-helpers.mjs";

const STORE_CODE = process.env.M4D_STORE_CODE;
const MASTER_CODE = process.env.M4D_MASTER_CODE;
if (!STORE_CODE || !MASTER_CODE) {
  console.error("M4D_STORE_CODE and M4D_MASTER_CODE required");
  process.exit(1);
}

const ARTIFACTS = process.env.M4D_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4d-link-invite";
const VIEWPORT = { width: 1440, height: 900 };

const evidence = {
  scenario: "C: existing PRO → accept without onboarding",
  partnershipActive: false,
  skippedOnboarding: false,
  pass: false,
  notes: [],
};

async function runScenario() {
  await mkdir(path.join(ARTIFACTS, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    process.env.M4D_STORE_CODE = STORE_CODE;
    const authorContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const authorPage = await authorContext.newPage();
    const inviteUrl = await createStoreLinkInvite(authorPage);
    const invitePath = new URL(inviteUrl).pathname;

    const guestContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(invitePath);
    await guestPage.getByRole("link", { name: /войти или зарегистрироваться/i }).click();
    await guestPage.waitForURL(/\/login/);
    await enterCode(guestPage, MASTER_CODE);
    await acceptLoginConsents(guestPage);
    await guestPage.waitForURL(/\/invite\//, { timeout: 30000 });
    evidence.skippedOnboarding = !guestPage.url().includes("/onboarding");

    await guestPage.getByRole("button", { name: /^принять условия$/i }).click();
    await guestPage.waitForURL(/\/partners/, { timeout: 30000 });

    const listResp = await guestPage.request.get(`${BASE}/api/remcard/api/partnership/list`);
    const listJson = await listResp.json();
    evidence.partnershipActive = (listJson.partnerships ?? []).some(
      (p) =>
        p.status === "ACTIVE" &&
        p.storeUser?.id === STORE_USER_ID &&
        p.proUser?.id === PRO_MASTER_ID,
    );
    evidence.pass = evidence.skippedOnboarding && evidence.partnershipActive;

    await authorContext.close();
    await guestContext.close();
  } finally {
    await browser.close();
    const reportPath = path.join(ARTIFACTS, "report_pro_accept.json");
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
