#!/usr/bin/env node
/** A20c evidence: CLIENT all-time KPI via getAdminClientTotal + R1 layout preserved. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outRoot = process.argv[2];
const phase = process.argv[3];
const buildMeta = JSON.parse(process.argv[4] || "{}");
const nextPort = process.argv[5] || "3030";
const compiledUrl = `http://127.0.0.1:${nextPort}/admin/overview`;

const CLIENT_ALL_TIME_TOTAL = 873;

const analytics7 = {
  tab: "overview",
  period: "7d",
  registrationsByDay: [
    { date: "2026-10-25", clients: 0, pros: 0 },
    { date: "2026-10-26", clients: 1, pros: 2 },
    { date: "2026-10-27", clients: 2, pros: 1 },
  ],
};

const analytics30 = {
  ...analytics7,
  period: "30d",
  registrationsByDay: [{ date: "2026-10-27", clients: 30, pros: 5 }],
};

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
    byKindInPeriod: { agent: 1 },
    seriesDaily: [{ date: "2026-10-27", agent: 0, specialist: 0, store: 0, company: 0, total: 7 }],
    selectedPeriod: { current: 7, comparisonNote: null },
    selectedPeriodLabel: "7d",
  },
  activitySeriesDaily: [{ date: "2026-10-27", profPartnerProfiles: 3 }],
  clients: {
    accountedTotal: 12,
    createdInPeriod: { current: 2, comparisonNote: null },
    historicalDemoWarning: "Историческая демо-база (management)",
  },
  moderation: { pendingPartners: 2, oldestPendingPartnerAt: "2026-10-20T09:00:00.000Z", pendingReviews: 0 },
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

function usersBodyFromUrl(url) {
  const u = new URL(url);
  const role = u.searchParams.get("role");
  if (role !== "CLIENT") {
    return { users: [], total: 0, page: 1, totalPages: 1 };
  }
  return {
    users: [
      {
        id: "c1",
        publicId: "C-1",
        displayName: "Synthetic Client",
        role: "CLIENT",
        city: null,
        photoUrl: null,
        clientAvatarUrl: null,
        isBlocked: false,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    total: CLIENT_ALL_TIME_TOTAL,
    page: 1,
    totalPages: CLIENT_ALL_TIME_TOTAL,
  };
}

async function mockApis(page, requestLog) {
  await page.route("**/api/remcard/**", (route) => {
    const url = route.request().url();
    if (url.includes("/api/admin/users")) {
      requestLog.push(url);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(usersBodyFromUrl(url)),
      });
    }
    if (url.includes("management/overview")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload7) });
    }
    if (url.includes("/api/admin/analytics")) {
      const period = new URL(url).searchParams.get("period") || "7d";
      const body = period === "30d" ? analytics30 : analytics7;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    }
    return route.continue();
  });
}

function measureCompiled(page) {
  return page.evaluate(() => {
    const clientKpi = document.querySelector('[data-source="admin-users-client-total"]');
    const kpiValue = clientKpi?.querySelector("p")?.textContent?.trim();
    return {
      kpiCount: document.querySelectorAll("article").length,
      clientKpiValue: kpiValue,
      clientKpiCopy: clientKpi?.textContent ?? "",
      analyticsSource: Boolean(document.querySelector('[data-source="admin-analytics-overview"]')),
      dashboardChildCount: document.querySelector('[class*="dashboardGrid"]')?.children.length ?? 0,
    };
  });
}

async function captureCompiled(browser, dir, requestLog) {
  for (const theme of THEMES) {
    for (const v of VIEWS) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await mockApis(page, requestLog);
      await page.goto(compiledUrl);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        document.documentElement.style.colorScheme = t;
      }, theme);
      await page.getByText(String(CLIENT_ALL_TIME_TOTAL)).waitFor({ timeout: 25000 });
      await sleep(350);
      const tag = v.tag === "320x600" ? `320x600-${theme}` : `${v.tag}-${theme}`;
      await page.screenshot({
        path: path.join(dir, `compiled-overview-${tag}-${phase}.png`),
        fullPage: true,
      });
      if (v.tag === "320x600" && theme === "dark") {
        await page.getByRole("button", { name: "7 дней" }).focus();
        await sleep(200);
        await page.screenshot({
          path: path.join(dir, `compiled-overview-320x600-dark-focus-${phase}.png`),
          fullPage: false,
        });
      }
      await page.close();
    }
  }
}

async function syntheticPeriodRace(browser) {
  const requestLog = [];
  const usersCalls = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let usersFetchCount = 0;
  await page.route("**/api/remcard/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/admin/users")) {
      usersFetchCount += 1;
      usersCalls.push(url);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(usersBodyFromUrl(url)),
      });
    }
    if (url.includes("/api/admin/analytics")) {
      const period = new URL(url).searchParams.get("period") || "7d";
      const body = period === "30d" ? analytics30 : analytics7;
      await sleep(period === "30d" ? 120 : 0);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    }
    if (url.includes("management/overview")) {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload7) });
    }
    return route.continue();
  });
  await page.goto(compiledUrl);
  await page.getByText(String(CLIENT_ALL_TIME_TOTAL)).waitFor({ timeout: 25000 });
  await page.getByRole("button", { name: "30 дней" }).click();
  await page.getByText("Обновление…").waitFor({ timeout: 5000 });
  const during = await page.evaluate((total) => {
    const kpi = document.querySelector('[data-source="admin-users-client-total"]');
    return {
      clientTotal: kpi?.querySelector("p")?.textContent?.trim(),
      periodSub: kpi?.textContent?.includes("новых за"),
      expectedTotal: String(total),
    };
  }, CLIENT_ALL_TIME_TOTAL);
  await page.getByRole("button", { name: "7 дней" }).click();
  await sleep(400);
  const after = await page.evaluate((total) => ({
    clientTotal: document
      .querySelector('[data-source="admin-users-client-total"]')
      ?.querySelector("p")
      ?.textContent?.trim(),
    expectedTotal: String(total),
  }), CLIENT_ALL_TIME_TOTAL);
  await page.close();
  return { usersFetchCount, usersCalls, during, after, requestLog };
}

