#!/usr/bin/env node
/**
 * Dev-only UI smoke: partners tabs + theme toggle (light/dark, 1440 & 390).
 * Requires NODE_ENV=development server (dev-fixture routes).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
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

const BASE = process.env.CONTRAST_SMOKE_URL ?? "http://127.0.0.1:3002";
const OUT = process.env.CONTRAST_ARTIFACTS_DIR ?? "/opt/cursor/artifacts/contrast-smoke";

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

async function checkTabActiveContrast(page) {
  const tab = page.getByRole("tab", { name: /Мои партнёры/ });
  await tab.waitFor({ state: "visible", timeout: 15000 });
  const styles = await tab.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, backgroundColor: s.backgroundColor };
  });
  const fg = parseRgb(styles.color);
  const bg = parseRgb(styles.backgroundColor);
  if (!fg || !bg) throw new Error(`Could not parse tab colors: ${JSON.stringify(styles)}`);
  const ratio = contrastRatio(fg, bg);
  if (ratio < 4.5) {
    throw new Error(`Tab active contrast ${ratio.toFixed(2)}:1 (${fg} on ${bg})`);
  }
  return ratio;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const viewports = [
    { name: "1440", width: 1440, height: 900 },
    { name: "390", width: 390, height: 844 },
  ];

  for (const theme of ["light", "dark"]) {
    for (const vp of viewports) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      await page.goto(`${BASE}/partners/dev-fixture`, { waitUntil: "networkidle" });
      await setTheme(page, theme);
      await page.reload({ waitUntil: "networkidle" });
      const ratio = await checkTabActiveContrast(page);
      await page.screenshot({ path: `${OUT}/partners-tabs-${theme}-${vp.name}.png`, fullPage: false });
      console.log(`OK partners tab ${theme} ${vp.name}: contrast ${ratio.toFixed(2)}:1`);
      await page.close();
    }
  }

  for (const theme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${BASE}/partners/dev-fixture`, { waitUntil: "networkidle" });
    await setTheme(page, theme);
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("tab", { name: "Пригласить по ссылке" }).click();
    const inviteBtn = page.getByRole("button", { name: "Создать ссылку" });
    await inviteBtn.waitFor({ state: "visible", timeout: 15000 });
    const btnStyles = await inviteBtn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, backgroundColor: s.backgroundColor };
    });
    const btnFg = parseRgb(btnStyles.color);
    const btnBg = parseRgb(btnStyles.backgroundColor);
    if (!btnFg || !btnBg) throw new Error(`Could not parse primary button: ${JSON.stringify(btnStyles)}`);
    const ratio = contrastRatio(btnFg, btnBg);
    if (ratio < 4.5) throw new Error(`Primary button ${ratio.toFixed(2)}:1 (${btnFg} on ${btnBg})`);
    console.log(`OK partners primary ${theme}: contrast ${ratio.toFixed(2)}:1`);
    await page.screenshot({ path: `${OUT}/partners-primary-${theme}-1440.png`, fullPage: false });
    await page.close();
  }

  await browser.close();
  console.log("[contrast-theme-smoke] PASS");
}

main().catch((err) => {
  console.error("[contrast-theme-smoke]", err.message || err);
  process.exitCode = 1;
});
