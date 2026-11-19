#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const harnessDir = path.join(repoRoot, "scripts/link-invite-gallery-visual-harness");
const outDir = path.join(repoRoot, "artifacts/link-invite-gallery-148");
fs.mkdirSync(path.join(outDir, "screenshots"), { recursive: true });

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
        recipientLabel: "Поставщик с очень длинным названием для проверки переноса",
        intendedPartnerType: "STORE",
        note: "Короткий текст приглашения",
        partnershipId: null,
        previewPath: "/invite/long",
        canCopyLink: true,
        canReissue: false,
        canEditPersonalLabel: true,
        createdBy: { userId: "u1", displayName: "Анна Волкова", at: "2026-11-19T13:00:00.000Z" },
        acceptedBy: null,
        terms: [{ category: "doors", categoryLabel: "Двери", storePercent: 10, isExcluded: false }],
      },
    ],
    nextCursor: null,
  },
  archive: { items: [], nextCursor: null },
};

const server = await createServer({
  configFile: path.join(harnessDir, "vite.config.ts"),
  root: harnessDir,
  server: { port: 0, host: "127.0.0.1" },
  define: {
    "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify("http://127.0.0.1:4312"),
    "process.env.REMCARD_API_BASE_URL": JSON.stringify("http://127.0.0.1:4312"),
  },
});
await server.listen();
const base = `http://127.0.0.1:${server.config.server.port}`;

const browser = await chromium.launch();
const page = await browser.newPage();

await page.route("**/api/remcard/api/partnership/link-invite**", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(mockList),
  });
});

const cases = [
  { width: 320, theme: "light" },
  { width: 320, theme: "dark" },
  { width: 375, theme: "light" },
  { width: 375, theme: "dark" },
];

const report = [];

for (const c of cases) {
  await page.setViewportSize({ width: c.width, height: 900 });
  await page.goto(`${base}/?theme=${c.theme}`);
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, c.theme);
  await page.waitForSelector('[data-testid="link-invite-gallery"]', { timeout: 15000 });

  const dialog = page.locator('[data-testid="link-invite-gallery"]');
  const list = page.locator('[data-testid="link-invite-gallery-active-cards"]');
  const card = page.locator('[data-testid="link-invite-card-inv-long"]');
  const face = card.locator(":scope > div").first();
  const foot = page.locator('[data-testid="link-invite-card-foot"]');

  const dialogBox = await dialog.boundingBox();
  const listBox = await list.boundingBox();
  const faceBox = await face.boundingBox();
  const footBox = await foot.boundingBox();
  const buttons = await foot.locator("button").evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        label: el.getAttribute("aria-label") || el.textContent?.trim() || "",
      };
    }),
  );

  const row = {
    viewport: c.width,
    theme: c.theme,
    dialog: dialogBox ? { x: Math.round(dialogBox.x), w: Math.round(dialogBox.width) } : null,
    list: listBox ? { x: Math.round(listBox.x), w: Math.round(listBox.width) } : null,
    face: faceBox ? { w: Math.round(faceBox.width), h: Math.round(faceBox.height) } : null,
    foot: footBox ? { h: Math.round(footBox.height), buttons } : null,
  };
  report.push(row);

  await page.screenshot({
    path: path.join(outDir, "screenshots", `mobile-measure-${c.width}-${c.theme}.png`),
    fullPage: true,
  });
}

await browser.close();
await server.close();

const reportPath = path.join(outDir, "mobile-measurements.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(reportPath);
console.log(JSON.stringify(report, null, 2));

const tolW = 8;
const tolH = 6;
for (const row of report) {
  if (!row.dialog || !row.face || !row.foot) continue;
  const expectDialogW = row.viewport === 320 ? 282 : 337;
  assert.ok(Math.abs(row.dialog.w - expectDialogW) <= tolW, `dialog width ${row.dialog.w} @${row.viewport}`);
  const expectFaceW = row.viewport === 320 ? 226 : 281;
  assert.ok(Math.abs(row.face.w - expectFaceW) <= tolW, `face width ${row.face.w} @${row.viewport}`);
  const expectFaceH = row.viewport === 320 ? 153 : 190;
  assert.ok(Math.abs(row.face.h - expectFaceH) <= tolH, `face height ${row.face.h} @${row.viewport}`);
  const expectFootH = row.viewport === 320 ? 39 : 47;
  assert.ok(Math.abs(row.foot.h - expectFootH) <= 8, `foot height ${row.foot.h} @${row.viewport}`);
}

console.log("mobile measure assertions: ok");