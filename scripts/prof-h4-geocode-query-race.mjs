/**
 * Browser: change address while geocode A is in flight; search B; stale A must not block UI.
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

execSync("node /agent/repos/remcard-partner-platform/scripts/prof-h3-browser-fixtures.mjs", {
  stdio: "inherit",
});

mkdirSync("/opt/cursor/artifacts/screenshots", { recursive: true });

const STORE_OWNER = "m1fix-prof-browser-store01";
const PROF = "http://127.0.0.1:3000";

function mintToken(userId) {
  return execSync(
    `cd /agent/repos/remcard-navigator && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8" },
  ).trim();
}

function delayedYmapsInitScript() {
  return () => {
    const slowMarker = "ул. RACE-SLOW";
    const hit = (q) => ({
      geometry: { getCoordinates: () => [38.975313, 45.03547] },
      properties: {
        get: (k) => {
          if (k === "text") return String(q);
          return {
            metaDataProperty: {
              GeocoderMetaData: {
                Address: { Components: [{ kind: "locality", name: "Краснодар" }] },
              },
            },
          };
        },
      },
    });
    window.ymaps = {
      ready: (cb) => cb(),
      geocode: (q) => ({
        then: (ok, fail) => {
          const run = () => {
            try {
              ok({ geoObjects: { get: (i) => (i === 0 ? hit(q) : null) } });
            } catch (e) {
              fail?.(e);
            }
          };
          if (String(q).includes(slowMarker)) {
            setTimeout(run, 2500);
          } else {
            queueMicrotask(run);
          }
        },
      }),
    };
  };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(delayedYmapsInitScript());
await context.addCookies([
  {
    name: "remcard-token",
    value: mintToken(STORE_OWNER),
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  },
]);

const page = await context.newPage();
let exitCode = 0;
try {
  await page.goto(`${PROF}/profile?section=branches`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByText("Точки на карте remcard.ru").waitFor({ timeout: 60_000 });
  await page.getByRole("button", { name: /Редактировать/i }).first().click();
  await page.getByLabel(/Название/i).waitFor({ timeout: 60_000 });

  await page.getByLabel(/^Адрес/i).fill("ул. RACE-SLOW 1");
  await page.getByTestId("branch-address-search").click();
  await page.getByTestId("branch-address-search").waitFor({ state: "visible" });
  const loading = await page.getByTestId("branch-address-search").innerText();
  if (!loading.includes("Поиск")) throw new Error("expected loading after slow search start");

  await page.getByLabel(/^Адрес/i).fill("ул. RACE-FAST 2");
  await page.getByTestId("branch-address-search").waitFor({ state: "visible", timeout: 10_000 });
  if (await page.getByTestId("branch-address-search").isDisabled()) {
    throw new Error("search button still disabled after address change");
  }

  await page.getByTestId("branch-address-search").click();
  await page.getByTestId("branch-address-preview").waitFor({ timeout: 15_000 });
  await page.waitForTimeout(3000);
  const preview = await page.getByTestId("branch-address-preview").innerText();
  if (preview.includes("RACE-SLOW")) throw new Error("stale slow preview shown");

  await page.screenshot({
    path: "/opt/cursor/artifacts/screenshots/prof-h4-geocode-query-race-1440.png",
    fullPage: true,
  });
  await page.getByTestId("branch-address-confirm").click();
  await page.getByTestId("branch-geohash-confirmed").waitFor({ timeout: 10_000 });
} catch (e) {
  exitCode = 1;
  console.error(e instanceof Error ? e.message : String(e));
}

await browser.close();
console.log(
  JSON.stringify({
    scenario: "geocode_query_race",
    exitCode,
    sha: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", { encoding: "utf8" }).trim(),
  }),
);
process.exit(exitCode);
