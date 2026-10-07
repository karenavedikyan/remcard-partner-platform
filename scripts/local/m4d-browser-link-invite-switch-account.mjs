/**
 * PROF-D: switch account on invite → logout → different session → same invite.
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASE,
  CLIENT_USER_ID,
  PRO_MASTER_ID,
  acceptLoginConsents,
  createStoreLinkInvite,
  enterCode,
} from "./m4d-link-invite-helpers.mjs";

const STORE_CODE = process.env.M4D_STORE_CODE;
const MASTER_CODE = process.env.M4D_MASTER_CODE;
const CLIENT_CODE = process.env.M4D_CLIENT_CODE;
if (!STORE_CODE || !MASTER_CODE || !CLIENT_CODE) {
  console.error("M4D_STORE_CODE, M4D_MASTER_CODE, M4D_CLIENT_CODE required");
  process.exit(1);
}

const ARTIFACTS = process.env.M4D_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4d-link-invite";

const evidence = {
  scenario: "Switch account → relogin as CLIENT → same invite",
  switchedAccount: false,
  differentUser: false,
  sameInvite: false,
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
    const token = invitePath.split("/").pop();

    const guestContext = await browser.newContext({ viewport, baseURL: BASE });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(invitePath);
    await guestPage.getByRole("link", { name: /войти или зарегистрироваться/i }).click();
    await enterCode(guestPage, MASTER_CODE);
    await acceptLoginConsents(guestPage);
    await guestPage.waitForURL(/\/invite\//, { timeout: 30000 });

    await guestPage.getByRole("button", { name: /^сменить аккаунт$/i }).click();
    await guestPage.waitForURL(/\/login/, { timeout: 30000 });
    evidence.switchedAccount = guestPage.url().includes("/login");
    const loginUrl = new URL(guestPage.url());
    if (!loginUrl.searchParams.get("returnTo")?.includes("/invite/")) {
      evidence.notes.push(`returnTo missing after switch: ${guestPage.url()}`);
    }

    await enterCode(guestPage, CLIENT_CODE);
    await acceptLoginConsents(guestPage);
    await guestPage.waitForURL(/\/invite\//, { timeout: 45000 });

    const meResp = await guestPage.request.get(`${BASE}/api/remcard/api/auth/me`);
    const me = await meResp.json();
    evidence.differentUser = me?.user?.id === CLIENT_USER_ID && me?.user?.id !== PRO_MASTER_ID;
    evidence.sameInvite = guestPage.url().includes(token ?? "");

    evidence.pass = evidence.switchedAccount && evidence.differentUser && evidence.sameInvite;

    await authorContext.close();
    await guestContext.close();
  } finally {
    await browser.close();
    const reportPath = path.join(ARTIFACTS, "report_switch_account.json");
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
