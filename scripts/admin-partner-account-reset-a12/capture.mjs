#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP = (process.env.A12_APP_URL || "http://127.0.0.1:4312").replace(/\/$/, "");
const OUT = process.env.A12_OUT || "/tmp/a12-native";
const VPS = [
  { w: 1440, h: 900 },
  { w: 375, h: 812 },
  { w: 320, h: 600 },
];
const THEMES = ["light", "dark"];

fs.mkdirSync(path.join(OUT, "fe"), { recursive: true });
fs.mkdirSync(path.join(OUT, "meta"), { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("remcard-theme", t);
    document.documentElement.dataset.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, theme);
}

async function gotoPartners(page, theme, vp) {
  // Prefer post-load theme apply — early init scripts can race before documentElement exists.
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("remcard-theme", t);
    } catch {
      /* ignore */
    }
    const apply = () => {
      const root = document.documentElement;
      if (!root) return;
      root.dataset.theme = t;
      root.setAttribute("data-theme", t);
      if (t === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    };
    if (document.documentElement) apply();
    else document.addEventListener("DOMContentLoaded", apply, { once: true });
  }, theme);
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.goto(`${APP}/admin/partners`, { waitUntil: "networkidle", timeout: 90_000 });
  await setTheme(page, theme);
  await page.getByRole("heading", { name: "Партнёры", level: 1 }).waitFor({ timeout: 60_000 });
  await sleep(400);
}

async function openDeleteConfirm(page) {
  await page.getByRole("button", { name: /Открыть карточку/ }).first().click();
  await page.getByRole("heading", { name: "Карточка партнёра" }).waitFor();
  await page.getByLabel("Причина").fill("Синтетическая причина удаления A12");
  await page.getByRole("button", { name: "Удалить аккаунт партнёра" }).click();
  await page.getByLabel("Публичный ID для подтверждения удаления").waitFor({ timeout: 15_000 });
  await sleep(300);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const report = { assertions: [], tip: process.env.A12_TIP || null };

  for (const theme of THEMES) {
    for (const vp of VPS) {
      const tag = `${theme}-${vp.w}x${vp.h}`;
      const context = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        extraHTTPHeaders: { Origin: APP, Referer: `${APP}/admin/partners` },
      });
      await context.addCookies([
        {
          name: "remcard-token",
          value: "qa-a12-staff-token",
          url: APP,
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));

      await gotoPartners(page, theme, vp);
      await page.screenshot({ path: path.join(OUT, "fe", `fe-list-${tag}.png`), fullPage: false });

      // Archive wording present, no misleading delete-from-project
      const bodyText = await page.locator("body").innerText();
      report.assertions.push(
        !/Удалить из проекта/.test(bodyText)
          ? `PASS no-misleading-delete-from-project list ${tag}`
          : `FAIL misleading-delete-from-project list ${tag}`,
      );

      await openDeleteConfirm(page);
      await page.screenshot({
        path: path.join(OUT, "fe", `fe-account-delete-confirm-${tag}.png`),
        fullPage: false,
      });
      const confirm = page.locator('[data-account-delete-confirm="true"]');
      const confirmVisible = await confirm.isVisible();
      const dangerDisabled = await page
        .getByRole("button", { name: /Удалить аккаунт без возможности восстановления/ })
        .isDisabled();
      report.assertions.push(
        confirmVisible ? `PASS delete-confirm-open ${tag}` : `FAIL delete-confirm-open ${tag}`,
      );
      report.assertions.push(
        dangerDisabled
          ? `PASS danger-disabled-until-publicId ${tag}`
          : `FAIL danger-should-be-disabled ${tag}`,
      );

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      report.assertions.push(
        !overflow ? `PASS overflow-clean ${tag}` : `FAIL overflow ${tag}`,
      );
      report.assertions.push(
        errors.length === 0 ? `PASS no-pageerror ${tag}` : `FAIL pageerror ${tag}: ${errors[0]}`,
      );

      // Cancel path — no apply
      await page.getByRole("button", { name: "Отмена" }).click();
      await sleep(200);
      report.assertions.push(
        (await page.locator('[data-account-delete-confirm="true"]').count()) === 0
          ? `PASS cancel-closes-confirm ${tag}`
          : `FAIL cancel-closes-confirm ${tag}`,
      );

      await context.close();
    }
  }

  // One full apply path at 1440 light
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: { Origin: APP, Referer: `${APP}/admin/partners` },
    });
    await context.addCookies([
      {
        name: "remcard-token",
        value: "qa-a12-staff-token",
        url: APP,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const page = await context.newPage();
    await gotoPartners(page, "light", { w: 1440, h: 900 });
    await openDeleteConfirm(page);
    await page.getByLabel("Публичный ID для подтверждения удаления").fill("RC-A12DEMO");
    await page.getByRole("button", { name: /Удалить аккаунт без возможности восстановления/ }).click();
    // Registry-level status banner (detail dialog may also echo the same message).
    await page
      .getByLabel("Поиск и фильтры реестра")
      .getByRole("status")
      .filter({ hasText: /Аккаунт удалён/ })
      .waitFor({ timeout: 15_000 });
    await page.screenshot({
      path: path.join(OUT, "fe", "fe-account-delete-success-light-1440x900.png"),
      fullPage: false,
    });
    report.assertions.push("PASS delete-success-banner light-1440x900");
    await context.close();
  }

  const pass = report.assertions.filter((a) => a.startsWith("PASS")).length;
  const fail = report.assertions.filter((a) => a.startsWith("FAIL")).length;
  const out = { pass, fail, assertions: report.assertions, tip: report.tip };
  fs.writeFileSync(path.join(OUT, "capture-report.json"), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
