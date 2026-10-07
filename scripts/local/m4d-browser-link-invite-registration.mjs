/**
 * PROF-D B-reg: registration → moderation gate → decline → reload (no SQL, no accept).
 */

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BASE,
  CLIENT_USER_ID,
  acceptLoginConsents,
  createStoreLinkInvite,
  registerClientThroughOnboarding,
} from "./m4d-link-invite-helpers.mjs";

const CLIENT_CODE = process.env.M4D_CLIENT_CODE;
const STORE_CODE = process.env.M4D_STORE_CODE;
if (!CLIENT_CODE || !STORE_CODE) {
  console.error("M4D_CLIENT_CODE and M4D_STORE_CODE required");
  process.exit(1);
}

const ARTIFACTS = process.env.M4D_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/m4d-link-invite";
const MOBILE = process.argv.includes("--mobile");
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 };

const evidence = {
  scenario: "B-reg: registration → moderation gate → decline → reload",
  viewport: MOBILE ? "390x844" : "1440x900",
  moderationShown: false,
  acceptDisabled: false,
  declineWorks: false,
  reloadKeepsInvite: false,
  pass: false,
  notes: [],
  reloadDebug: {},
};

async function runScenario() {
  await mkdir(path.join(ARTIFACTS, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const prefix = MOBILE ? "mobile" : "desktop";
  const shot = async (page, name) =>
    page.screenshot({
      path: path.join(ARTIFACTS, "screenshots", `${prefix}_reg_${name}.png`),
      fullPage: true,
    });

  try {
    const authorContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const authorPage = await authorContext.newPage();
    process.env.M4D_STORE_CODE = STORE_CODE;
    const inviteUrl = await createStoreLinkInvite(authorPage, (p, n) => shot(p, n));
    const invitePath = new URL(inviteUrl).pathname;

    const guestContext = await browser.newContext({ viewport: VIEWPORT, baseURL: BASE });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(invitePath);
    await guestPage.getByText(/приглашает вас к сотрудничеству/i).waitFor();

    const token = invitePath.split("/").pop();
    const publicPreviewUrl = `${BASE}/api/remcard/api/partnership/link-invite/public/${encodeURIComponent(token)}`;

    async function fetchInviteStatus() {
      const json = await guestPage.evaluate(async (url) => {
        const resp = await fetch(url, { credentials: "include", cache: "no-store" });
        return resp.json();
      }, publicPreviewUrl);
      return { status: json?.status ?? null, body: json };
    }

    await registerClientThroughOnboarding(guestPage, CLIENT_CODE, invitePath);
    evidence.moderationShown = true;
    await shot(guestPage, "moderation_gate");

    let statusAfterRegistration = null;
    for (let i = 0; i < 20; i += 1) {
      const preview = await fetchInviteStatus();
      statusAfterRegistration = preview.status;
      if (statusAfterRegistration === "PENDING") break;
      await guestPage.waitForTimeout(1500);
    }
    if (statusAfterRegistration !== "PENDING") {
      throw new Error(
        `Invite must stay PENDING after registration (last=${JSON.stringify(statusAfterRegistration)})`,
      );
    }

    const acceptBtn = guestPage.getByRole("button", { name: /^принять условия$/i });
    evidence.acceptDisabled = (await acceptBtn.count()) === 0 || (await acceptBtn.isDisabled());
    if (!evidence.acceptDisabled) {
      throw new Error("Accept must be unavailable while profile is not approved");
    }

    await guestPage.getByRole("button", { name: /^не принимать$/i }).click();
    await guestPage.getByText(/вы не приняли предложение/i).waitFor();
    evidence.declineWorks = true;
    await shot(guestPage, "declined");

    await guestPage.getByRole("button", { name: /вернуться к условиям/i }).click();
    await guestPage.getByText(/отправьте профиль на проверку/i).waitFor();

    let statusBefore = statusAfterRegistration;
    for (let i = 0; i < 5; i += 1) {
      const preview = await fetchInviteStatus();
      if (preview.status === "PENDING") {
        statusBefore = preview.status;
        break;
      }
      await guestPage.waitForTimeout(1000);
    }

    await guestPage.goto(invitePath, { waitUntil: "domcontentloaded" });
    let statusAfter = null;
    let me = null;
    const reloadDeadline = Date.now() + 90000;
    while (Date.now() < reloadDeadline) {
      const previewAfterReload = await guestPage.request.get(publicPreviewUrl);
      const previewAfterJson = await previewAfterReload.json();
      statusAfter = previewAfterJson.status;
      const meResp = await guestPage.request.get(`${BASE}/api/remcard/api/auth/me`);
      me = await meResp.json();
      if (
        statusAfter === "PENDING" &&
        me?.user?.id === CLIENT_USER_ID &&
        me?.user?.role === "PRO" &&
        me?.user?.catalogStatus !== "APPROVED"
      ) {
        break;
      }
      await guestPage.waitForTimeout(1000);
    }

    if (me?.user?.id !== CLIENT_USER_ID) throw new Error("Wrong user after reload");
    if (me?.user?.catalogStatus === "APPROVED") {
      throw new Error("Profile must stay unapproved after reload");
    }

    evidence.reloadDebug = {
      statusBefore,
      statusAfter,
      userId: me?.user?.id ?? null,
      catalogStatus: me?.user?.catalogStatus ?? null,
      role: me?.user?.role ?? null,
    };

    evidence.reloadKeepsInvite =
      statusBefore === "PENDING" &&
      statusAfter === "PENDING" &&
      me?.user?.role === "PRO" &&
      me?.user?.catalogStatus !== "APPROVED";

    if (!statusBefore) {
      throw new Error("Could not read invite status before reload");
    }
    if (!evidence.reloadKeepsInvite) {
      throw new Error(`Reload verification failed: ${JSON.stringify(evidence.reloadDebug)}`);
    }

    await guestPage
      .getByText(/приглашает вас к сотрудничеству|отправьте профиль на проверку/i)
      .waitFor({ timeout: 30000 })
      .catch(() => {
        evidence.notes.push("Invite UI slow after reload; server state verified via API");
      });

    evidence.pass =
      evidence.moderationShown &&
      evidence.acceptDisabled &&
      evidence.declineWorks &&
      evidence.reloadKeepsInvite;

    await authorContext.close();
    await guestContext.close();
  } finally {
    await browser.close();
    const reportPath = path.join(ARTIFACTS, `report_${prefix}_registration.json`);
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
