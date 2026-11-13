#!/usr/bin/env node
/**
 * Prototype baseline capture for compact observer partner cards (etalon 3dc31836).
 * Uses real prototype CSS via `git show`. No product edits. No network to remcard.ru.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PROTO = "3dc31836cd18d9209c20097f18b906dd276f7af6";
const OUT = path.join(ROOT, "audit/clients-parity-20261113/prototype-baseline");

const VIEWPORTS = [
  { name: "1440x1000", width: 1440, height: 1000 },
  { name: "1024x900", width: 1024, height: 900 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "375x812", width: 375, height: 812 },
  { name: "360x800", width: 360, height: 800 },
  { name: "320x740", width: 320, height: 740 },
];

const ROLE_PAGES = [
  { page: 79, role: "specialist", nested: 86 },
  { page: 88, role: "store", nested: 95 },
  { page: 97, role: "company", nested: 104 },
  { page: 106, role: "agent", nested: 113 },
  { page: 115, role: "employee", nested: 122 },
];

function gitShow(file) {
  return execFileSync("git", ["show", `${PROTO}:${file}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

function fixtureHtml(cssBundle, theme) {
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
:root {
  --ink:#1d1d1f; --muted:#5a6068; --line:#d7d2cc; --surface:#fff; --offset:#f6f5f3;
  --soft:#fbfaf8; --brand:#b52a2e; --accent:#b52a2e; --tint:#f8ecec; --good:#116f34;
  --text-xs:.75rem; --text-sm:.875rem; --text-base:1rem; --text-lg:1.125rem;
  --s2:8px; --s3:12px; --s4:16px; --s5:20px; --radius:16px;
  font-family: Manrope, system-ui, sans-serif;
}
[data-theme=dark] {
  --ink:#f3f4f6; --muted:#b8c0ca; --line:#3a3f46; --surface:#1c1f24; --offset:#15181c;
  --soft:#12151a; --tint:#2a1c1d; color-scheme: dark;
}
body { margin:0; background:var(--offset); color:var(--ink); }
.content { max-width:1120px; margin:0 auto; padding:20px; }
.btn { min-height:44px; border-radius:10px; border:1px solid var(--line); background:var(--surface); padding:10px 14px; font:inherit; }
.btn.ghost { background:transparent; }
.btn.small-btn { font-size:12px; }
.pill { display:inline-block; padding:4px 8px; border-radius:999px; border:1px solid var(--line); font-size:12px; }
.small { font-size:12px; }
.muted { color:var(--muted); }
${cssBundle}
</style>
</head>
<body>
<main class="content ca-section ca-section--observer" data-testid="prototype-observer-fixture">
  <header class="page-header">
    <p class="eyebrow">Кабинет · Клиенты</p>
    <h1>Мои клиенты у партнёров</h1>
    <p class="small muted">Синтетический эталон компактных карточек (3dc31836).</p>
  </header>
  <section class="ca-observer-tools" data-testid="ca-observer-personal-tools" aria-label="Управление своим списком">
    <div class="ca-personal-top">
      <div class="ca-personal-buckets" role="group" aria-label="Ваш список">
        <button type="button" class="btn ghost small-btn" data-observer-action="bucket:active" aria-pressed="true">Активные <span>3</span></button>
        <button type="button" class="btn ghost small-btn" data-observer-action="bucket:archived" aria-pressed="false">Архив <span>0</span></button>
        <button type="button" class="btn ghost small-btn" data-observer-action="bucket:trash" aria-pressed="false">Корзина <span>0</span></button>
      </div>
      <div class="ca-personal-layout" role="group" aria-label="Вид списка">
        <button type="button" class="btn ghost small-btn" data-observer-action="layout:partners" aria-pressed="true">По партнёрам</button>
        <button type="button" class="btn ghost small-btn" data-observer-action="layout:list" aria-pressed="false">Списком</button>
      </div>
    </div>
    <p class="small muted ca-personal-scope">Личные списки и заметки не меняют данные партнёров. Демо: изменения до обновления страницы.</p>
  </section>
  <div class="ca-observer-partner-grid ca-personal-partners" data-testid="ca-observer-partners-list">
    <article class="ca-observer-partner-card" data-testid="ca-observer-partner-card" data-observer-bucket="active">
      <div class="ca-observer-compact-top">
        <div class="ca-observer-partner-card__head">
          <strong>Дом материалов <span class="ca-observer-partner-arrow" aria-hidden="true">→</span></strong>
          <span class="ca-observer-partner-category">Напольные покрытия · Москва</span>
        </div>
        <dl class="ca-observer-stats" aria-label="Показатели видимых клиентов">
          <div><dt>Направлено</dt><dd>3</dd></div>
          <div><dt>В работе</dt><dd>1</dd></div>
          <div><dt>С оплатой</dt><dd>1</dd></div>
          <div><dt>Отказы</dt><dd>1</dd></div>
        </dl>
      </div>
      <details class="ca-observer-disclosure" data-observer-partner-details="p-dom">
        <summary>
          <span class="ca-observer-compact-meta">
            <span>Конверсия в оплату <strong>33%</strong></span>
            <span>Возвраты <strong>0</strong></span>
            <span class="ca-observer-compact-updated">Обновлено <time datetime="2026-11-10T12:00:00Z">10 нояб. 2026 г., 15:00</time></span>
          </span>
          <span class="ca-observer-toggle-label">Клиенты <b>3</b> <span class="ca-observer-show">Показать</span><span class="ca-observer-hide">Скрыть</span> <span class="ca-observer-chevron" aria-hidden="true">▾</span></span>
        </summary>
        <div class="ca-observer-expanded-clients">
          <div class="ca-personal-row ca-observer-card-client" data-personal-row="a1">
            <label class="ca-personal-check"><input type="checkbox" data-observer-id="a1" aria-label="Выбрать: Анна"/></label>
            <button type="button" class="ca-personal-open" data-testid="ca-observer-client-row">
              <strong>Анна</strong>
              <span class="small muted">Двери · RC-QA-001</span>
              <span class="ca-personal-tag">Моя метка: связаться</span>
            </button>
            <div class="ca-personal-status"><span class="ca-observer-cell-label">Статус у партнёра</span><span class="pill">В работе</span></div>
            <div class="ca-observer-client-updated"><span class="ca-observer-cell-label">Обновлено</span><time>10 нояб. 2026 г.</time></div>
            <button type="button" class="btn ghost small-btn" data-observer-action="edit:a1">Изменить для себя</button>
          </div>
        </div>
      </details>
    </article>
    <article class="ca-observer-partner-card" data-testid="ca-observer-partner-card">
      <div class="ca-observer-compact-top">
        <div class="ca-observer-partner-card__head">
          <strong>Мастер Бета <span class="ca-observer-partner-arrow" aria-hidden="true">→</span></strong>
          <span class="ca-observer-partner-category">Установка · Санкт-Петербург</span>
        </div>
        <dl class="ca-observer-stats" aria-label="Показатели видимых клиентов">
          <div><dt>Направлено</dt><dd>2</dd></div>
          <div><dt>В работе</dt><dd>2</dd></div>
          <div><dt>С оплатой</dt><dd>0</dd></div>
          <div><dt>Отказы</dt><dd>0</dd></div>
        </dl>
      </div>
      <details class="ca-observer-disclosure">
        <summary>
          <span class="ca-observer-compact-meta">
            <span>Конверсия в оплату <strong>0%</strong></span>
            <span>Возвраты <strong>0</strong></span>
            <span>Обновлено <time>9 нояб. 2026 г., 11:20</time></span>
          </span>
          <span class="ca-observer-toggle-label">Клиенты <b>2</b> <span class="ca-observer-show">Показать</span><span class="ca-observer-hide">Скрыть</span></span>
        </summary>
        <div class="ca-observer-expanded-clients"><p class="small muted">Свернуто по умолчанию.</p></div>
      </details>
    </article>
  </div>
</main>
</body>
</html>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const ca = gitShow("design/general-prototype/partner/client-appeals.css");
  const roles = gitShow("design/general-prototype/partner/roles.css");
  const cssBundle = `${roles}\n${ca}`;
  writeFileSync(path.join(OUT, "css-bundle.css"), cssBundle);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.WALLET_QA_CHROME || process.env.CHROME_BIN || undefined,
  });

  const measurements = [];
  const errors = [];

  try {
    for (const theme of ["light", "dark"]) {
      const htmlPath = path.join(OUT, `fixture-${theme}.html`);
      writeFileSync(htmlPath, fixtureHtml(cssBundle, theme));
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
        });
        await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
        // Wait fonts
        await page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        });
        const card = page.locator('[data-testid="ca-observer-partner-card"]').first();
        const box = await card.boundingBox();
        const styles = await card.evaluate((el) => {
          const cs = getComputedStyle(el);
          const strong = el.querySelector(".ca-observer-partner-card__head strong");
          const scs = strong ? getComputedStyle(strong) : null;
          const stats = el.querySelector(".ca-observer-stats");
          const statsCs = stats ? getComputedStyle(stats) : null;
          return {
            card: {
              width: cs.width,
              height: cs.height,
              padding: cs.padding,
              borderRadius: cs.borderRadius,
              fontFamily: cs.fontFamily,
              gap: cs.gap,
            },
            title: scs
              ? {
                  fontSize: scs.fontSize,
                  fontWeight: scs.fontWeight,
                  lineHeight: scs.lineHeight,
                  letterSpacing: scs.letterSpacing,
                }
              : null,
            statsGrid: statsCs ? statsCs.gridTemplateColumns : null,
          };
        });
        const shotName = `observer-compact-${theme}-${vp.name}.png`;
        await page.screenshot({
          path: path.join(OUT, shotName),
          fullPage: true,
        });
        measurements.push({
          theme,
          viewport: vp,
          rolePagesCovered: ROLE_PAGES,
          cardBoundingBox: box,
          computed: styles,
          screenshot: shotName,
        });
        await page.close();
      }
    }
  } catch (e) {
    errors.push(String(e));
  } finally {
    await browser.close();
  }

  const report = {
    prototypeSha: PROTO,
    outDir: OUT,
    viewports: VIEWPORTS,
    rolePages: ROLE_PAGES,
    note:
      "Baseline uses synthetic markup + exact prototype CSS. Full roles.html SPA not booted (requires prototype runtime). Same compact-card CSS rules apply across roles 79/88/97/106/115 and nested partner pages.",
    measurements,
    errors,
    ok: errors.length === 0 && measurements.length === VIEWPORTS.length * 2,
  };
  writeFileSync(path.join(OUT, "computed-style-baseline.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.ok, shots: measurements.length, errors }, null, 2));
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
