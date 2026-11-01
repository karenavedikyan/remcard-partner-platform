#!/usr/bin/env node
/** A19b evidence: trustworthy charts, period honesty, synthetic delay/reorder. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outRoot = process.argv[2];
const phase = process.argv[3];
const buildMeta = JSON.parse(process.argv[4] || "{}");
const nextPort = process.argv[5] || "3001";
const protoUrl = "http://127.0.0.1:8765/admin/index.html#overview";
const compiledUrl = `http://127.0.0.1:${nextPort}/admin/overview`;

const payload7 = {
  generatedAt: "2026-10-27T13:00:00.000Z",
  timezone: "Europe/Moscow",
  period: "7d",
  periodLabel: "7d",
  partners: { liveRegistered: 5, demoRegistered: 7, visibleInCatalog: 4, catalogCardSurfaces: 6 },
  registrationsCompleted: {
    today: { current: 1, comparisonNote: null },
    days7: { current: 7, comparisonNote: null },
    days30: { current: 30, comparisonNote: null },
    byKindInPeriod: { agent: 1, specialist: 2, store: 3, company: 4 },
    seriesDaily: [
      { date: "2026-10-25", agent: 1, specialist: 0, store: 0, company: 0, total: 7 },
      { date: "2026-10-26", agent: 0, specialist: 2, store: 0, company: 0, total: 2 },
      { date: "2026-10-27", agent: 0, specialist: 0, store: 1, company: 0, total: 1 },
    ],
    selectedPeriod: { current: 7, comparisonNote: null },
    selectedPeriodLabel: "7d",
  },
  activitySeriesDaily: [
    { date: "2026-10-25", profPartnerProfiles: 2 },
    { date: "2026-10-26", profPartnerProfiles: 4 },
    { date: "2026-10-27", profPartnerProfiles: 3 },
  ],
  clients: {
    accountedTotal: 12,
    createdInPeriod: { current: 2, comparisonNote: null },
    historicalDemoWarning: "Историческая демо-база",
  },
  moderation: {
    pendingPartners: 2,
    oldestPendingPartnerAt: "2026-10-20T09:00:00.000Z",
    pendingReviews: 0,
  },
  leadsAndRequests: { leadsNew: 2, leadsOpen: 5, requestsToday: 1 },
  activity: {
    profPartnerProfilesUsed: { distinctInPeriod: null, coverageNote: "Нет данных", collectionStartedAt: null },
    publicSiteAuthenticatedPartners: { distinctInPeriod: null, coverageNote: "Нет учёта" },
    publicPartnerCardViews: { viewsInPeriod: 3, coverageNote: "Частичный учёт" },
  },
  definitions: { partnerProfile: "Один профиль" },
  incompleteLiveRegistration: { available: false, count: null, note: "" },
};

const payload30 = {
  ...payload7,
  period: "30d",
  periodLabel: "30d",
  registrationsCompleted: {
    ...payload7.registrationsCompleted,
    seriesDaily: [{ date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 30 }],
    selectedPeriod: { current: 30, comparisonNote: null },
    selectedPeriodLabel: "30d",
  },
  activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 30 }],
};

const VIEWS = [
  { w: 1440, h: 900, tag: "1440" },
  { w: 375, h: 812, tag: "375" },
  { w: 320, h: 812, tag: "320" },
  { w: 320, h: 600, tag: "320x600" },
];
const THEMES = ["light", "dark"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mockOverview(page) {
  await page.route("**/api/remcard/**", (route) => {
    if (!route.request().url().includes("management/overview")) return route.continue();
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload7) });
  });
}

async function setR1Release(page) {
  await page.waitForSelector("#app .page-head", { timeout: 20000 });
  await page.evaluate(() => {
    document.querySelector('[data-action="set-release"][data-id="1"]')?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
  });
  await page.locator(".kpis").first().waitFor({ timeout: 20000 });
}

function measureCompiledCharts(page) {
  return page.evaluate(() => {
    const row = document.querySelector('[class*="chartsRow"]');
    const blocks = row ? Array.from(row.children) : [];
    const first = blocks[0];
    const subtitle = first?.querySelector("p");
    const legend = first?.querySelector('[aria-label^="Легенда:"]');
    return {
      chartBlockCount: blocks.length,
      chartPeriodAttr: row?.getAttribute("data-chart-period"),
      subtitleSamples: blocks
        .map((b) => b.querySelector("p")?.textContent?.trim())
        .filter(Boolean),
      legendRegText: legend?.textContent?.trim() ?? null,
      contractNoteInDom: Boolean(document.querySelector('[class*="chartContractNote"]')),
      prototypeMentionInDom: /прототипе R1|API-ряд/i.test(document.body.innerText),
    };
  });
}

async function captureCompiled(browser, dir) {
  for (const theme of THEMES) {
    for (const v of VIEWS) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await mockOverview(page);
      await page.goto(compiledUrl);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        document.documentElement.style.colorScheme = t;
      }, theme);
      await page.getByRole("heading", { name: "Регистрации по дням", level: 3 }).waitFor({ timeout: 25000 });
      await sleep(350);
      const tag = v.tag === "320x600" ? `320x600-${theme}` : `${v.tag}-${theme}`;
      await page.screenshot({
        path: path.join(dir, `compiled-overview-${tag}-${phase}.png`),
        fullPage: true,
      });
      await page.close();
    }
  }
}

async function captureFrozen(browser, dir) {
  for (const theme of THEMES) {
    for (const v of VIEWS.filter((x) => x.tag !== "320x600")) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await page.goto(protoUrl);
      await setR1Release(page);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await sleep(350);
      await page.screenshot({
        path: path.join(dir, `frozen-r1-overview-${v.tag}-${theme}-reference.png`),
        fullPage: true,
      });
      await page.close();
    }
  }
}

async function syntheticPeriodReorder(page) {
  const pending30 = [];
  await page.route("**/api/remcard/**", async (route) => {
    const url = route.request().url();
    if (!url.includes("management/overview")) return route.continue();
    const period = new URL(url).searchParams.get("period") || "7d";
    if (period === "30d") {
      await new Promise((r) => pending30.push(r));
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload30) });
    }
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload7) });
  });
  await page.goto(compiledUrl);
  await page.getByRole("heading", { name: "Регистрации по дням", level: 3 }).waitFor({ timeout: 25000 });
  await page.getByRole("button", { name: "30 дней" }).click();
  await page.getByText("Обновление графиков…").waitFor({ timeout: 5000 });
  const during = await page.evaluate(() => ({
    subtitles: Array.from(document.querySelectorAll('[class*="chartHead"] p')).map((p) => p.textContent?.trim()),
    regTotal: document.querySelector('[aria-label="Регистрации по дням"]')?.textContent?.match(/\d+/g)?.pop(),
    chartPeriod: document.querySelector('[class*="chartsRow"]')?.getAttribute("data-chart-period"),
  }));
  await page.getByRole("button", { name: "7 дней" }).click();
  await sleep(150);
  pending30.forEach((r) => r());
  await sleep(400);
  const after = await page.evaluate(() => ({
    subtitles: Array.from(document.querySelectorAll('[class*="chartHead"] p')).map((p) => p.textContent?.trim()),
    regTotal: document.querySelector('[aria-label="Регистрации по дням"]')?.textContent?.match(/\d+/g)?.pop(),
    chartPeriod: document.querySelector('[class*="chartsRow"]')?.getAttribute("data-chart-period"),
    has999: document.body.innerText.includes("999"),
  }));
  return { during, after };
}

async function main() {
  fs.mkdirSync(outRoot, { recursive: true });
  const browser = await chromium.launch();
  try {
    if (phase === "before") await captureFrozen(browser, outRoot);
    await captureCompiled(browser, outRoot);

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await mockOverview(page);
    await page.goto(compiledUrl);
    await page.getByRole("heading", { name: "Регистрации по дням", level: 3 }).waitFor({ timeout: 25000 });
    const compiled = await measureCompiledCharts(page);

    let synthetic = null;
    if (phase === "after") {
      synthetic = await syntheticPeriodReorder(await browser.newPage({ viewport: { width: 1440, height: 900 } }));
    }
    await page.close();

    const report = {
      gapIds: [
        "OVERVIEW-A19b-NO-UI-CONTRACT-NOTE",
        "OVERVIEW-A19b-CHART-PERIOD-HONESTY",
        "OVERVIEW-A19b-LEGEND-COPY",
      ],
      phase,
      buildMeta,
      compiledCharts1440: compiled,
      syntheticPeriodReorder1440: synthetic,
      contractGapsDocumentedInReportOnly: [
        "Frozen R1 overview: one dual-series demo chart (Партнёры/Клиенты) vs product two API panels.",
        "Product overview KPI grid: 9 ManagementOverview tiles vs frozen 4 demo KPIs.",
        "No client registration daily series in overview API — not substituted under partner/client labels.",
      ],
    };
    fs.writeFileSync(path.join(outRoot, `geometry-${phase}.json`), JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
