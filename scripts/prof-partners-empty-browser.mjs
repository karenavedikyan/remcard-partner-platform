/**
 * Browser: empty partner search → link invite → back; overflow @390/1440.
 */
import { chromium } from "playwright";
import path from "node:path";

const BASE = process.env.PROF_H_BASE_URL ?? "http://127.0.0.1:3002";
const OUT = process.env.PROF_H_ARTIFACT_DIR ?? "/opt/cursor/artifacts/screenshots";

async function metrics(page) {
  return page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    activeTab: document.querySelector('[role="tab"][aria-selected="true"]')?.textContent?.trim() ?? null,
    selectCount: document.querySelectorAll("select").length,
  }));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await context.route("**/api/remcard/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/partnership/list")) {
      await route.fulfill({ json: { partnerships: [] } });
      return;
    }
    if (url.includes("/partnership/search")) {
      await route.fulfill({ json: { partners: [], nextCursor: null } });
      return;
    }
    if (url.includes("/partnership/link-invite")) {
      await route.fulfill({ json: { invites: [] } });
      return;
    }
    if (url.includes("/partner-taxonomy")) {
      await route.fulfill({
        json: {
          products: [{ kind: "product", id: "doors", label: "Двери" }],
          services: [],
          stages: [],
        },
      });
      return;
    }
    await route.fulfill({ json: {} });
  });

  const result = { widths: {}, flow: null, exitCode: 0 };
  let dialog = false;
  page.on("dialog", () => {
    dialog = true;
  });

  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}/partners/dev-fixture`, { waitUntil: "networkidle", timeout: 120_000 });
    await page.getByRole("tab", { name: /Найти в RemCard/i }).click();
    await page.waitForSelector("text=По выбранным условиям партнёры пока не найдены");
    const m = await metrics(page);
    if (!m.activeTab?.includes("Найти")) {
      result.exitCode = 1;
      console.error("find tab not active", m);
    }
    if (m.selectCount < 1) {
      result.exitCode = 1;
      console.error("expected role/search controls", m);
    }
    if (m.overflow) {
      result.exitCode = 1;
      console.error("overflow", width, m);
    }
    result.widths[width] = m;
    await page.screenshot({
      path: path.join(OUT, `prof-partners-empty-${width}.png`),
      fullPage: true,
    });
  }

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(`${BASE}/partners/dev-fixture`, { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: /Найти в RemCard/i }).click();
  await page.locator("#город").fill("Анапа");
  await page.getByRole("button", { name: /Пригласить знакомого партнёра/i }).click();
  await page.waitForSelector("role=heading[name='Пригласить по ссылке']");
  await page.getByRole("tab", { name: /Найти в RemCard/i }).click();
  const city = await page.locator("#город").inputValue();
  result.flow = {
    dialog,
    cityPreserved: city === "Анапа",
    activeTab: (await metrics(page)).activeTab,
  };
  if (dialog || !result.flow.cityPreserved) {
    result.exitCode = 1;
    console.error("flow failed", result.flow);
  }

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(result.exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
