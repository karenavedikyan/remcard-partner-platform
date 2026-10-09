import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const token = execSync(
  `cd /agent/repos/remcard-navigator && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('m1fix-prof-browser01',0));"`,
  { encoding: "utf8" },
).trim();

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([
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

const page = await context.newPage();
await page.goto("http://127.0.0.1:3000/profile?section=basics", {
  waitUntil: "networkidle",
  timeout: 120_000,
});
await page.waitForTimeout(2500);

const bodyText = await page.locator("body").innerText();
const loggedIn = !/сессия|войти|login/i.test(bodyText.slice(0, 500));

await page.screenshot({ path: `${outDir}/prof-h2-browser-1440-basics.png`, fullPage: true });

const nameInput = page.locator('input[name="displayName"], input[id*="displayName"]').first();
if (await nameInput.count()) {
  await nameInput.fill(`BrowserH2 ${Date.now().toString().slice(-6)}`);
}
const cityInput = page.locator('input[name="city"], input[id*="city"]').first();
if (await cityInput.count()) {
  await cityInput.fill("Краснодар");
}

const saveBtn = page.getByRole("button", { name: /сохранить/i }).first();
if (await saveBtn.isVisible().catch(() => false)) {
  await saveBtn.click();
  await page.waitForTimeout(4000);
}
await page.screenshot({ path: `${outDir}/prof-h2-browser-save.png`, fullPage: true });

await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/prof-h2-browser-reload.png`, fullPage: true });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);
await page.screenshot({ path: `${outDir}/prof-h2-browser-390.png`, fullPage: true });

console.log(
  JSON.stringify({ loggedIn, overflow, url: page.url(), title: await page.title() }),
);
await browser.close();
