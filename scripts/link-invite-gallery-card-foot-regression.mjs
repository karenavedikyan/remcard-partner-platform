#!/usr/bin/env node
/**
 * Regression: pending author card keeps four foot controls on one row and height ≤231px
 * at 320/375 in light and dark (long list title).
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const harnessDir = path.join(repoRoot, "scripts/link-invite-gallery-visual-harness");

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
        recipientLabel:
          "Поставщик с очень длинным названием для проверки переноса без обрезки действий внизу карточки",
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
    ],
    nextCursor: null,
  },
  archive: { items: [], nextCursor: null },
};

const server = await createServer({
  configFile: path.join(harnessDir, "vite.config.ts"),
  root: harnessDir,
  server: { port: 0, host: "127.0.0.1", strictPort: false },
  define: {
    "process.env.NEXT_PUBLIC_APP_URL": JSON.stringify("http://127.0.0.1:4312"),
    "process.env.REMCARD_API_BASE_URL": JSON.stringify(""),
  },
});
await server.listen();
const boundPort = server.config.server.port;
const base = `http://127.0.0.1:${boundPort}`;

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
  { theme: "light", width: 320 },
  { theme: "dark", width: 320 },
  { theme: "light", width: 375 },
  { theme: "dark", width: 375 },
];

for (const { theme, width } of cases) {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(`${base}/?theme=${theme}`);
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  await page.waitForSelector('[data-testid="link-invite-card-inv-long"]', { timeout: 15000 });

  const card = page.locator('[data-testid="link-invite-card-inv-long"]');
  const box = await card.boundingBox();
  assert.ok(box, `card box missing @${width}/${theme}`);
  assert.ok(box.width <= 340, `card width ${box.width} @${width}/${theme}`);
  assert.ok(box.height <= 231, `card height ${box.height} > 231 @${width}/${theme}`);

  const foot = page.locator('[data-testid="link-invite-card-foot"]');
  const buttons = foot.locator("button");
  assert.equal(await buttons.count(), 4, `expected 4 foot buttons @${width}/${theme}`);

  const tops = await buttons.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  const rowBands = new Set(tops.map((t) => Math.floor(t / 18)));
  assert.equal(rowBands.size, 1, `foot buttons wrapped (bands ${[...rowBands]}) @${width}/${theme}`);

  const sizes = await buttons.evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    }),
  );

  const footBox = await foot.boundingBox();
  assert.ok(footBox, `foot box missing @${width}/${theme}`);
  const expectFootH = width <= 320 ? 39 : 47;
  assert.ok(
    Math.abs(footBox.height - expectFootH) <= 1,
    `foot height ${footBox.height} expected ${expectFootH} @${width}/${theme}`,
  );

  const expectWidths = width <= 320 ? [97, 29, 32, 29] : [97, 32, 97, 32];
  const expectHeights = width <= 320 ? [31, 31, 32, 31] : [34, 34, 34, 34];
  sizes.forEach((s, i) => {
    assert.ok(
      Math.abs(s.w - expectWidths[i]) <= 1,
      `button[${i}] width ${s.w} expected ${expectWidths[i]} @${width}/${theme}`,
    );
    assert.ok(
      Math.abs(s.h - expectHeights[i]) <= 1,
      `button[${i}] height ${s.h} expected ${expectHeights[i]} @${width}/${theme}`,
    );
  });

  const groupGap = await foot.evaluate((el) => {
    const group = el.querySelector('[class*="rowActionsGroup"]');
    if (!group) return null;
    const style = getComputedStyle(group);
    const gap = style.columnGap || style.gap;
    return parseFloat(gap);
  });
  const expectGap = width <= 320 ? 1 : 3;
  assert.ok(groupGap !== null && Math.abs(groupGap - expectGap) <= 0.5, `rowActionsGroup gap ${groupGap} @${width}/${theme}`);

  const chevronVisible = await foot.locator("button").first().evaluate((btn) => {
    const svg = btn.querySelector("svg");
    if (!svg) return false;
    const r = svg.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right <= br.right + 0.5 && r.left >= br.left - 0.5;
  });
  assert.ok(chevronVisible, `conditions chevron clipped @${width}/${theme}`);

  const termsBtn = foot.locator("button").first();
  const termsPanel = page.locator('[data-testid="link-invite-terms-panel-inv-long"]');

  await termsBtn.click();
  await termsPanel.waitFor({ state: "visible", timeout: 5000 });
  assert.equal(await termsBtn.getAttribute("aria-expanded"), "true", `@${width}/${theme} open`);

  const toggleHit = await termsBtn.evaluate((btn) => {
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return top === btn || btn.contains(top);
  });
  assert.ok(toggleHit, `terms toggle intercepted @${width}/${theme}`);

  await termsBtn.click();
  await termsPanel.waitFor({ state: "detached", timeout: 5000 });
  assert.equal(await termsBtn.getAttribute("aria-expanded"), "false", `@${width}/${theme} close`);
}

await browser.close();
await server.close();
console.log("link-invite card foot layout regression: ok");