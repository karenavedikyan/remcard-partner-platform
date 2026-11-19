#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const harnessDir = path.join(repoRoot, "scripts/link-invite-gallery-visual-harness");
const outDir = path.join(repoRoot, "artifacts/link-invite-gallery-148/screenshots");
fs.mkdirSync(outDir, { recursive: true });

const mockList = {
  listVersion: 2,
  resurfaceEnabled: true,
  activeLimit: 50,
  active: {
    items: [
      {
        id: "inv-long",
        status: "PENDING",
        statusLabel: "Активно",
        expiresAt: "2099-01-01T00:00:00.000Z",
        legacyTtl: false,
        createdAt: "2026-11-19T13:00:00.000Z",
        acceptedAt: null,
        recipientLabel: "Поставщик с очень длинным названием для проверки переноса без обрезки действий",
        intendedPartnerType: "STORE",
        note: "Короткий текст приглашения",
        partnershipId: null,
        previewPath: "/invite/long",
        canCopyLink: true,
        canReissue: false,
        canEditPersonalLabel: true,
        createdBy: { userId: "u1", displayName: "Анна Волкова", at: "2026-11-19T13:00:00.000Z" },
        acceptedBy: null,
        terms: [
          { category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false },
          { category: "flooring", categoryLabel: "Пол", storePercent: 0, isExcluded: true },
        ],
      },
      {
        id: "inv-2",
        status: "PENDING",
        statusLabel: "Активно",
        expiresAt: "2099-01-01T00:00:00.000Z",
        legacyTtl: false,
        createdAt: "2026-11-18T10:00:00.000Z",
        acceptedAt: null,
        recipientLabel: "Илья Лебедев",
        intendedPartnerType: "MASTER",
        note: null,
        partnershipId: null,
        previewPath: "/invite/2",
        canCopyLink: true,
        canReissue: false,
        createdBy: { userId: "u1", displayName: "Анна Волкова", at: "2026-11-18T10:00:00.000Z" },
        acceptedBy: null,
        terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 12, isExcluded: false }],
      },
    ],
    nextCursor: null,
  },
  archive: { items: [], nextCursor: null },
};

const server = await createServer({
  configFile: path.join(harnessDir, "vite.config.ts"),
  root: harnessDir,
  server: { port: 5215, host: "127.0.0.1" },
});
await server.listen();

const base = "http://127.0.0.1:5215";
const shots = [
  { theme: "dark", width: 1440, name: "desktop-dark-1440" },
  { theme: "light", width: 1440, name: "desktop-light-1440" },
  { theme: "dark", width: 375, name: "mobile-dark-375" },
  { theme: "light", width: 375, name: "mobile-light-375" },
  { theme: "dark", width: 320, name: "mobile-dark-320" },
  { theme: "light", width: 320, name: "mobile-light-320" },
];

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

await page.route("**/api/partnership/link-invite**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(mockList),
  });
});

for (const shot of shots) {
  await page.setViewportSize({ width: shot.width, height: shot.width <= 400 ? 800 : 900 });
  await page.goto(`${base}/?theme=${shot.theme}`);
  await page.evaluate((theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.style.colorScheme = theme;
  }, shot.theme);
  await page.waitForSelector('[data-testid="link-invite-gallery"]', { timeout: 15000 });
  await page.waitForTimeout(150);
  await page.screenshot({
    path: path.join(outDir, `${shot.name}.png`),
    fullPage: true,
  });
}

await browser.close();
await server.close();
console.log(`Saved screenshots to ${outDir}`);