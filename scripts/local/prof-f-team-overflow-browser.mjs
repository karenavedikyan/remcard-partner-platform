/**
 * Local browser check: team employee card must not cause horizontal overflow at 390/1440.
 * Uses static DOM + ProfileEditor.module.css (no production session).
 */
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_PATH = path.resolve(
  __dirname,
  "../../src/components/profile/ProfileEditor.module.css",
);

const LONG_BRANCH =
  "ОПТОВИК — ул. Красных Партизан, 235 — Краснодар";
const OTHER_BRANCH =
  "Склад — проспект Very Long Street Name 99999 — Ростов-на-Дону";

function fixtureHtml(cssText) {
  const scoped = cssText
    .replace(/\.grid/g, ".fixtureGrid")
    .replace(/\.main/g, ".fixtureMain")
    .replace(/\.fields/g, ".fields")
    .replace(/\.checkRow/g, ".checkRow")
    .replace(/\.notesList/g, ".notesList")
    .replace(/\.hint/g, ".hint");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root {
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --text-sm: 0.875rem;
  --border: #ddd;
  --surface: #fff;
  --line: #e5e5e5;
  --primary: #c00;
  --muted: #666;
  --green: #080;
}
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; padding: 12px; font-family: system-ui, sans-serif; background: #f5f5f5; }
.fixtureMain { max-width: 100%; }
.panel { padding: 1rem; background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; max-width: 100%; min-width: 0; }
button { min-height: 46px; padding: 0.75rem 1.25rem; border: 1px solid #e5e5e5; background: #fff; border-radius: 6px; font-weight: 700; font-size: 0.875rem; cursor: pointer; }
select { min-height: 40px; padding: 0.35rem 0.5rem; font-size: 0.875rem; }
${scoped}
</style>
</head>
<body>
<div class="fixtureMain">
<section class="panel">
<h2>Сотрудники и доступы</h2>
<ul class="notesList teamSectionList">
<li>
<strong class="teamBranchTitle">${LONG_BRANCH} (Краснодар)</strong>
<ul>
<li class="teamEmployeeItem">
<button type="button" class="teamEmployeeToggle">Иван Петров — Менеджер</button>
<div class="fields teamEmployeeFields">
<p class="hint">Филиал: ${LONG_BRANCH}. Права задаются ролью на сервере.</p>
<label class="checkRow teamCheckRow">Роль
<select><option>Менеджер</option></select>
</label>
<button type="button">Сохранить роль</button>
<label class="checkRow teamCheckRow">Перевод в филиал
<select id="transfer-select">
<option value="">Выберите…</option>
<option value="b2">${OTHER_BRANCH}</option>
<option value="b3">${LONG_BRANCH}</option>
</select>
</label>
<button type="button">Перевести</button>
<button type="button">Отозвать доступ</button>
</div>
</li>
</ul>
</li>
</ul>
</section>
</div>
</body>
</html>`;
}

async function measure(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const transfer = document.getElementById("transfer-select");
    const optionCount = transfer ? transfer.options.length : 0;
    const buttons = [...document.querySelectorAll("button")].map((b) => {
      const r = b.getBoundingClientRect();
      return { text: b.textContent?.trim().slice(0, 24), right: r.right, visible: r.width > 0 && r.height > 0 };
    });
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      innerWidth: window.innerWidth,
      horizontalOverflow: doc.scrollWidth > doc.clientWidth,
      transferOptions: optionCount,
      buttons,
    };
  });
}

async function run() {
  const cssText = await readFile(CSS_PATH, "utf8");
  const html = fixtureHtml(cssText);
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of [
    { name: "mobile_390", width: 390, height: 844 },
    { name: "desktop_1440", width: 1440, height: 900 },
  ]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.setContent(html, { waitUntil: "load" });
    const m = await measure(page);
    results.push({ viewport: vp.name, ...m });
    await page.close();
  }

  await browser.close();
  console.log(JSON.stringify({ results }, null, 2));

  const failed = results.filter((r) => r.horizontalOverflow || r.transferOptions < 3);
  if (failed.length) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