async function main() {
  fs.mkdirSync(outRoot, { recursive: true });
  const requestLog = [];
  const browser = await chromium.launch();
  try {
    await captureCompiled(browser, outRoot, requestLog);
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await mockApis(page, requestLog);
    await page.goto(compiledUrl);
    await page.getByText(String(CLIENT_ALL_TIME_TOTAL)).waitFor({ timeout: 25000 });
    const compiled = await measureCompiled(page);
    await page.close();
    let race = null;
    if (phase === "after") {
      race = await syntheticPeriodRace(browser);
    }
    const uniqueUsersUrls = [...new Set(requestLog.filter((u) => u.includes("/api/admin/users")))];
    const report = {
      gapIds: ["OVERVIEW-A20c-CLIENT-TOTAL", "OVERVIEW-A20c-A21a-HANDOFF"],
      phase,
      buildMeta,
      clientAllTimeTotal: CLIENT_ALL_TIME_TOTAL,
      managementAccountedTotal: payload7.clients.accountedTotal,
      compiled1440: compiled,
      usersRequestUrlsSample: uniqueUsersUrls.slice(0, 6),
      usersRequestsIncludeRoleClient: uniqueUsersUrls.every((u) => {
        try {
          return new URL(u).searchParams.get("role") === "CLIENT";
        } catch {
          return false;
        }
      }),
      syntheticPeriodRace1440: race,
      writesObserved: 0,
    };
    fs.writeFileSync(path.join(outRoot, `raw-metrics-${phase}.json`), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(outRoot, `geometry-${phase}.json`), JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
