/**
 * Partner 1C catalog stage-1 screenshots vs prototype viewports.
 *
 * Usage:
 *   PARTNER_1C_CATALOG_ENABLED=1 npm run dev &
 *   node scripts/catalog-stage1-capture.mjs
 *
 * Optional:
 *   CATALOG_CAPTURE_BASE=http://127.0.0.1:3000
 *   CATALOG_PROTO_BASE=http://127.0.0.1:8765
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(root, "../artifacts/catalog-reference/out");
const protoDir = path.join(outDir, "proto");
const implBase = process.env.CATALOG_CAPTURE_BASE ?? "http://127.0.0.1:3000";
const protoBase = process.env.CATALOG_PROTO_BASE ?? "http://127.0.0.1:8765";

const MODEL_ID = "p001";

const viewports = [
  { name: "1386x719", width: 1386, height: 719 },
  { name: "390x844", width: 390, height: 844 },
];

/** @type {{ slug: string; fullPage: boolean; prepare: (page: import('playwright').Page) => Promise<void> }[]} */
const implScenarios = [
  {
    slug: "catalog-owner-table",
    fullPage: true,
    async prepare(page) {
      await page.goto(`${implBase}/catalog/dev-fixture?role=owner`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await waitCatalogList(page);
    },
  },
  {
    slug: "catalog-employee-table",
    fullPage: true,
    async prepare(page) {
      await page.goto(`${implBase}/catalog/dev-fixture?role=employee`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await waitCatalogList(page);
    },
  },
  {
    slug: "catalog-owner-cards",
    fullPage: true,
    async prepare(page) {
      await page.goto(`${implBase}/catalog/dev-fixture?role=owner`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await waitCatalogList(page);
      await page.getByTestId("pc-layout-cards").click();
      await page.waitForTimeout(300);
    },
  },
  {
    slug: "catalog-employee-cards",
    fullPage: true,
    async prepare(page) {
      await page.goto(`${implBase}/catalog/dev-fixture?role=employee`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await waitCatalogList(page);
      await page.getByTestId("pc-layout-cards").click();
      await page.waitForTimeout(300);
    },
  },
  {
    slug: "catalog-owner-model",
    fullPage: true,
    async prepare(page) {
      await page.goto(`${implBase}/catalog/dev-fixture?role=owner`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await waitCatalogList(page);
      await openModel(page, MODEL_ID);
      await page.getByTestId("pc-money").waitFor({ state: "visible", timeout: 30_000 });
    },
  },
  {
    slug: "catalog-employee-model",
    fullPage: true,
    async prepare(page) {
      await page.goto(`${implBase}/catalog/dev-fixture?role=employee`, {
        waitUntil: "domcontentloaded",
        timeout: 120_000,
      });
      await waitCatalogList(page);
      await openModel(page, MODEL_ID);
      await page.getByTestId("pc-model-view").waitFor({ state: "visible", timeout: 30_000 });
    },
  },
];

/** @type {{ slug: string; fullPage: boolean; prepare: (page: import('playwright').Page) => Promise<void> }[]} */
const protoScenarios = [
  {
    slug: "catalog-owner-table",
    fullPage: true,
    async prepare(page) {
      await protoOwnerCatalog(page);
      await waitCatalogList(page);
    },
  },
  {
    slug: "catalog-employee-table",
    fullPage: true,
    async prepare(page) {
      await protoEmployeeCatalog(page);
      await waitCatalogList(page);
    },
  },
  {
    slug: "catalog-owner-cards",
    fullPage: true,
    async prepare(page) {
      await protoOwnerCatalog(page);
      await waitCatalogList(page);
      await page.getByTestId("pc-layout-cards").click();
      await page.waitForTimeout(300);
    },
  },
  {
    slug: "catalog-employee-cards",
    fullPage: true,
    async prepare(page) {
      await protoEmployeeCatalog(page);
      await waitCatalogList(page);
      await page.getByTestId("pc-layout-cards").click();
      await page.waitForTimeout(300);
    },
  },
  {
    slug: "catalog-owner-model",
    fullPage: true,
    async prepare(page) {
      await protoOwnerCatalog(page);
      await waitCatalogList(page);
      await openModel(page, MODEL_ID);
      await page.getByTestId("pc-money").waitFor({ state: "visible", timeout: 30_000 });
    },
  },
  {
    slug: "catalog-employee-model",
    fullPage: true,
    async prepare(page) {
      await protoEmployeeCatalog(page);
      await waitCatalogList(page);
      await openModel(page, MODEL_ID);
      await page.getByTestId("pc-model-view").waitFor({ state: "visible", timeout: 30_000 });
    },
  },
];

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(protoDir, { recursive: true });

async function waitCatalogList(page) {
  const ready = page.locator('[data-testid="product-catalog-section"]');
  await ready.waitFor({ state: "visible", timeout: 90_000 });
  await page.getByTestId("pc-list").or(page.getByTestId("pc-model-view")).first().waitFor({
    state: "attached",
    timeout: 90_000,
  });
  await page.waitForTimeout(400);
}

async function openModel(page, id) {
  const row = page.locator(`[data-testid="pc-model-${id}"] button, [data-testid="pc-model-${id}"] .pc-row-main, [data-testid="pc-model-${id}"] .pc-card-title`).first();
  await row.click();
  await page.getByTestId("pc-model-view").waitFor({ state: "visible", timeout: 60_000 });
}

async function protoOwnerCatalog(page) {
  await page.goto(`${protoBase}/partner/index.html?role=company&open=goods&dataset=demo`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await stripProtoChrome(page);
  await page.getByTestId("product-catalog-section").waitFor({ state: "visible", timeout: 90_000 });
}

async function stripProtoChrome(page) {
  await page.evaluate(() => {
    document
      .querySelectorAll(".proto-page-flow, [data-proto-page-ui], #review")
      .forEach((el) => el.remove());
  });
}

async function protoEmployeeCatalog(page) {
  await page.goto(`${protoBase}/partner/index.html?role=employee&open=goods&dataset=demo`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await stripProtoChrome(page);
  const goodsTab = page.locator('[data-testid="pc-tab-items"], [data-pc-action="tab:items"]').first();
  if (await goodsTab.count()) await goodsTab.click();
  await page.getByTestId("product-catalog-section").waitFor({ state: "visible", timeout: 90_000 });
}

async function setImplTheme(page, theme) {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("remcard-theme", t);
    } catch {
      /* ignore */
    }
  }, theme);
}

async function setProtoTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
}

async function stripAlerts(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[role="alert"]').forEach((el) => el.remove());
  });
}

async function assertNoMobileOverflow(page, slug, vp) {
  if (vp.width > 400) return;
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (overflow) {
    throw new Error(`Horizontal overflow on ${slug} @ ${vp.name}`);
  }
}

const browser = await chromium.launch();

for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ locale: "ru-RU" });
  for (const vp of viewports) {
    const page = await context.newPage();
    await setImplTheme(page, theme);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.emulateMedia({ colorScheme: theme });
    for (const scenario of implScenarios) {
      await scenario.prepare(page);
      await stripAlerts(page);
      await assertNoMobileOverflow(page, scenario.slug, vp);
      const file = path.join(outDir, `${scenario.slug}_${vp.name}_${theme}.png`);
      await page.screenshot({ path: file, fullPage: scenario.fullPage });
      console.log("saved", path.relative(outDir, file));
    }
    await page.close();
  }
  await context.close();
}

const protoContext = await browser.newContext({ locale: "ru-RU" });
for (const theme of ["light", "dark"]) {
  for (const vp of viewports) {
    const page = await protoContext.newPage();
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.emulateMedia({ colorScheme: theme });
    for (const scenario of protoScenarios) {
      await scenario.prepare(page);
      await setProtoTheme(page, theme);
      await stripAlerts(page);
      await assertNoMobileOverflow(page, `proto-${scenario.slug}`, vp);
      const file = path.join(protoDir, `${scenario.slug}_${vp.name}_${theme}.png`);
      await page.screenshot({ path: file, fullPage: scenario.fullPage });
      console.log("saved", path.relative(outDir, file));
    }
    await page.close();
  }
}
await protoContext.close();

await browser.close();
console.log("Screenshots saved to", outDir, "and", protoDir);