#!/usr/bin/env node
/** Dev fixture smoke: team section views + help + wizard entry (no real API). */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.TEAM_SMOKE_URL ?? "http://127.0.0.1:3002";
const OUT = process.env.TEAM_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/team-prototype-smoke";

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("remcard-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

async function runViewport(page, theme, name) {
  await page.goto(`${BASE}/profile/dev-fixture?section=team`, { waitUntil: "networkidle" });
  await setTheme(page, theme);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Команда и доступы" }).waitFor({ state: "visible" });

  await page.getByTestId("team-view-people").click();
  await page.locator('[aria-label="Поиск по имени или должности"]').fill("Кассир");
  await page.screenshot({ path: `${OUT}/team-search-position-${theme}-${name}.png` });
  await page.locator('[aria-label="Поиск по имени или должности"]').fill("");
  await page.screenshot({ path: `${OUT}/team-people-${theme}-${name}.png` });

  await page.getByTestId("team-view-locations").click();
  await page.screenshot({ path: `${OUT}/team-locations-${theme}-${name}.png` });

  await page.getByTestId("team-view-invites").click();
  await page.screenshot({ path: `${OUT}/team-invites-${theme}-${name}.png` });

  await page.getByTestId("team-permissions-help").click();
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page.screenshot({ path: `${OUT}/team-help-${theme}-${name}.png` });
  await page.getByRole("button", { name: "Понятно" }).click();

  await page.getByTestId("team-view-people").click();
  await page.getByTestId("team-open-invite-wizard").first().click();
  await page.getByRole("dialog", { name: /Пригласить сотрудника/i }).waitFor({ state: "visible" });
  await page.screenshot({ path: `${OUT}/team-wizard-step1-${theme}-${name}.png` });
  await page.getByRole("button", { name: /Далее/i }).click();
  await page.screenshot({ path: `${OUT}/team-wizard-step2-${theme}-${name}.png` });
  await page.getByRole("button", { name: /Далее/i }).click();
  await page.screenshot({ path: `${OUT}/team-wizard-step3-${theme}-${name}.png` });
  await page.getByRole("button", { name: "Закрыть" }).click();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const theme of ["light", "dark"]) {
    for (const [name, width, height] of [
      ["1440", 1440, 900],
      ["390", 390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } });
      await runViewport(page, theme, name);
      await page.close();
      console.log(`OK team smoke ${theme} ${name}`);
    }
  }
  await browser.close();
  console.log("[team-prototype-smoke] PASS");
}

main().catch((err) => {
  console.error("[team-prototype-smoke]", err.message || err);
  process.exitCode = 1;
});
