#!/usr/bin/env node
/** A19a evidence: charts dynamics block, paired before/after compiled + frozen reference. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outRoot = process.argv[2];
const phase = process.argv[3];
const buildMeta = JSON.parse(process.argv[4] || "{}");
const nextPort = process.argv[5] || "3001";
const protoUrl = "http://127.0.0.1:8765/admin/index.html#overview";
const compiledUrl = `http://127.0.0.1:${nextPort}/admin/overview`;

const payload = {
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
      { date: "2026-10-25", agent: 1, specialist: 0, store: 0, company: 0, total: 1 },
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
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
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
    const kpis = document.querySelector('[class*="kpis"]');
    const section =
      document.querySelector('section[aria-label="Динамика показателей"]') ||
      document.querySelector('[class*="chartsRow"]')?.parentElement;
    const row = document.querySelector('[class*="chartsRow"]');
    const blocks = row ? Array.from(row.children) : [];
    const first = blocks[0];
    if (!kpis || !row || !first) return null;
    const head = first.querySelector("h3");
    const subtitle = first.querySelector("p");
    const svg = first.querySelector("svg");
    const legend = first.querySelector('[aria-label^="Легенда:"]');
    const contract = document.querySelector('[class*="chartContractNote"]');
    const kBottom = kpis.getBoundingClientRect().bottom;
    const rowTop = row.getBoundingClientRect().top;
    return {
      chartBlockCount: blocks.length,
      kpisToChartsGap: Math.round(rowTop - kBottom),
      chartsRowGap: getComputedStyle(row).gap,
      chartsRowColumns: getComputedStyle(row).gridTemplateColumns,
      firstPanel: {
        titleFontSize: head ? getComputedStyle(head).fontSize : null,
        titleFontWeight: head ? getComputedStyle(head).fontWeight : null,
        subtitleFontSize: subtitle ? getComputedStyle(subtitle).fontSize : null,
        subtitleColor: subtitle ? getComputedStyle(subtitle).color : null,
        headPadding: first.querySelector('[class*="chartHead"]')
          ? getComputedStyle(first.querySelector('[class*="chartHead"]')).padding
          : null,
        borderRadius: getComputedStyle(first).borderRadius,
        svgHeight: svg ? getComputedStyle(svg).height : null,
        legendPresent: Boolean(legend),
        legendFontSize: legend ? getComputedStyle(legend).fontSize : null,
      },
      contractNotePresent: Boolean(contract),
      contractNoteText: contract?.textContent?.trim().slice(0, 120) ?? null,
      hasChartsSectionWrapper: Boolean(
        document.querySelector('section[aria-label="Динамика показателей"]'),
      ),
    };
  });
}

function measureFrozenChart(page) {
  return page.evaluate(() => {
    const kpis = document.querySelector(".kpis");
    const grid = kpis?.nextElementSibling;
    const panel = grid?.querySelector(".panel");
    const head = panel?.querySelector(".panel-head");
    const small = head?.querySelector("small");
    const legend = panel?.querySelector(".chart-legend");
    const svg = panel?.querySelector("svg.line-chart");
    if (!kpis || !panel) return null;
    return {
      kpisToChartsGap: grid
        ? Math.round(grid.getBoundingClientRect().top - kpis.getBoundingClientRect().bottom)
        : null,
      panelTitle: head?.querySelector("h2")?.textContent?.trim(),
      panelSubtitleFontSize: small ? getComputedStyle(small).fontSize : null,
      legendItemCount: legend ? legend.querySelectorAll("span").length : 0,
      svgPresent: Boolean(svg),
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
      await page.getByRole("heading", { name: "Обзор проекта", level: 1 }).waitFor({ timeout: 25000 });
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
    await page.close();

    const proto = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await proto.goto(protoUrl);
    await setR1Release(proto);
    const frozen = await measureFrozenChart(proto);
    await proto.close();

    const report = {
      gapIds: [
        "OVERVIEW-A19a-CHART-PANEL-HEAD",
        "OVERVIEW-A19a-CHART-LEGEND-CONTRACT",
        "OVERVIEW-A19a-PERIOD-STALE-GUARD",
        "OVERVIEW-A19a-ERROR-RETRY-LOADING",
      ],
      phase,
      buildMeta,
      compiledCharts1440: compiled,
      frozenR1ChartReference1440: frozen,
      dataMappingNotes: [
        "Frozen R1 overview uses one dual-series demo chart (Партнёры/Клиенты); product renders two API panels without client series.",
        "Compiled KPI grid remains ManagementOverview (9 tiles, demo warnings); not pixel-PASS vs frozen four-tile demo.",
        "Chart subtitles follow UI period labels (1d/7d/30d), not prototype period select values.",
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
