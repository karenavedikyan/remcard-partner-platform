import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const USER = "m1fix-prof-browser01";

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

await runScenario("catalog_layout_1440", async () => {
  await page.goto("http://127.0.0.1:3000/profile?section=catalog", {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  if (!body.includes("Помогите новым клиентам найти вас")) {
    throw new Error("missing H3 catalog headline");
  }
  await page.getByRole("button", { name: /Подготовить профиль к публикации/i }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/prof-h3-catalog-1440.png`, fullPage: true });
  if (!(await page.getByTestId("catalog-public-preview").isVisible())) {
    throw new Error("preview missing");
  }
});

await runScenario("catalog_save_reload", async () => {
  const desc = page.getByLabel(/Описание для каталога/i);
  await desc.fill(`H3 smoke ${Date.now().toString().slice(-5)}`);
  await page.getByRole("button", { name: /Сохранить черновик/i }).click();
  await page.waitForTimeout(3000);
  const value = await desc.inputValue();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /Подготовить профиль к публикации/i }).click();
  await page.waitForTimeout(500);
  if ((await page.getByLabel(/Описание для каталога/i).inputValue()) !== value) {
    throw new Error("description not persisted");
  }
});

await runScenario("overflow_390", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  await page.screenshot({ path: `${outDir}/prof-h3-catalog-390.png`, fullPage: true });
  if (overflow) throw new Error("horizontal overflow");
  results.scenarios.overflow_390 = "PASS";
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
      command: "node scripts/prof-h3-browser-smoke.mjs",
    },
    null,
    2,
  ),
);
process.exit(results.exitCode);
