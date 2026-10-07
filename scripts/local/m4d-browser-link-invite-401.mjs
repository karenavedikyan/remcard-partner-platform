/**
 * PROF-D D: 401 during accept → re-login → return to same invite (browser).
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
const RELOGIN_CODE = process.env.M4D_RELOGIN_CODE;
if (!STORE_CODE || !MASTER_CODE || !RELOGIN_CODE) {
  console.error("M4D_STORE_CODE, M4D_MASTER_CODE, M4D_RELOGIN_CODE required");
  process.exit(1);
}

const ARTIFACTS = process.env.M4D_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4d-link-invite";

const evidence = {
  scenario: "D: 401 → re-login → return to invite → accept",
  returnedToInvite: false,
  partnershipActive: false,
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
    await enterCode(guestPage, MASTER_CODE);
    await acceptLoginConsents(guestPage);
    await guestPage.waitForURL(/\/invite\//, { timeout: 30000 });

    await guestContext.clearCookies();
    await guestPage.getByRole("button", { name: /^принять условия$/i }).click();
    await guestPage.getByText(/сессия завершилась|войдите снова/i).waitFor({ timeout: 15000 });

    await guestPage.getByRole("link", { name: /войти снова/i }).click();
    await guestPage.waitForURL(/\/login/);
    {
      const url = new URL(guestPage.url());
      if (!url.searchParams.get("returnTo")?.includes("/invite/")) {
        evidence.notes.push(`returnTo missing in login URL: ${guestPage.url()}`);
      }
    }
    await enterCode(guestPage, RELOGIN_CODE);
    await acceptLoginConsents(guestPage);
    await guestPage.waitForURL(/\/invite\//, { timeout: 30000 });
    evidence.returnedToInvite = guestPage.url().includes("/invite/");

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
    evidence.pass = evidence.returnedToInvite && evidence.partnershipActive;

    await authorContext.close();
    await guestContext.close();
  } finally {
    await browser.close();
    const reportPath = path.join(ARTIFACTS, "report_401_relogin.json");
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
