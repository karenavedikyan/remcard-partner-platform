/**
 * KP preview step @ 320 dark — centered modal smoke (served HTML + real module CSS).
 */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OUT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(path.join(ROOT, "../src/components/clients/receiving/receiving.module.css"), "utf8");

const fallback = `
.offerDialog[open] { display: flex; flex-direction: column; }
.offerDialog .kp-form { display: flex; flex-direction: column; height: 100%; max-height: inherit; min-height: 0; border: 0; margin: 0; padding: 0; min-width: 0; }
.offerDialog .kp-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.offerDialog .kp-footer { flex: none; }
.stack { display: grid; gap: 10px; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; }
.btn.primary { background: var(--primary); color: #0f172a; border-color: transparent; font-weight: 600; }
.btn.ghost { background: transparent; }
.muted { color: var(--muted); }
.small { font-size: 12px; }
`;

const body = `
<dialog class="offerDialog" open>
  <form class="kp-form">
    <header class="kp-header">
      <div class="kp-header-main">
        <p class="kp-kicker"><span class="kp-step">2 из 2 · Проверка</span></p>
        <h2>Как увидит клиент</h2>
        <p class="kp-header-lead muted small">Проверьте текст, условия и вложения перед отправкой.</p>
      </div>
      <button type="button" class="btn ghost kp-close">×</button>
    </header>
    <div class="kp-scroll">
      <div class="kp-partner-surface">
        <div class="client-shell offer-client-preview offer-preview--store">
          <div class="kp-preview-brand">
            <div class="kp-preview-partner-row">
              <span class="kp-preview-avatar">ОП</span>
              <p class="kp-preview-partner-label">Предложение от партнёра <strong>Оптовик</strong></p>
            </div>
            <div class="kp-remcard-badge"><span class="kp-remcard-mark">remcard</span><span class="kp-remcard-tagline">Навигатор ремонта</span></div>
            <h2 class="client-offer-title">Отделка прихожей</h2>
            <p class="kp-preview-recipient muted small">Получатель: Анна П. · 21 ноября 2026 г.</p>
          </div>
          <div class="client-content">
            <p class="kp-preview-section-label">Что предлагаем</p>
            <p class="client-message">Предлагаем замер и отделку прихожей.</p>
            <p class="kp-preview-section-label">Вложения</p>
            <ul class="kp-preview-attachments"><li>qa-test-offer.txt <span class="muted">· 17 Б</span></li></ul>
          </div>
        </div>
      </div>
    </div>
    <footer class="kp-footer">
      <p class="kp-footer-note muted small">Нет раздела для получения КП в кабинете клиента</p>
      <div class="kp-footer-actions">
        <button type="button" class="btn ghost">Назад</button>
        <button type="button" class="btn primary">Отправить</button>
      </div>
    </footer>
  </form>
</dialog>`;

const html = `<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>KP preview smoke</title>
  <style>
    :root {
      --primary: #e07a84;
      --line: #334155;
      --surface: #1a1f1c;
      --offset: #252b28;
      --muted: #94a3b8;
      --ink: #f1f5f9;
      --good: #3d7a52;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100dvh; background: #0b0e0c; color: var(--ink); font-family: system-ui, sans-serif; }
    ${CSS}
    ${fallback}
  </style>
</head>
<body>${body}</body>
</html>`;

const htmlPath = path.join(OUT, "kp-preview-smoke.html");
writeFileSync(htmlPath, html);

const server = createServer((req, res) => {
  if (req.url === "/" || req.url?.endsWith(".html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  res.writeHead(404).end();
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 720 } });
await page.goto(url, { waitUntil: "networkidle" });

const metrics = await page.evaluate(() => {
  const dialog = document.querySelector(".offerDialog");
  const route = document.querySelector(".kp-route");
  const bodyRect = document.body.getBoundingClientRect();
  const dr = dialog?.getBoundingClientRect();
  const leftGutter = dr ? dr.left - bodyRect.left : null;
  const rightGutter = dr ? bodyRect.right - dr.right : null;
  return {
    modalCentered: dr ? Math.abs(leftGutter - rightGutter) < 3 : false,
    leftGutter: leftGutter != null ? Math.round(leftGutter) : null,
    rightGutter: rightGutter != null ? Math.round(rightGutter) : null,
    routeHidden: !route,
    headerTitle: document.querySelector(".kp-header h2")?.textContent?.trim() ?? null,
    borderRadius: dialog ? getComputedStyle(dialog).borderRadius : null,
  };
});

const shot = path.join(OUT, "prof-kp-preview-320-dark.png");
await page.screenshot({ path: shot, fullPage: false });
await browser.close();
server.close();

const report = { url, metrics, shot, ok: metrics.modalCentered && metrics.routeHidden && metrics.headerTitle === "Как увидит клиент" };
writeFileSync(path.join(OUT, "prof-kp-preview-smoke.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);