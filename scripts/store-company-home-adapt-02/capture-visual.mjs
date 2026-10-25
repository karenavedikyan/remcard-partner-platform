/**
 * Dev-only visual capture: mocks metrics API; does not prove server guards.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = (process.env.PROF_DEV_URL ?? "http://127.0.0.1:3430").replace(/\/$/, "");
const ART = path.resolve("artifacts/store-company-home-adapt-02/visual");
const FE_SHA = process.env.STORE_HOME_FE_SHA ?? "be43ffc8a34088392635fb9e9079b5929369c117";
const BE_SHA = process.env.STORE_HOME_BE_SHA ?? "5a2c2a7d9d5c03f2b948626dea2a987daa0422a4";

const MOCK = {
  STORE: {
    partnerType: "STORE",
    activeBranchLabel: "ул. Примерная 1, Краснодар",
    metrics: {
      primary: { state: "ok", value: 12 },
      secondary: { state: "ok", value: 4 },
      tertiary: { state: "ok", value: 2 },
    },
  },
  COMPANY: {
    partnerType: "COMPANY",
    activeBranchLabel: null,
    metrics: {
      primary: { state: "ok", value: 3 },
      secondary: { state: "ok", value: 8 },
      tertiary: { state: "empty" },
    },
  },
};

async function capture(page, partnerType, theme, width, setPartnerType) {
  setPartnerType(partnerType);
  await page.setViewportSize({ width, height: width <= 375 ? 844 : 900 });
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("remcard-theme", t);
    } catch {
      /* ignore */
    }
  }, theme);
  await page.goto(`${BASE}/dev/business-home-preview?partnerType=${partnerType}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("heading", { level: 1, name: "Ваш кабинет" }).waitFor({ timeout: 30000 });
  const name = `${partnerType.toLowerCase()}-home-${theme}-${width}.png`;
  await page.screenshot({ path: path.join(ART, name), fullPage: true });
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let lastPartnerType = "STORE";
  const setPartnerType = (p) => {
    lastPartnerType = p;
  };
  await page.route("**/api/pro/business-home/metrics**", async (route) => {
    const body = lastPartnerType === "COMPANY" ? MOCK.COMPANY : MOCK.STORE;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  for (const partnerType of ["STORE", "COMPANY"]) {
    for (const theme of ["light", "dark"]) {
      for (const width of partnerType === "STORE" && theme === "dark" ? [375, 1440] : [1440]) {
        if (partnerType === "COMPANY" && width === 375 && theme === "light") {
          await capture(page, partnerType, theme, 320, setPartnerType);
        }
        await capture(page, partnerType, theme, width, setPartnerType);
      }
    }
  }
  await browser.close();
  fs.writeFileSync(
    path.join(path.dirname(ART), "metadata.json"),
    JSON.stringify(
      {
        frontendRuntimeSha: FE_SHA,
        backendRuntimeSha: BE_SHA,
        captureNote:
          "Dev preview with mocked /api/pro/business-home/metrics; server guard proof is vitest route tests on navigator.",
        capturedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ ok: true, art: ART }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
