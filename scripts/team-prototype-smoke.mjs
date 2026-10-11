#!/usr/bin/env node
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function runViewport(page, theme, name) {
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE}/profile/dev-fixture?section=team`, { waitUntil: "networkidle" });
  await setTheme(page, theme);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Команда и доступы" }).waitFor({ state: "visible" });
  assert(
    (await page.getByText("Кто с вами работает, за что отвечает").count()) > 0,
    "team heading must use prototype subtitle copy",
  );
  assert(
    (await page.getByRole("heading", { name: "Подсказка", exact: true }).count()) === 0,
    "team section must not show ProfileEditor generic aside",
  );

  await page.getByTestId("team-view-people").click();
  await page.locator('[aria-label="Поиск по имени или должности"]').fill("Кассир");
  await page.waitForTimeout(200);
  assert(await page.getByText("Андрей Петров").isVisible(), "search by position should match Кассир");
  assert(!(await page.getByText("Мария Иванова").isVisible()), "search should filter out non-matching");
  await page.screenshot({ path: `${OUT}/team-search-position-${theme}-${name}.png` });

  await page.locator('[aria-label="Поиск по имени или должности"]').fill("");
  await page.screenshot({ path: `${OUT}/team-people-${theme}-${name}.png` });

  await page.getByTestId("team-view-locations").click();
  await page.locator('[aria-label="Поиск по имени или должности"]').fill("выплат");
  await page.waitForTimeout(200);
  assert(
    await page.getByText("Ирина Морозова").isVisible(),
    "locations view must respect search filter",
  );
  await page.screenshot({ path: `${OUT}/team-locations-${theme}-${name}.png` });

  await page.getByTestId("team-view-invites").click();
  assert(await page.getByTestId("team-copy-invite-inv-org-1").isVisible(), "merged invite must expose copy URL");
  await page.screenshot({ path: `${OUT}/team-invites-${theme}-${name}.png` });

  await page.getByTestId("team-permissions-help").click();
  await page.getByTestId("team-bonus-illustration").waitFor({ state: "visible" });
  assert(await page.getByText("+1 000 ₽").isVisible(), "help must show example accrual illustration");
  await page.screenshot({ path: `${OUT}/team-help-${theme}-${name}.png` });
  await page.getByRole("button", { name: "Понятно" }).click();

  await page.getByTestId("team-open-invite-wizard").first().click();
  await page.getByRole("dialog", { name: /Пригласить сотрудника/i }).waitFor({ state: "visible" });
  assert((await page.getByTestId("team-wizard-step-1").getAttribute("data-active")) === "true");
  await page.screenshot({ path: `${OUT}/team-wizard-step1-${theme}-${name}.png` });

  await page.getByTestId("team-wizard-next").click();
  assert((await page.getByTestId("team-wizard-step-2").getAttribute("data-active")) === "true");
  const next2 = page.getByTestId("team-wizard-next");
  assert(await next2.isDisabled(), "ORG wizard step2 must start without implicit branch selection");
  await page.getByTestId("team-invite-branch-b1").check();
  assert(!(await next2.isDisabled()), "branch must be explicitly selected before step 3");
  await page.screenshot({ path: `${OUT}/team-wizard-step2-${theme}-${name}.png` });

  await next2.click();
  assert((await page.getByTestId("team-wizard-step-3").getAttribute("data-active")) === "true");
  await page.screenshot({ path: `${OUT}/team-wizard-step3-${theme}-${name}.png` });
  await page.getByRole("button", { name: "Закрыть" }).click();

  await page.getByTestId("team-view-people").click();
  await page.getByRole("button", { name: "Доступы" }).first().click();
  await page.getByRole("dialog", { name: /Настроить доступ/i }).waitFor({ state: "visible" });
  assert((await page.getByTestId("team-member-wizard-step-1").getAttribute("data-active")) === "true");
  await page.screenshot({ path: `${OUT}/team-member-edit-${theme}-${name}.png` });
  await page.getByRole("button", { name: "Закрыть" }).click();

  const overflow = await page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth > el.clientWidth + 2;
  });
  assert(!overflow, `horizontal overflow on ${theme} ${name}`);

  const severe = consoleErrors.filter((t) => !/favicon|404.*icon/i.test(t));
  assert(severe.length === 0, `console errors: ${severe.join("; ")}`);
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
