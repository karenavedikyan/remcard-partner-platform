#!/usr/bin/env node
/**
 * Writes browser-computed KPI grid column counts for auditor replay (V5 cascade fix).
 * Uses raw observer.module.css class names (.partnerCard .stats) — same rules as CSS module source.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const cssPath = path.join(repoRoot, "src/components/clients/observer/observer.module.css");
const outDir = path.join(repoRoot, "src/lib/clients-parity/audit");
const outPath = path.join(outDir, "stats-grid-computed.json");

const WIDTHS = [1440, 1024, 768, 375, 360, 320];
const THEMES = ["light", "dark"];

function expectedColumns(innerWidth) {
  return innerWidth <= 360 ? 2 : 4;
}

function parseColumns(gridTemplateColumns) {
  const trimmed = String(gridTemplateColumns).trim();
  const repeat = trimmed.match(/repeat\(\s*(\d+)/);
  if (repeat) return Number.parseInt(repeat[1], 10);
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function buildHtml(css, theme) {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" />
<style>
body { margin: 16px; font-family: Manrope, sans-serif; }
${css}
</style>
</head>
<body>
<article class="partnerCard"><dl class="stats">
<div><dt>a</dt><dd>1</dd></div><div><dt>b</dt><dd>2</dd></div>
<div><dt>c</dt><dd>3</dd></div><div><dt>d</dt><dd>4</dd></div>
</dl></article>
</body></html>`;
}

function gitSha() {
  return execSync("git rev-parse HEAD", { cwd: repoRoot, encoding: "utf8" }).trim();
}

const css = fs.readFileSync(cssPath, "utf8");
const browser = await chromium.launch();
const records = [];
let allPass = true;

for (const theme of THEMES) {
  for (const innerWidth of WIDTHS) {
    const context = await browser.newContext({ viewport: { width: innerWidth, height: 720 } });
    const page = await context.newPage();
    await page.setContent(buildHtml(css, theme));
    const gridTemplateColumns = await page.locator("dl.stats").evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    const columnCount = parseColumns(gridTemplateColumns);
    const expected = expectedColumns(innerWidth);
    const pass = columnCount === expected;
    if (!pass) allPass = false;
    records.push({
      theme,
      innerWidth,
      expectedColumnCount: expected,
      columnCount,
      gridTemplateColumns,
      pass,
    });
    await context.close();
  }
}

await browser.close();

fs.mkdirSync(outDir, { recursive: true });
const payload = {
  measuredAt: new Date().toISOString(),
  candidateSha: gitSha(),
  prototypeReferenceSha: "3dc31836cd18d9209c20097f18b906dd276f7af6",
  cssSource: "src/components/clients/observer/observer.module.css",
  selector: ".partnerCard .stats",
  records,
  allPass,
};
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${outPath} (allPass=${allPass})`);
process.exit(allPass ? 0 : 1);
