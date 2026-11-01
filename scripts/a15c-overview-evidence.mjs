#!/usr/bin/env node
/** A15c evidence: header + KPI geometry, paired before/after compiled + frozen reference. */
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
    seriesDaily: [{ date: "2026-10-27", agent: 1, specialist: 0, store: 0, company: 0, total: 1 }],
    selectedPeriod: { current: 7, comparisonNote: null },
    selectedPeriodLabel: "7d",
  },
  activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 2 }],
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

function measureCompiled(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const kpis = document.querySelector('[class*="kpis"]');
    const firstKpi = document.querySelector("article");
    const charts = document.querySelector('[class*="chartsRow"], [class*="chartsRow"]');
    const h1 = header?.querySelector("h1");
    if (!header || !kpis || !firstKpi || !h1) return null;
    const h = h1.getBoundingClientRect();
    const k = kpis.getBoundingClientRect();
    const card = firstKpi.getBoundingClientRect();
    const ch = charts?.getBoundingClientRect();
    const label = firstKpi.querySelector("h2");
    const value = firstKpi.querySelector("p");
    const lcs = label ? getComputedStyle(label) : null;
    const vcs = value ? getComputedStyle(value) : null;
    const kcs = getComputedStyle(kpis);
    return {
      h1Text: h1.textContent?.trim(),
      h1FontSize: getComputedStyle(h1).fontSize,
      headerBottom: Math.round(header.getBoundingClientRect().bottom),
      kpisTop: Math.round(k.top),
      kpisBottom: Math.round(k.bottom),
      kpisMarginBottom: kcs.marginBottom,
      kpisGap: kcs.gap,
      kpisToChartsGap: ch ? Math.round(ch.top - k.bottom) : null,
      firstCard: {
        paddingTop: Math.round(parseFloat(getComputedStyle(firstKpi).paddingTop)),
        borderRadius: getComputedStyle(firstKpi).borderRadius,
        labelFontSize: lcs?.fontSize,
        labelFontWeight: lcs?.fontWeight,
        valueFontSize: vcs?.fontSize,
        valueMarginTop: value ? getComputedStyle(value).marginTop : null,
        height: Math.round(card.height),
      },
      headerToKpisGap: Math.round(k.top - header.getBoundingClientRect().bottom),
    };
  });
}

function measureFrozen(page) {
  return page.evaluate(() => {
    const head = document.querySelector(".page-head");
    const kpis = document.querySelector(".kpis");
    const first = kpis?.querySelector(".kpi");
    const next = kpis?.nextElementSibling;
    if (!head || !kpis || !first) return null;
    const kcs = getComputedStyle(kpis);
    const label = first.querySelector(".kpi-label");
    const value = first.querySelector(".kpi-value");
    return {
      h1Text: head.querySelector("h1")?.textContent?.trim(),
      headBottom: Math.round(head.getBoundingClientRect().bottom),
      kpisTop: Math.round(kpis.getBoundingClientRect().top),
      kpisBottom: Math.round(kpis.getBoundingClientRect().bottom),
      kpisMarginBottom: kcs.marginBottom,
      kpisGap: kcs.gap,
      kpisToNextGap: next ? Math.round(next.getBoundingClientRect().top - kpis.getBoundingClientRect().bottom) : null,
      firstCard: {
        paddingTop: Math.round(parseFloat(getComputedStyle(first).paddingTop)),
        borderRadius: getComputedStyle(first).borderRadius,
        labelFontSize: label ? getComputedStyle(label).fontSize : null,
        valueFontSize: value ? getComputedStyle(value).fontSize : null,
        height: Math.round(first.getBoundingClientRect().height),
      },
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
      await page.getByText("Завершённые регистрации").waitFor({ timeout: 25000 });
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
    await page.getByText("Завершённые регистрации").waitFor({ timeout: 25000 });
    const compiled = await measureCompiled(page);
    await page.close();

    const proto = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await proto.goto(protoUrl);
    await setR1Release(proto);
    const frozen = await measureFrozen(proto);
    await proto.close();

    const report = {
      gapId: "OVERVIEW-A15c-KPI-GRID-MARGIN",
      phase,
      buildMeta,
      compiledMeasure1440: compiled,
      frozenR1Reference1440: frozen,
      dataMappingNotes: [
        "Compiled KPI count/labels from ManagementOverview, not frozen demo four-tile set.",
        "Compiled cards include API timestamp block above KPI grid; frozen page-head has no third meta line.",
        "kpisToChartsGap on compiled approximates prototype kpis margin-bottom + following section spacing.",
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
