/**
 * PROF p149 filter grid — computed box QA @ 320px light.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import path from "node:path";

const OUT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });

const CSS = await (await import("node:fs/promises")).readFile(
  new URL("../src/components/clients/receiving/receiving.module.css", import.meta.url),
  "utf8",
);

const fixture = (primaryHtml) => `<!DOCTYPE html>
<html lang="ru" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>prof qa</title>
  <style>
    :root {
      --font-body: system-ui, sans-serif;
      --primary: #bb3035;
      --green: #30684c;
      --line: #e2e8f0;
      --surface: #fff;
      --offset: #f8fafc;
      --muted: #64748b;
      --ink: #0f172a;
      --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 20px;
      --text-sm: 0.875rem; --text-base: 1rem;
    }
    body { margin: 0; background: var(--offset); font-family: var(--font-body); color: var(--ink); }
    ${CSS}
  </style>
</head>
<body>
  <div class="clientsScope" style="padding: 16px; max-width: 100%;">
    <section class="ca-section prof-appeals-wrap">
      <div class="filters panel prof-filters">
        <div class="prof-filters-primary">${primaryHtml}</div>
        <div class="prof-filters-secondary">
          <label class="remcard-filter"><input type="checkbox" /> Только клиенты с RemCard <span class="remcard-filter-count">1</span></label>
          <div class="prof-filter-actions"><button type="button" class="btn ghost">Источники</button><button type="button" class="btn ghost">Поля партнёра</button></div>
        </div>
      </div>
      <div class="prof-list-head-row"><h1 class="prof-list-heading">Обращения <span class="pill muted">18</span></h1></div>
      <div class="prof-table-wrap">
        <div class="prof-table-row prof-table-row--sample">
          <span class="check pick"></span>
          <button type="button" class="prof-name-cell"><strong class="prof-name-title">Отделка прихожей</strong><small class="prof-name-sub muted">Анна П. · № 2408</small></button>
          <span class="prof-row-status appeal-status pill is-new">Новое обращение</span>
          <span class="prof-row-request muted small">Межкомнатные двери, 4 шт.</span>
          <span class="certificate-cell">—</span><span class="one-c-cell">—</span>
          <span class="row-source">Звонок</span><span>Мария</span>
          <span class="prof-row-account small">✓ Есть в RemCard</span>
          <button type="button" class="row-action btn ghost icon">›</button>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`;

async function audit(page, label) {
  const result = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom), right: Math.round(r.right) };
    };
    const request = pick(".prof-filter-request");
    const source = pick("#source-filter");
    const status = pick(".prof-filter-status");
    const statusPill = pick(".prof-row-status");
    const requestCell = pick(".prof-row-request");
    const account = pick(".prof-row-account");
    const filtersOneLine =
      request && source && status && Math.abs(request.top - source.top) <= 2 && Math.abs(request.top - status.top) <= 2;
    const statusNotOnRequest =
      statusPill && requestCell && (statusPill.right <= requestCell.left - 4 || statusPill.bottom <= requestCell.top);
    return { request, source, status, statusPill, requestCell, account, filtersOneLine, statusNotOnRequest };
  });
  const screenshotPath = path.join(OUT, `prof-p149-${label}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return { ...result, screenshotPath };
}

async function main() {
  const browser = await chromium.launch();
  const primary = `
    <label class="field searchbox search-inner prof-filter-search">Поиск <input type="search" /></label>
    <label class="field prof-filter-request">Запрос <select><option>Все</option></select></label>
    <label class="field prof-filter-status">Статус <select><option>Все статусы</option></select></label>
    <label class="field prof-filter-source" id="source-filter">Источник <select><option>Все</option></select></label>`;
  const viewports = [
    { width: 320, label: "320-light" },
    { width: 1440, label: "1440-light" },
  ];
  const reports = [];
  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: 900 } });
    await page.setContent(fixture(primary), { waitUntil: "networkidle" });
    reports.push({ viewport: vp.label, ...(await audit(page, vp.label)) });
    await page.close();
  }
  const fail = reports.some((r) => {
    if (r.viewport === "1440-light") return !r.filtersOneLine || r.statusNotOnRequest === false;
    if (r.viewport === "320-light") {
      return r.request && r.source && r.source.top < r.request.bottom - 2;
    }
    return false;
  });
  console.log(JSON.stringify(reports, null, 2));
  if (fail) process.exitCode = 1;
  await browser.close();
}

main();