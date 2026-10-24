/**
 * Browser E2E: PROF admin moderation queue + org card (loopback, synthetic PG).
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const PROF_URL = process.env.PROF_E2E_URL ?? "http://127.0.0.1:3400";
const STATE_PATH =
  process.env.CATALOG_QA_UI_STATE ??
  path.join("/agent/repos/remcard-navigator/.catalog-qa-isolated/ui-harness-state.json");
const OUT_DIR =
  process.env.PROF_MOD_E2E_ARTIFACTS ??
  path.join("/agent/repos/remcard-navigator/artifacts/prof-admin-catalog-moderation-01/screenshots");

async function main() {
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  const token = state.platformAdminToken;
  if (!token) throw new Error("platformAdminToken missing in harness state");

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await ctx.addCookies([
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

  const page = await ctx.newPage();
  await page.goto(`${PROF_URL}/admin/moderation`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT_DIR, "queue-1440.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${PROF_URL}/admin/moderation`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(OUT_DIR, "queue-390.png"), fullPage: true });

  const modFixPath = path.join(path.dirname(STATE_PATH), "moderation-fixtures.json");
  let orgUrl = null;
  if (fs.existsSync(modFixPath)) {
    const mod = JSON.parse(fs.readFileSync(modFixPath, "utf8"));
    if (mod.orgId) orgUrl = `${PROF_URL}/admin/moderation/organizations/${mod.orgId}`;
  }
  if (orgUrl) {
    await page.goto(orgUrl, { waitUntil: "networkidle" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: path.join(OUT_DIR, "org-detail-1440.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(OUT_DIR, "org-detail-390.png"), fullPage: true });
  }

  await browser.close();
  console.log(`[moderation-e2e] screenshots -> ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
