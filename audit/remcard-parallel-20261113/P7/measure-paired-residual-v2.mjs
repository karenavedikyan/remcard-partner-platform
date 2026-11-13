#!/usr/bin/env node
/**
 * P7 residual paired metrics: Manrope (frozen index.html chain), production globals,
 * minimal .content shell. Prototype 3dc31836 vs observer.module.css.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const SHA = "3dc31836cd18d9209c20097f18b906dd276f7af6";
const OUT = import.meta.dirname;
const WIDTHS = [320, 375, 768, 1024, 1440];
const THEMES = ["light", "dark"];
const SHORT_VIEWPORTS = [
  { width: 375, height: 568, label: "short-375x568" },
  { width: 1440, height: 650, label: "short-1440x650" },
];
const LONG_NAME =
  "Александра Константинопольская-Владимировна с очень длинной фамилией для проверки переноса";

const MANROPE =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" />';

function gitShow(file) {
  return execSync(`git show ${SHA}:design/general-prototype/partner/${file}`, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

const protoRoles = gitShow("roles.css");
const protoAppeals = gitShow("client-appeals.css");
const protoCareBtn = gitShow("care-services.css").match(/\.small-btn\{[^}]+\}/)?.[0] ?? "";
const productGlobals = readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
const productObserver = readFileSync(path.join(ROOT, "src/components/clients/observer/observer.module.css"), "utf8");

const protoBtnGhost = `.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;min-height:44px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:0.875rem;font-weight:700;font-family:var(--font-body)}
.btn.ghost{background:transparent;border-color:transparent}
.ca-section .btn.ghost{border:1px solid var(--line);background:var(--surface);color:var(--ink);font-weight:700}
${protoCareBtn}
.ca-personal-buckets .btn[aria-pressed=true],.ca-personal-layout .btn[aria-pressed=true]{border-color:var(--accent);color:var(--accent);background:var(--tint)}`;

function shell(inner, side) {
  if (side === "proto") {
    return `<main class="content" style="padding:32px;max-width:1200px;margin:auto;background:var(--bg)">
<section class="ca-section ca-section--observer">${inner}</section></main>`;
  }
  return `<main class="content" style="padding:32px;max-width:1200px;margin:auto;background:var(--bg)">
<div class="section">${inner}</div></main>`;
}

function protoHtml(theme) {
  const inner = `
<section class="ca-observer-tools"><div class="ca-personal-top"><div class="ca-personal-buckets">
<button type="button" class="btn ghost small-btn" data-testid="bucket-pressed" aria-pressed="true">Активные <span>2</span></button>
</div></div></section>
<article class="ca-observer-partner-card ca-personal-partners">
<div class="ca-observer-compact-top"><dl class="ca-observer-stats" data-testid="kpi"><div><dt>Всего</dt><dd>12</dd></div></dl></div>
<details class="ca-observer-disclosure" open><summary data-testid="disclosure-summary"><span class="ca-observer-toggle-label" data-testid="toggle-label">Клиенты</span></summary></details>
</article>
<div class="ca-personal-row ca-observer-card-client" data-testid="grouped-row">
<button type="button" class="ca-personal-open" data-testid="long-open"><strong>${LONG_NAME}</strong></button>
<div class="ca-personal-status"><span class="ca-observer-cell-label">Статус</span></div>
<div class="ca-observer-client-updated"><time>01.01</time></div>
</div>`;
  return `<!DOCTYPE html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8"/>${MANROPE}<style>
${protoRoles}
${protoAppeals}
${protoBtnGhost}
</style></head><body>${shell(inner, "proto")}</body></html>`;
}

function productHtml(theme) {
  const inner = `
<section class="personalTools"><div class="personalTop"><div class="personalBuckets">
<button type="button" class="bucketBtn" data-testid="bucket-pressed" aria-pressed="true">Активные <span>2</span></button>
</div></div></section>
<article class="partnerCard">
<div class="compactTop"><dl class="stats" data-testid="kpi"><div><dt>Всего</dt><dd>12</dd></div></dl></div>
<details class="disclosure" open><summary data-testid="disclosure-summary"><span class="toggleLabel" data-testid="toggle-label">Клиенты</span></summary></details>
</article>
<div class="personalRow personalRowGrouped" data-testid="grouped-row">
<button type="button" class="personalOpen" data-testid="long-open"><strong>${LONG_NAME}</strong></button>
<div class="personalStatus"><span class="cellLabel">Статус</span></div><div class="clientUpdated"><time>01.01</time></div>
</div>`;
  return `<!DOCTYPE html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8"/>${MANROPE}<style>
${productGlobals}
${productObserver}
</style></head><body>${shell(inner, "product")}</body></html>`;
}

async function waitFonts(page) {
  await page
    .waitForFunction(() => document.fonts && document.fonts.status === "loaded", { timeout: 15_000 })
    .catch(() => undefined);
}

function parseRgb(rgb) {
  const m = rgb?.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

function contrast(fg, bg) {
  const lum = ([r, g, b]) => {
    const c = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
  };
  const l1 = lum(fg);
  const l2 = lum(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

async function measurePage(page) {
  const bucket = await page.getByTestId("bucket-pressed").evaluate((el) => {
    const cs = getComputedStyle(el);
    const ff = cs.fontFamily;
    return {
      fontFamily: ff,
      fontSize: cs.fontSize,
      padding: cs.padding,
      minHeight: cs.minHeight,
      height: el.getBoundingClientRect().height,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
    };
  });
  const kpiDt = await page.getByTestId("kpi").locator("dt").evaluate((el) => getComputedStyle(el).fontSize);
  const kpiDd = await page.getByTestId("kpi").locator("dd").evaluate((el) => getComputedStyle(el).fontSize);
  const summary = await page.getByTestId("disclosure-summary").evaluate((el) => {
    const cs = getComputedStyle(el);
    return { fontSize: cs.fontSize, minHeight: cs.minHeight, height: el.getBoundingClientRect().height };
  });
  const toggle = await page.getByTestId("toggle-label").evaluate((el) => getComputedStyle(el).fontSize);
  const row = await page.getByTestId("grouped-row").evaluate((el) => ({
    gridTemplateColumns: getComputedStyle(el).gridTemplateColumns,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
  }));
  const longOpen = await page.getByTestId("long-open").evaluate((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      height: r.height,
      overflowWrap: cs.overflowWrap,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    };
  });
  const fg = parseRgb(bucket.color);
  const bg = parseRgb(bucket.backgroundColor);
  const bucketContrast = fg && bg ? contrast(fg, bg) : null;
  return { bucket, kpiDt, kpiDd, summary, toggle, row, longOpen, bucketContrast };
}

function delta(proto, product) {
  const mismatches = [];
  if (proto.bucket.fontSize !== product.bucket.fontSize) mismatches.push(`bucket.fontSize ${product.bucket.fontSize}≠${proto.bucket.fontSize}`);
  if (proto.bucket.padding !== product.bucket.padding) mismatches.push(`bucket.padding`);
  if (parseFloat(product.bucket.minHeight) < 44 || parseFloat(proto.bucket.minHeight) < 44) mismatches.push("bucket.minHeight<44");
  if (proto.summary.fontSize !== product.summary.fontSize) mismatches.push(`summary.fontSize`);
  if (proto.toggle !== product.toggle) mismatches.push(`toggle ${product.toggle}≠${proto.toggle}`);
  if (proto.kpiDd !== product.kpiDd) mismatches.push("kpi.dd");
  if (!product.bucket.fontFamily.toLowerCase().includes("manrope")) mismatches.push("fontFamily:not-manrope");
  if (parseFloat(product.bucket.height) < 44) mismatches.push("bucket.height<44");
  if (product.bucketContrast !== null && product.bucketContrast < 4.5) mismatches.push(`contrast ${product.bucketContrast}`);
  if (product.longOpen.scrollWidth > product.longOpen.clientWidth + 1) mismatches.push("long-open horizontal overflow");
  return mismatches;
}

async function main() {
  mkdirSync(path.join(OUT, "screenshots-residual-v2"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const samples = [];
  const summaryRows = [];

  async function runSide(vp, theme, side) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await page.setContent(side === "proto" ? protoHtml(theme) : productHtml(theme), {
      waitUntil: "domcontentloaded",
    });
    await waitFonts(page);
    const m = await measurePage(page);
    const entry = {
      viewport: vp.label || String(vp.width),
      width: vp.width,
      height: vp.height,
      theme,
      side,
      manropeResolved: m.bucket.fontFamily,
      ...m,
    };
    samples.push(entry);
    const shot = `${vp.label || vp.width}-${theme}-${side}.png`;
    await page.screenshot({ path: path.join(OUT, "screenshots-residual-v2", shot) });
    await context.close();
    return entry;
  }

  for (const theme of THEMES) {
    for (const w of WIDTHS) {
      const vp = { width: w, height: 900, label: `${w}` };
      const proto = await runSide(vp, theme, "proto");
      const product = await runSide(vp, theme, "product");
      summaryRows.push({
        viewport: `${w}×900`,
        theme,
        mismatches: delta(proto, product),
        productContrast: product.bucketContrast,
        protoBucketBg: proto.bucket.backgroundColor,
        productBucketBg: product.bucket.backgroundColor,
      });
    }
    for (const vp of SHORT_VIEWPORTS) {
      const proto = await runSide(vp, theme, "proto");
      const product = await runSide(vp, theme, "product");
      summaryRows.push({
        viewport: vp.label,
        theme,
        mismatches: delta(proto, product),
        productContrast: product.bucketContrast,
      });
    }
  }

  await browser.close();
  const tip = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
  const out = {
    prototypeSha: SHA,
    productTip: tip,
    harness: "Manrope + globals + content shell; partial not full Next",
    fullShell: "OPEN",
    samples,
    summaryRows,
  };
  writeFileSync(path.join(OUT, "paired-residual-v2.json"), JSON.stringify(out, null, 2));
  const failing = summaryRows.filter((r) => r.mismatches.length > 0 || (r.productContrast != null && r.productContrast < 4.5));
  console.log("samples", samples.length, "failing viewports", failing.length);
  writeFileSync(path.join(OUT, "paired-residual-v2-summary.txt"), JSON.stringify(failing, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
