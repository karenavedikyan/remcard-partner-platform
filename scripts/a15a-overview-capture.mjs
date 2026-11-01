#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const repoRoot = "/tmp/remcard-partner-platform";
const protoRoot = "/tmp/r1-proto";
const outRoot = process.argv[2] || "/tmp/a15a-evidence";
const phase = process.argv[3] || "after";

const VIEWS = [
  { w: 1440, h: 900, tag: "1440" },
  { w: 375, h: 812, tag: "375" },
  { w: 320, h: 812, tag: "320" },
];
const THEMES = ["light", "dark"];

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function startHarness() {
  const server = await createServer({
    configFile: path.join(repoRoot, "scripts/admin-mobile-visual-harness/vite.config.ts"),
  });
  await server.listen(5199, "127.0.0.1");
  return server;
}

async function captureCompiled(browser, dir, phase) {
  for (const theme of THEMES) {
    for (const v of VIEWS) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await page.goto("http://127.0.0.1:5199/#/overview");
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        document.documentElement.style.colorScheme = t;
      }, theme);
      if (phase === "after") {
        await page.getByText("Главное о росте, людях и партнёрской сети").waitFor({ timeout: 20000 });
      } else {
        await page.getByRole("heading", { name: "Обзор", level: 1 }).waitFor({ timeout: 20000 });
        await page.getByText("Завершённые регистрации").waitFor({ timeout: 20000 });
      }
      await sleep(300);
      const file = path.join(dir, `compiled-overview-${v.tag}-${theme}-${phase}.png`);
      await page.screenshot({ path: file, fullPage: true });
      await page.close();
    }
  }
}

async function captureFrozen(browser, dir, phase) {
  const htmlUrl = "http://127.0.0.1:8765/admin/index.html#overview";
  for (const theme of THEMES) {
    for (const v of VIEWS) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await page.goto(htmlUrl);
      await page.waitForSelector("#app .page-head", { timeout: 20000 });
      await page.evaluate(() => {
        document.querySelector('[data-action="set-release"][data-id="1"]')?.dispatchEvent(
          new MouseEvent("click", { bubbles: true }),
        );
      });
      await page.locator(".kpis").first().waitFor({ timeout: 20000 });
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await sleep(400);
      const file = path.join(dir, `frozen-r1-overview-${v.tag}-${theme}-${phase}.png`);
      await page.screenshot({ path: file, fullPage: true });
      await page.close();
    }
  }
}

async function measureHeader(page) {
  return page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const lead = document.querySelector("p");
    const kpis = document.querySelector('[class*="kpis"]') || document.querySelector(".kpis");
    if (!h1 || !kpis) return null;
    const h = h1.getBoundingClientRect();
    const k = kpis.getBoundingClientRect();
    const leadEl = Array.from(document.querySelectorAll("p")).find((p) =>
      p.textContent?.includes("Главное о росте"),
    );
    const l = leadEl?.getBoundingClientRect();
    return {
      h1Bottom: Math.round(h.bottom),
      leadTop: l ? Math.round(l.top) : null,
      leadBottom: l ? Math.round(l.bottom) : null,
      kpisTop: Math.round(k.top),
      headerToKpiGap: Math.round(k.top - h.bottom),
    };
  });
}

async function main() {
  fs.mkdirSync(outRoot, { recursive: true });
  const server = await startHarness();
  const browser = await chromium.launch();
  try {
    await captureFrozen(browser, outRoot, phase);
    await captureCompiled(browser, outRoot, phase);

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto("http://127.0.0.1:5199/#/overview");
    if (phase === "after") {
      await page.getByText("Главное о росте, людях и партнёрской сети").waitFor();
    } else {
      await page.getByText("Завершённые регистрации").waitFor();
    }
    const compiled = await measureHeader(page);
    await page.close();

    const protoPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await protoPage.goto("http://127.0.0.1:8765/admin/index.html#overview");
    await protoPage.waitForSelector("#app .page-head", { timeout: 20000 });
    await protoPage.evaluate(() => {
      document.querySelector('[data-action="set-release"][data-id="1"]')?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
    });
    await protoPage.getByRole("heading", { name: "Обзор проекта" }).waitFor();
    const frozen = await protoPage.evaluate(() => {
      const head = document.querySelector(".page-head");
      const kpis = document.querySelector(".kpis");
      if (!head || !kpis) return null;
      const h = head.getBoundingClientRect();
      const k = kpis.getBoundingClientRect();
      const lead = head.querySelector("p");
      const l = lead?.getBoundingClientRect();
      return {
        headBottom: Math.round(h.bottom),
        leadTop: l ? Math.round(l.top) : null,
        leadBottom: l ? Math.round(l.bottom) : null,
        kpisTop: Math.round(k.top),
        headToKpiGap: Math.round(k.top - h.bottom),
      };
    });
    await protoPage.close();

    fs.writeFileSync(
      path.join(outRoot, `header-metrics-${phase}.json`),
      JSON.stringify({ frozenR1: frozen, compiled, gapId: "OVERVIEW-A15a-HEAD-LEAD" }, null, 2),
    );
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
