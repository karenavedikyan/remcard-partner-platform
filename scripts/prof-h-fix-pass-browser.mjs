/**
 * PROF-H narrow fix-pass: profile overflow metrics at 390/1440 on dev-fixture + branch select CSS probe.
 */
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.PROF_H_BASE_URL ?? "http://127.0.0.1:3000";
const OUT_DIR = process.env.PROF_H_ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots";

const TAB_LABELS = [
  /Обзор/i,
  /Основные данные/i,
  /Каталог RemCard/i,
  /Филиалы/i,
  /Сотрудники/i,
  /Уведомления/i,
];

const BRANCH_NAMES = [
  { id: "b1", name: "ОПТОВИК — ул. Красных Партизан, 235", city: "Краснодар" },
  { id: "b2", name: "Склад — проспект Very Long Street Name 99999", city: "Ростов-на-Дону" },
  { id: "b3", name: "Шоурум — ТЦ Галерея Краснодар", city: "Краснодар" },
  { id: "b4", name: "Филиал Север — длинное коммерческое название", city: "Москва" },
  { id: "b5", name: "Филиал Юг — ещё одно длинное имя для overflow", city: "Сочи" },
  { id: "b6", name: "Головной офис — ОПТОВИК", city: "Краснодар" },
];

async function metrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const select = document.querySelector('[data-testid="pro-branch-context-select"]');
    const selectBox = select?.getBoundingClientRect();
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: doc.scrollWidth,
      overflow: doc.scrollWidth > doc.clientWidth + 2,
      selectWidth: selectBox?.width ?? null,
      selectRight: selectBox?.right ?? null,
    };
  });
}

async function branchSelectProbe(page) {
  const cssPath = path.resolve(__dirname, "../src/components/profile/ProfileEditor.module.css");
  const cssText = await readFile(cssPath, "utf8");
  const scoped = cssText
    .replace(/\.checkRow/g, ".checkRow")
    .replace(/\.branchContextCheckRow/g, ".branchContextCheckRow")
    .replace(/\.branchContextSelect/g, ".branchContextSelect")
    .replace(/\.branchContextLabel/g, ".branchContextLabel");

  const options = BRANCH_NAMES.map(
    (b) => `<option value="${b.id}">${b.name} (${b.city})</option>`,
  ).join("");
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=390" /><style>
  body{margin:0;padding:12px;font-family:system-ui,sans-serif}
  ${scoped}
  select{font-size:0.875rem;padding:0.35rem 0.5rem}
  </style></head><body>
  <label class="checkRow branchContextCheckRow"><span class="branchContextLabel">Рабочий филиал</span>
  <select class="branchContextSelect" data-testid="pro-branch-context-select">${options}</select></label>
  </body></html>`;

  await page.setContent(html, { waitUntil: "domcontentloaded" });
  await page.setViewportSize({ width: 390, height: 844 });
  return metrics(page);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await context.route("**/api/pro/context", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        role: "ORG_OWNER",
        organization: { name: "ОПТОВИК" },
        activeBranch: BRANCH_NAMES[0],
        branches: BRANCH_NAMES,
      }),
    });
  });

  const results = { widths: {}, tabs: {}, branchProbe: null, exitCode: 0 };

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/profile/dev-fixture?section=overview`, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    results.widths[width] = await metrics(page);
    await page.screenshot({
      path: path.join(OUT_DIR, `prof-h-fix-pass-overview-${width}.png`),
      fullPage: true,
    });

    for (const label of TAB_LABELS) {
      const tab = page.getByRole("tab", { name: label });
      await tab.click();
      await page.waitForTimeout(150);
      const m = await metrics(page);
      const key = `${width}:${label.source}`;
      results.tabs[key] = m;
      if (m.overflow) {
        results.exitCode = 1;
        console.error(`overflow on tab ${label} at ${width}:`, m);
      }
    }
  }

  results.branchProbe = await branchSelectProbe(page);
  if (results.branchProbe.overflow) {
    results.exitCode = 1;
    console.error("branch select probe overflow", results.branchProbe);
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  process.exit(results.exitCode);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
