/**
 * KP dialog + prof drawer footer — layout smoke @ 320/375 light+dark.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

const OUT = "/opt/cursor/artifacts";
mkdirSync(OUT, { recursive: true });

const CSS = readFileSync(new URL("../src/components/clients/receiving/receiving.module.css", import.meta.url), "utf8");

const baseVars = `
:root {
  --font-body: system-ui, sans-serif;
  --primary: #bb3035;
  --green: #30684c;
  --good: #30684c;
  --line: #e2e8f0;
  --surface: #fff;
  --offset: #f8fafc;
  --muted: #64748b;
  --ink: #0f172a;
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px;
}
html[data-theme="dark"] {
  --line: #334155;
  --surface: #0f172a;
  --offset: #1e293b;
  --muted: #94a3b8;
  --ink: #f1f5f9;
}
body { margin: 0; background: var(--offset); font-family: var(--font-body); color: var(--ink); }
.profSidePanel .prof-side-shell {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.profSidePanel .prof-side-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.profSidePanel .prof-drawer-footer { flex: none; margin-top: auto; }
.offerDialog .kp-form { display: flex; flex-direction: column; height: 100%; max-height: inherit; min-height: 0; }
.offerDialog .kp-scroll { flex: 1; min-height: 0; overflow-y: auto; }
.offerDialog .kp-footer { flex: none; }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font: inherit; cursor: pointer; }
.btn.primary { background: var(--primary); color: #fff; border-color: transparent; }
.btn.ghost { background: transparent; }
.stack { display: grid; gap: 10px; }
.field textarea, .field input, .field select { width: 100%; box-sizing: border-box; font: inherit; padding: 10px; border-radius: 10px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); }
.muted { color: var(--muted); }
.small { font-size: 12px; }
${CSS}
`;

const kpHtml = `
<dialog class="offerDialog" open style="display:flex;position:fixed;inset:20px;margin:auto;">
  <form class="kp-form" style="width:100%;">
    <header class="kp-header">
      <div class="kp-header-main">
        <p class="kp-kicker"><span class="kp-step">1 из 2 · Черновик</span></p>
        <h2>Отправить КП</h2>
      </div>
      <button type="button" class="btn ghost kp-close">×</button>
    </header>
    <div class="kp-scroll">
      <div class="kp-route">
        <div class="kp-route-end"><span class="kp-route-label">Отправитель</span><strong class="kp-route-name">ООО Ремонт</strong></div>
        <span class="kp-route-arrow">→</span>
        <div class="kp-route-end"><span class="kp-route-label">Клиент</span><strong class="kp-route-name">Анна</strong></div>
      </div>
      <div class="kp-compose stack">
        <label class="field kp-field"><span class="kp-field-label">Текст</span><textarea rows="3"></textarea></label>
        <section class="kp-next stack"><h3 class="kp-next-title">Что предлагает сделать партнёр</h3><textarea rows="2"></textarea></section>
      </div>
    </div>
    <footer class="kp-footer">
      <div class="kp-footer-actions">
        <button type="button" class="btn ghost">Отмена</button>
        <button type="button" class="btn primary">Предпросмотр</button>
      </div>
    </footer>
  </form>
</dialog>`;

const drawerHtml = `
<dialog class="profSidePanel" open>
  <div class="prof-side-shell">
  <header class="prof-side-header"><h2>Отделка</h2><button type="button" class="btn icon">×</button></header>
  <div class="prof-side-scroll">
    <div class="prof-status-meta"><div><span class="muted">Статус</span> <strong>Новое</strong></div></div>
    <form class="prof-drawer-form stack"><label class="field">Заголовок<input /></label><label class="field">Запрос<textarea rows="4"></textarea></label><label class="field">Город<input /></label><label class="field">Контакт<input /></label></form>
    <div class="prof-lifecycle-host"><p class="muted small">Lifecycle host (scroll tail)</p></div>
  </div>
  <footer class="prof-drawer-footer">
    <button type="button" class="btn ghost">Отменить</button>
    <button type="button" class="btn primary">Сохранить</button>
  </footer>
  </div>
</dialog>`;

function fixture(theme, body) {
  return `<!DOCTYPE html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><style>${baseVars}</style></head><body>${body}</body></html>`;
}

async function auditDrawerFooter(page) {
  return page.evaluate(() => {
    const panel = document.querySelector(".profSidePanel");
    const footer = document.querySelector(".prof-drawer-footer");
    if (!panel || !footer) return { ok: false, reason: "missing nodes" };
    const pr = panel.getBoundingClientRect();
    const fr = footer.getBoundingClientRect();
    const scroll = document.querySelector(".prof-side-scroll");
    const sr = scroll?.getBoundingClientRect();
    const footerPinned = Math.abs(pr.bottom - fr.bottom) < 3;
    const footerOutsideScroll = sr ? fr.top >= sr.bottom - 2 : false;
    return {
      ok: footerPinned && footerOutsideScroll,
      footerPinned,
      footerOutsideScroll,
      panelBottom: Math.round(pr.bottom),
      footerBottom: Math.round(fr.bottom),
      scrollBottom: sr ? Math.round(sr.bottom) : null,
    };
  });
}

async function auditKpFooter(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector(".offerDialog");
    const footer = document.querySelector(".kp-footer");
    const scroll = document.querySelector(".kp-scroll");
    if (!dialog || !footer || !scroll) return { ok: false, reason: "missing nodes" };
    const dr = dialog.getBoundingClientRect();
    const fr = footer.getBoundingClientRect();
    const sr = scroll.getBoundingClientRect();
    const footerPinned = Math.abs(dr.bottom - fr.bottom) < 4;
    const scrollAboveFooter = sr.bottom <= fr.top + 2;
    return { ok: footerPinned && scrollAboveFooter, footerPinned, scrollAboveFooter };
  });
}

const widths = [320, 375];
const themes = ["light", "dark"];
const browser = await chromium.launch();
const results = [];

for (const w of widths) {
  for (const theme of themes) {
    const page = await browser.newPage({ viewport: { width: w, height: 720 } });
    await page.setContent(fixture(theme, kpHtml + drawerHtml), { waitUntil: "domcontentloaded" });
    const kp = await auditKpFooter(page);
    const drawer = await auditDrawerFooter(page);
    const shot = path.join(OUT, `prof-kp-drawer-${w}-${theme}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    results.push({ width: w, theme, kp, drawer, shot });
    await page.close();
  }
}

await browser.close();

const summaryPath = path.join(OUT, "prof-kp-drawer-qa.json");
await import("node:fs/promises").then((fs) => fs.writeFile(summaryPath, JSON.stringify(results, null, 2)));

const allOk = results.every((r) => r.kp.ok && r.drawer.ok);
console.log(JSON.stringify({ allOk, results }, null, 2));
process.exit(allOk ? 0 : 1);