#!/usr/bin/env node
/**
 * Harness-only capture for partner search visibility confirm (no manual reason).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "artifacts/admin-search-status-confirm/screenshots");
const metricsPath = path.join(repoRoot, "artifacts/admin-search-status-confirm/metrics.json");
const baseUrl = "http://127.0.0.1:5199";

const SCENES = [
  { w: 1440, h: 900, tag: "1440", table: true },
  { w: 375, h: 812, tag: "375", table: false },
];

async function openFirstManagement(page, mobile) {
  await page.goto(`${baseUrl}#/partners`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Партнёры \(реестр\)/ }).waitFor({ timeout: 30000 });
  if (mobile) {
    const list = page.getByRole("list", { name: "Реестр партнёров" });
    await list.waitFor({ state: "visible", timeout: 30000 });
    await page.locator('ul[aria-label="Реестр партнёров"] > li').first().getByRole("button").click();
  } else {
    await page.getByRole("button", { name: "Удалить" }).first().waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Удалить" }).first().click();
  }
  return page.getByRole("region", { name: /Управление партнёром/i });
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await createServer({
    configFile: path.join(repoRoot, "scripts/admin-mobile-visual-harness/vite.config.ts"),
  });
  await server.listen(5199, "127.0.0.1");
  const browser = await chromium.launch();
  const metrics = { capturedAt: new Date().toISOString(), browser: "playwright-chromium", scenes: [], flow: [] };

  try {
    for (const theme of ["light", "dark"]) {
      for (const scene of SCENES) {
        const page = await browser.newPage();
        await page.setViewportSize({ width: scene.w, height: scene.h });
        await page.addInitScript(
          (t, table) => {
            localStorage.setItem("remcard-theme", t);
            localStorage.setItem("prof-admin-partners-registry-view", table ? "table" : "cards");
          },
          theme,
          scene.table,
        );
        const panel = await openFirstManagement(page, !scene.table);
        await panel.getByRole("button", { name: "Скрыть от партнёров" }).click();
        await page.getByRole("dialog", { name: "Подтверждение изменения" }).waitFor();
        const filePreview = `search-status-${scene.tag}-${theme}-preview.png`;
        await page.screenshot({ path: path.join(outDir, filePreview) });
        await page.getByRole("button", { name: "Отмена" }).click();
        await panel.getByRole("button", { name: "Скрыть от партнёров" }).click();
        await page.getByRole("button", { name: "Подтвердить" }).click();
        await page.waitForTimeout(800);
        const fileApplied = `search-status-${scene.tag}-${theme}-applied.png`;
        await page.screenshot({ path: path.join(outDir, fileApplied) });
        metrics.scenes.push({ filePreview, fileApplied, theme, viewport: scene.tag });
        await page.close();
      }
    }

    const probe = await browser.newPage();
    await probe.setViewportSize({ width: 1440, height: 900 });
    await probe.addInitScript(() => localStorage.setItem("remcard-theme", "light"));
    const panel = await openFirstManagement(probe, false);
    await panel.getByRole("button", { name: "Убрать из каталога" }).click();
    const catalogBlocked = await probe.getByRole("alert").isVisible().catch(() => false);
    metrics.flow.push({ step: "catalog-without-reason-blocked", ok: catalogBlocked });
    await probe.close();

    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));
    console.log(JSON.stringify(metrics, null, 2));
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
