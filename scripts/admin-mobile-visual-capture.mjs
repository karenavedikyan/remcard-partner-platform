#!/usr/bin/env node
/**
 * Isolated admin mobile visual capture — not production routes, synthetic API mocks only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = path.join(repoRoot, "artifacts/admin-mobile/screenshots");
const baseUrl = "http://127.0.0.1:5199";

const SCENES = [
  { id: "overview", hash: "#/overview", ready: "Завершённые регистрации" },
  { id: "partners", hash: "#/partners", ready: "Строительно-монтажное", interact: interactPartners },
  { id: "partnerships", hash: "#/partners/partnerships", ready: "Контрагент с очень длинным" },
  { id: "moderation", hash: "#/moderation", ready: "Модерация каталога" },
  { id: "moderation-partner-detail", hash: "#/moderation/partner-detail", ready: "Одобрить заявку" },
  { id: "moderation-org-detail", hash: "#/moderation/org-detail", ready: "длинным названием организации" },
  { id: "moderation-org-preview", hash: "#/moderation/org-preview", ready: "Карточка в списке каталога" },
  { id: "moderation-partner-preview", hash: "#/moderation/partner-preview", ready: "Карточка в списке каталога" },
  { id: "notifications", hash: "#/notifications", ready: "Новый партнёр зарегистрирован" },
  { id: "test-users", hash: "#/test-users", ready: "Тестовый агент harness" },
  { id: "password", hash: "#/password", ready: "Безопасность администратора" },
  { id: "shell", hash: "#/shell", ready: "Изолированная оболочка" },
];

const MATRIX = [
  { w: 375, h: 812, tag: "375" },
  { w: 1440, h: 900, tag: "1440" },
  { w: 320, h: 568, tag: "320" },
  { w: 430, h: 932, tag: "430" },
  { w: 768, h: 1024, tag: "768" },
];

const THEMES = ["light", "dark"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(400);
  }
  throw new Error(`Harness server did not start at ${url}`);
}

async function startHarness() {
  const server = await createServer({
    configFile: path.join(repoRoot, "scripts/admin-mobile-visual-harness/vite.config.ts"),
  });
  await server.listen(5199, "127.0.0.1");
  return server;
}

async function interactPartners(page) {
  const boxes = page.locator('input[type="checkbox"]');
  const count = await boxes.count();
  if (count >= 2) {
    await boxes.nth(1).click({ force: true });
    await sleep(300);
  }
  const manage = page.getByRole("button", { name: /Управление партнёром/i }).first();
  if (await manage.isVisible().catch(() => false)) {
    await manage.click();
    await sleep(400);
    const previewBtn = page.getByRole("button", { name: /Скрыть из поиска|Показать в поиске/i }).first();
    if (await previewBtn.isVisible().catch(() => false)) {
      await previewBtn.click();
      await page.getByText("harness-preview-token", { exact: false }).waitFor({ timeout: 5000 }).catch(() => {});
      await sleep(300);
    }
  }
}

async function captureScene(page, scene, viewport, theme) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.setViewportSize({ width: viewport.w, height: viewport.h });
  await page.addInitScript((t) => {
    localStorage.setItem("remcard-theme", t);
  }, theme);

  await page.goto(`${baseUrl}${scene.hash}`, { waitUntil: "domcontentloaded" });
  await page.getByText(scene.ready, { exact: false }).first().waitFor({ timeout: 20_000 });

  if (scene.interact) {
    await scene.interact(page);
  }

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const openDialog = document.querySelector("dialog[open]");
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      pageOverflow: doc.scrollWidth > doc.clientWidth + 1,
      openDialogs: openDialog ? 1 : 0,
    };
  });

  const file = `${scene.id}-${viewport.tag}-${theme}.png`;
  await page.screenshot({ path: path.join(outDir, file), fullPage: true });

  return { file, metrics, errors: [...new Set(errors)] };
}

async function navResizeRegression(page) {
  const log = [];
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => localStorage.setItem("remcard-theme", "light"));
  await page.goto(`${baseUrl}#/shell`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Разделы" }).click();
  await page.getByRole("dialog", { name: "Навигация администратора" }).waitFor();

  await page.setViewportSize({ width: 1440, height: 900 });
  await sleep(400);

  const afterResize = await page.evaluate(() => ({
    openDialogs: document.querySelectorAll("dialog[open]").length,
    bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
  }));
  log.push({ step: "after-resize-1440", ...afterResize });

  const mainLink = page.getByRole("link", { name: "Обзор" }).first();
  await mainLink.click({ trial: true }).catch(() => {});
  const clickable = await mainLink.click({ timeout: 3000 }).then(() => true).catch(() => false);
  log.push({ step: "desktop-content-click", clickable });

  await page.setViewportSize({ width: 375, height: 812 });
  await sleep(300);
  await page.getByRole("button", { name: "Разделы" }).click();
  await page.getByRole("dialog", { name: "Навигация администратора" }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("dialog", { name: "Навигация администратора" }).waitFor({ state: "hidden" });
  const focusOnMenu = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-controls="admin-nav-dialog"]');
    return btn === document.activeElement;
  });
  log.push({ step: "escape-focus", focusOnMenu });

  await page.screenshot({ path: path.join(outDir, "nav-resize-regression-375-light.png"), fullPage: true });
  return log;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const server = await startHarness();

  try {
    await waitForServer(baseUrl);
    const browser = await chromium.launch();
    const results = [];
    const matrixPrimary = MATRIX.filter((v) => v.tag === "375" || v.tag === "1440");

    for (const scene of SCENES) {
      for (const theme of THEMES) {
        for (const viewport of matrixPrimary) {
          const page = await browser.newPage();
          results.push({
            scene: scene.id,
            theme,
            viewport: viewport.tag,
            ...(await captureScene(page, scene, viewport, theme)),
          });
          await page.close();
        }
      }
      for (const theme of ["light"]) {
        for (const viewport of MATRIX.filter((v) => !["375", "1440"].includes(v.tag))) {
          const page = await browser.newPage();
          results.push({
            scene: scene.id,
            theme,
            viewport: viewport.tag,
            ...(await captureScene(page, scene, viewport, theme)),
          });
          await page.close();
        }
      }
    }

    const navPage = await browser.newPage();
    const navLog = await navResizeRegression(navPage);
    await navPage.close();
    await browser.close();

    const reportPath = path.join(repoRoot, "artifacts/admin-mobile/capture-results.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({ capturedAt: new Date().toISOString(), results, navResizeRegression: navLog }, null, 2),
    );
    const overflow = results.filter((r) => r.metrics?.pageOverflow);
    const consoleErrors = results.filter((r) => r.errors?.length);
    if (overflow.length) {
      console.error("Horizontal overflow detected:", overflow.map((r) => `${r.scene}@${r.viewport}`).join(", "));
    }
    if (consoleErrors.length) {
      console.error("Console errors:", consoleErrors.length, "captures");
    }
    console.log(`Captured ${results.length} screenshots → ${outDir}`);
    console.log(`Nav resize regression:`, JSON.stringify(navLog));
  } finally {
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
