#!/usr/bin/env node
/**
 * ProfileDirectionsPicker contrast + chip removal on /profile/dev-fixture (dev server only).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const BASE = process.env.PROF_DIRECTIONS_BASE_URL ?? "http://127.0.0.1:3022";
const OUT =
  process.env.PROF_DIRECTIONS_ARTIFACT_DIR ??
  "/opt/cursor/artifacts/prof-profile-directions-contrast";

const LONG_SERVICE_LABEL =
  "Монтаж и сервисное обслуживание входных дверей премиум-класса с выездом";

function contrastRatio(fgHex, bgHex) {
  const lum = (hex) => {
    const n = Number.parseInt(hex.replace("#", ""), 16);
    const ch = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  };
  const parse = (h) => {
    const m = h.match(/^#([0-9a-f]{6})$/i);
    if (!m) throw new Error(`bad hex ${h}`);
    return `#${m[1].toLowerCase()}`;
  };
  const l1 = lum(parse(fgHex));
  const l2 = lum(parse(bgHex));
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseRgb(css) {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const hex = (n) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("remcard-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

async function mockTaxonomy(context) {
  await context.route("**/api/pro/partner-taxonomy**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        products: [{ kind: "product", id: "doors", label: "Двери" }],
        services: [
          { kind: "service", id: "plumbing", label: "Сантехника" },
          {
            kind: "service",
            id: "doors-premium",
            label: LONG_SERVICE_LABEL,
          },
        ],
        stages: [{ kind: "stage", id: "L1-7", label: "⚡ Инженерия" }],
      }),
    });
  });
}

async function readChipContrast(page) {
  const chip = page.getByRole("button", { name: /Убрать Товар: Двери/i });
  await chip.waitFor({ state: "visible", timeout: 30_000 });
  const styles = await chip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, backgroundColor: s.backgroundColor };
  });
  const fg = parseRgb(styles.color);
  const bg = parseRgb(styles.backgroundColor);
  if (!fg || !bg) throw new Error(`chip colors: ${JSON.stringify(styles)}`);
  return { fg, bg, ratio: contrastRatio(fg, bg) };
}

async function readLeadContrast(page) {
  const lead = page.getByText(/Выберите товары, которые продаёте/i);
  await lead.waitFor({ state: "visible" });
  const styles = await lead.evaluate((el) => {
    const s = getComputedStyle(el);
    let node = el.parentElement;
    let bgColor = s.backgroundColor;
    while (node && (bgColor === "rgba(0, 0, 0, 0)" || bgColor === "transparent")) {
      bgColor = getComputedStyle(node).backgroundColor;
      node = node.parentElement;
    }
    return { color: s.color, backgroundColor: bgColor };
  });
  const fg = parseRgb(styles.color);
  const bg = parseRgb(styles.backgroundColor);
  if (!fg || !bg) throw new Error(`lead colors: ${JSON.stringify(styles)}`);
  return { fg, bg, ratio: contrastRatio(fg, bg) };
}

async function overflowMetrics(page) {
  return page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await mockTaxonomy(context);
  const page = await context.newPage();

  const results = { sections: {}, removal: null, exitCode: 0 };

  for (const theme of ["light", "dark"]) {
    for (const vp of [
      { name: "1440", width: 1440, height: 900 },
      { name: "390", width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(`${BASE}/profile/dev-fixture?section=basics`, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
      await setTheme(page, theme);
      await page.reload({ waitUntil: "networkidle" });

      const chip = await readChipContrast(page);
      const lead = await readLeadContrast(page);
      const metrics = await overflowMetrics(page);
      const key = `basics-${theme}-${vp.name}`;
      results.sections[key] = { chip, lead, metrics };

      if (chip.ratio < 4.5 || lead.ratio < 4.5) {
        results.exitCode = 1;
        console.error(`contrast fail ${key}`, { chip, lead });
      }
      if (metrics.overflow) {
        results.exitCode = 1;
        console.error(`overflow ${key}`, metrics);
      }

      await page.screenshot({
        path: path.join(OUT, `profile-directions-basics-${theme}-${vp.name}.png`),
        fullPage: true,
      });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/profile/dev-fixture?section=catalog&moderation=1`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await setTheme(page, "dark");
  await page.reload({ waitUntil: "networkidle" });
  const prepareBtn = page.getByRole("button", { name: /Подготовить профиль к публикации/i });
  if (await prepareBtn.isVisible().catch(() => false)) {
    await prepareBtn.click();
  }
  await page.getByRole("heading", { name: /Товары и услуги/i }).scrollIntoViewIfNeeded();
  const copyBtn = page.getByRole("button", {
    name: /Перенести направления из рабочего профиля/i,
  });
  if (await copyBtn.isVisible().catch(() => false)) {
    await copyBtn.click();
  } else {
    await page.getByRole("checkbox", { name: /^Двери$/i }).check();
  }
  const catalogChip = await readChipContrast(page);
  results.sections["catalog-dark-390"] = { chip: catalogChip, metrics: await overflowMetrics(page) };
  if (catalogChip.ratio < 4.5) results.exitCode = 1;
  await page.screenshot({
    path: path.join(OUT, "profile-directions-catalog-dark-390.png"),
    fullPage: true,
  });

  await page.goto(`${BASE}/profile/dev-fixture?section=basics`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await setTheme(page, "dark");
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByRole("checkbox", { name: new RegExp(LONG_SERVICE_LABEL.slice(0, 40)) })
    .check();
  const longChip = page.getByRole("button", {
    name: new RegExp(`Убрать Услуга: ${LONG_SERVICE_LABEL.slice(0, 30)}`),
  });
  await longChip.waitFor({ state: "visible" });
  results.longLabel = await overflowMetrics(page);
  await page.screenshot({
    path: path.join(OUT, "profile-directions-long-label-dark-390.png"),
    fullPage: true,
  });

  await setTheme(page, "light");
  await page.reload({ waitUntil: "networkidle" });
  const before = await page
    .locator("ul[aria-label='Выбранные направления'] button")
    .count();
  await page.getByRole("button", { name: /Убрать Товар: Двери/i }).click();
  const after = await page.locator("ul[aria-label='Выбранные направления'] button").count();
  results.removal = { before, after };
  if (after !== before - 1) {
    results.exitCode = 1;
    console.error("chip removal failed", results.removal);
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  process.exit(results.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
