#!/usr/bin/env node
/**
 * P7 synthetic paired harness: prototype CSS (3dc31836) vs product observer.module.css @ tip 9280f9e7.
 * Injects production globals.css on product side only. No network, no Next build.
 */
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "../../..");
const SHA = "3dc31836cd18d9209c20097f18b906dd276f7af6";
const OUT = import.meta.dirname;
const WIDTHS = [320, 375, 768, 1440];
const THEMES = ["light", "dark"];

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

const protoBtnGhost = `.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;min-height:44px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:0.875rem;font-weight:700}
.btn.ghost{background:transparent;border-color:transparent}
.ca-section .btn.ghost{border:1px solid var(--line);background:var(--surface);color:var(--ink);font-weight:700}
${protoCareBtn}`;

function protoHtml(theme) {
  return `<!DOCTYPE html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8"/><style>
${protoRoles}
${protoAppeals}
${protoBtnGhost}
body{margin:16px;font-family:Manrope,system-ui,sans-serif}
</style></head><body>
<section class="ca-observer-tools" data-side="proto">
  <div class="ca-personal-top">
    <div class="ca-personal-buckets">
      <button type="button" class="btn ghost small-btn" data-testid="bucket-pressed" aria-pressed="true">Активные <span>2</span></button>
    </div>
  </div>
</section>
<article class="ca-observer-partner-card ca-personal-partners">
  <div class="ca-observer-compact-top">
    <dl class="ca-observer-stats" data-testid="kpi"><div><dt>Всего</dt><dd>12</dd></div></dl>
  </div>
  <details class="ca-observer-disclosure" open><summary data-testid="disclosure-summary"><span class="ca-observer-toggle-label">Клиенты</span></summary></details>
</article>
<div class="ca-personal-row ca-observer-card-client" data-testid="grouped-row"><div class="ca-personal-status"><span class="ca-observer-cell-label">Статус</span></div><div class="ca-observer-client-updated"><time>01.01</time></div></div>
</body></html>`;
}

function productHtml(theme) {
  return `<!DOCTYPE html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8"/><style>
${productGlobals}
${productObserver}
body{margin:16px}
</style></head><body>
<section class="personalTools">
  <div class="personalTop"><div class="personalBuckets">
    <button type="button" class="bucketBtn" data-testid="bucket-pressed" aria-pressed="true">Активные <span>2</span></button>
  </div></div>
</section>
<article class="partnerCard">
  <div class="compactTop"><dl class="stats" data-testid="kpi"><div><dt>Всего</dt><dd>12</dd></div></dl></div>
  <details class="disclosure" open><summary data-testid="disclosure-summary"><span class="toggleLabel">Клиенты</span></summary></details>
</article>
<div class="personalRow personalRowGrouped" data-testid="grouped-row"><div class="personalStatus"><span class="cellLabel">Статус</span></div><div class="clientUpdated"><time>01.01</time></div></div>
</body></html>`;
}

async function sample(page, testId) {
  const el = page.getByTestId(testId);
  return el.evaluate((node) => {
    const cs = getComputedStyle(node);
    const r = node.getBoundingClientRect();
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      padding: cs.padding,
      minHeight: cs.minHeight,
      gridTemplateColumns: cs.gridTemplateColumns,
      outlineWidth: cs.outlineWidth,
      outlineOffset: cs.outlineOffset,
      height: r.height,
      width: r.width,
    };
  });
}

async function main() {
  mkdirSync(path.join(OUT, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const computed = [];

  for (const theme of THEMES) {
    for (const w of WIDTHS) {
      const label = `${theme}-${w}`;
      for (const side of ["proto", "product"]) {
        const context = await browser.newContext({ viewport: { width: w, height: 900 } });
        const page = await context.newPage();
        await page.setContent(side === "proto" ? protoHtml(theme) : productHtml(theme), {
          waitUntil: "domcontentloaded",
        });
        const bucket = await sample(page, "bucket-pressed");
        const kpi = await page.getByTestId("kpi").locator("dd").evaluate((el) => {
          const cs = getComputedStyle(el);
          return { fontSize: cs.fontSize, lineHeight: cs.lineHeight, color: cs.color };
        });
        const summary = await sample(page, "disclosure-summary");
        const row = await sample(page, "grouped-row");
        computed.push({ theme, width: w, side, bucket, kpi, summary, row });
        await page.screenshot({
          path: path.join(OUT, "screenshots", `${label}-${side}.png`),
          fullPage: false,
        });
        await context.close();
      }
    }
  }
  await browser.close();
  writeFileSync(path.join(OUT, "paired-computed.json"), JSON.stringify({ sha: SHA, tip: "9280f9e7", computed }, null, 2));
  console.log("Wrote paired-computed.json and", computed.length, "screenshots");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
