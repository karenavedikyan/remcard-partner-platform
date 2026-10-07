/**
 * PROF-D B-accept: after registration + standard moderation approve → accept → ACTIVE.
 * Moderation via POST /api/admin/moderation/partners/[userId]/approve (staff session).
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASE,
  CLIENT_USER_ID,
  STORE_USER_ID,
  approvePartnerViaModerationApi,
  createStoreLinkInvite,
  registerClientThroughOnboarding,
  submitProfileForModerationViaInvite,
} from "./m4d-link-invite-helpers.mjs";

const CLIENT_CODE = process.env.M4D_CLIENT_CODE;
const STORE_CODE = process.env.M4D_STORE_CODE;
const STAFF_CODE = process.env.M4D_STAFF_CODE;
if (!CLIENT_CODE || !STORE_CODE || !STAFF_CODE) {
  console.error("M4D_CLIENT_CODE, M4D_STORE_CODE, M4D_STAFF_CODE required");
  process.exit(1);
}

const ARTIFACTS = process.env.M4D_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4d-link-invite";
const MOBILE = process.argv.includes("--mobile");
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const evidence = {
  scenario: "B-accept: moderation approve → accept → ACTIVE",
  viewport: MOBILE ? "390x844" : "1440x900",
  moderationApproved: false,
  partnershipActive: false,
  authorSeesPartner: false,
  pass: false,
  notes: ["Moderation via navigator admin API, not manual SQL."],
};

async function runScenario() {
  await mkdir(path.join(ARTIFACTS, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const prefix = MOBILE ? "mobile" : "desktop";
  const shot = async (page, name) =>
    page.screenshot({
      path: path.join(ARTIFACTS, "screenshots", `${prefix}_accept_${name}.png`),
      fullPage: true,
    });

  try {
    process.env.M4D_STORE_CODE = STORE_CODE;
    const authorContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const authorPage = await authorContext.newPage();
    const inviteUrl = await createStoreLinkInvite(authorPage);
    const invitePath = new URL(inviteUrl).pathname;

    const guestContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const guestPage = await guestContext.newPage();
    await registerClientThroughOnboarding(guestPage, CLIENT_CODE, invitePath);
    await submitProfileForModerationViaInvite(guestPage);
    await shot(guestPage, "submitted_for_moderation");

    const staffContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const staffPage = await staffContext.newPage();
    await approvePartnerViaModerationApi(staffPage, STAFF_CODE, CLIENT_USER_ID);
    evidence.moderationApproved = true;
    await staffContext.close();

    await guestPage.reload();
    await guestPage.getByRole("button", { name: /^принять условия$/i }).waitFor({ timeout: 15000 });
    await guestPage.getByRole("button", { name: /^принять условия$/i }).click();
    await guestPage.waitForURL(/\/partners/, { timeout: 45000 });
    await shot(guestPage, "accepted");

    const listResp = await guestPage.request.get(`${BASE}/api/remcard/api/partnership/list`);
    const listJson = await listResp.json();
    evidence.partnershipActive = (listJson.partnerships ?? []).some(
      (p) =>
        p.status === "ACTIVE" &&
        p.storeUser?.id === STORE_USER_ID &&
        p.proUser?.id === CLIENT_USER_ID,
    );

    await authorPage.goto("/partners");
    await authorPage.getByRole("tab", { name: /^мои партнёры$/i }).click();
    await authorPage.getByRole("heading", { name: /M1 Клиент/i }).waitFor({ timeout: 15000 });
    await shot(authorPage, "author_sees_partner");
    evidence.authorSeesPartner = true;

    evidence.pass = evidence.moderationApproved && evidence.partnershipActive && evidence.authorSeesPartner;
    await authorContext.close();
    await guestContext.close();
  } finally {
    await browser.close();
    const reportPath = path.join(ARTIFACTS, `report_${prefix}_moderation_accept.json`);
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
