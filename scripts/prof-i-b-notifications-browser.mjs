/**
 * PROF-I-B browser smoke: /notifications center (1440 + 390).
 * Requires navigator :3001 + platform :3102 with shared JWT_SECRET and REMCARD_API_BASE_URL.
 */
import { chromium, devices } from "playwright";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../docs/screenshots/prof-i-b");

const PLATFORM = process.env.PROF_I_B_PLATFORM_URL ?? "http://127.0.0.1:3102";
const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret-for-prof-i-b-tests-only-32chars";
const FIXTURE_USER = process.env.PROF_I_B_FIXTURE_USER ?? "m1fix-prof-browser01";

function mintToken(userId) {
  const navRoot = path.join(__dirname, "../../prof-i-b-navigator");
  return execSync(
    `JWT_SECRET='${JWT_SECRET}' npx tsx -e "import { createToken } from './src/lib/auth.ts'; console.log(createToken('${userId}', 0));"`,
    { cwd: navRoot, encoding: "utf8" },
  ).trim();
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
}

async function runViewport(browser, label, contextOptions) {
  const context = await browser.newContext(contextOptions);
  const token = mintToken(FIXTURE_USER);
  await context.addCookies([
    {
      name: "remcard-token",
      value: token,
      url: PLATFORM,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  await page.goto(`${PLATFORM}/notifications`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.getByRole("heading", { name: "Уведомления" }).waitFor({ timeout: 30_000 });
  await shot(page, `notifications-${label}.png`);
  const markAll = page.getByRole("button", { name: /прочитан/i });
  if (await markAll.count()) {
    await markAll.first().click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, `notifications-${label}-after-mark.png`);
  }
  await context.close();
}

async function main() {
  const browser = await chromium.launch();
  try {
    await runViewport(browser, "1440", { viewport: { width: 1440, height: 900 } });
    await runViewport(browser, "390", { ...devices["Pixel 5"] });
    console.log("[prof-i-b-browser] PASS screenshots in", outDir);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error("[prof-i-b-browser] FAIL", e);
  process.exit(1);
});
