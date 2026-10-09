import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

execSync("node /agent/repos/remcard-partner-platform/scripts/prof-h3-browser-fixtures.mjs", {
  stdio: "inherit",
});

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const USER = "m1fix-prof-browser-store01";

function mintToken(userId) {
  return execSync(
    `cd /agent/repos/remcard-navigator && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8" },
  ).trim();
}

const results = { scenarios: {}, consoleErrors: [], exitCode: 0 };

async function runScenario(key, fn) {
  try {
    await fn();
    results.scenarios[key] = "PASS";
  } catch (e) {
    results.scenarios[key] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    results.exitCode = 1;
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([
  {
    name: "remcard-token",
    value: mintToken(USER),
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  },
]);
const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") results.consoleErrors.push(msg.text());
});

await runScenario("branches_list_and_edit", async () => {
  await page.goto("http://127.0.0.1:3000/profile?section=branches", {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByText("Филиалы").first().waitFor({ timeout: 60_000 });
  await page.screenshot({ path: `${outDir}/prof-h4-branches-1440.png`, fullPage: true });
  const edit = page.getByRole("button", { name: /Редактировать/i }).first();
  await edit.click();
  await page.getByLabel(/Название/i).waitFor({ timeout: 30_000 });
  await page.getByLabel(/Название/i).fill(`H4 Branch ${Date.now().toString().slice(-4)}`);
  await page.getByRole("button", { name: /Сохранить черновик/i }).click();
  await page.waitForTimeout(2500);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Редактировать/i }).first().click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Предпросмотр/i }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${outDir}/prof-h4-branch-preview-1440.png`, fullPage: true });
  if (!(await page.getByTestId("branch-public-preview").isVisible())) {
    throw new Error("branch preview missing");
  }
});

await runScenario("overflow_390", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3000/profile?section=branches", {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  await page.screenshot({ path: `${outDir}/prof-h4-branches-390.png`, fullPage: true });
  if (overflow) throw new Error("horizontal overflow");
});

await browser.close();

console.log(
  JSON.stringify(
    {
      ...results,
      shas: {
        platform: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", {
          encoding: "utf8",
        }).trim(),
        navigator: execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", {
          encoding: "utf8",
        }).trim(),
      },
      command: "node scripts/prof-h4-browser-smoke.mjs",
    },
    null,
    2,
  ),
);
process.exit(results.exitCode);
