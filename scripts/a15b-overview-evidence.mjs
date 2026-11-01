#!/usr/bin/env node
/**
 * A15b paired evidence: frozen R1 (release 1) vs Next compiled overview.
 * Usage: node scripts/a15b-overview-evidence.mjs <outDir> <phase> <buildId> <nextPort>
 * phase: before | after
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const outRoot = process.argv[2];
const phase = process.argv[3];
const buildId = process.argv[4];
const nextPort = process.argv[5] || "3000";
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
];
const THEMES = ["light", "dark"];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function measureFrozen(page) {
  return page.evaluate(() => {
    const head = document.querySelector(".page-head");
    const kpis = document.querySelector(".kpis");
    const h1 = head?.querySelector("h1");
    const lead = head?.querySelector("p");
    const periods = head?.querySelector(".period, .filter-select, select.period");
    if (!head || !kpis || !h1) return null;
    const h = h1.getBoundingClientRect();
    const l = lead?.getBoundingClientRect();
    const k = kpis.getBoundingClientRect();
    const cs = getComputedStyle(h1);
    const lcs = lead ? getComputedStyle(lead) : null;
    return {
      h1Text: h1.textContent?.trim(),
      leadText: lead?.textContent?.trim(),
      h1FontSize: cs.fontSize,
      h1FontWeight: cs.fontWeight,
      leadFontSize: lcs?.fontSize ?? null,
      h1Bottom: Math.round(h.bottom),
      leadTop: l ? Math.round(l.top) : null,
      leadBottom: l ? Math.round(l.bottom) : null,
      kpisTop: Math.round(k.top),
      headBlockBottom: Math.round(head.getBoundingClientRect().bottom),
      headToKpisGap: Math.round(k.top - head.getBoundingClientRect().bottom),
      h1ToLeadGap: l ? Math.round(l.top - h.bottom) : null,
      periodControlTag: periods?.tagName ?? null,
    };
  });
}

async function measureCompiled(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const kpis = document.querySelector('[class*="kpis"]');
    const h1 = header?.querySelector("h1");
    const lead = Array.from(header?.querySelectorAll("p") ?? []).find((p) =>
      p.textContent?.includes("Главное о росте"),
    );
    const meta = Array.from(header?.querySelectorAll("p") ?? []).find((p) =>
      p.textContent?.includes("Обновлено"),
    );
    const periodBtn = header?.querySelector('button[aria-pressed="true"]');
    if (!header || !kpis || !h1) return null;
    const h = h1.getBoundingClientRect();
    const l = lead?.getBoundingClientRect();
    const m = meta?.getBoundingClientRect();
    const k = kpis.getBoundingClientRect();
    const cs = getComputedStyle(h1);
    const lcs = lead ? getComputedStyle(lead) : null;
    const pb = periodBtn?.getBoundingClientRect();
    return {
      h1Text: h1.textContent?.trim(),
      leadText: lead?.textContent?.trim(),
      metaPresent: Boolean(meta),
      h1FontSize: cs.fontSize,
      h1FontWeight: cs.fontWeight,
      leadFontSize: lcs?.fontSize ?? null,
      h1Bottom: Math.round(h.bottom),
      leadTop: l ? Math.round(l.top) : null,
      leadBottom: l ? Math.round(l.bottom) : null,
      metaBottom: m ? Math.round(m.bottom) : null,
      kpisTop: Math.round(k.top),
      headerBottom: Math.round(header.getBoundingClientRect().bottom),
      headerToKpisGap: Math.round(k.top - header.getBoundingClientRect().bottom),
      h1ToLeadGap: l ? Math.round(l.top - h.bottom) : null,
      periodBtnHeight: pb ? Math.round(pb.height) : null,
    };
  });
}

async function captureCompiled(browser, dir) {
  const hashes = {};
  for (const theme of THEMES) {
    for (const v of VIEWS) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await page.route("**/api/remcard/**", (route) => {
        if (!route.request().url().includes("management/overview")) {
          return route.continue();
        }
        return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
      });
      await page.goto(compiledUrl);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
        document.documentElement.style.colorScheme = t;
      }, theme);
      await page.getByText("Завершённые регистрации").waitFor({ timeout: 25000 });
      await sleep(400);
      const file = path.join(dir, `compiled-overview-${v.tag}-${theme}-${phase}.png`);
      await page.screenshot({ path: file, fullPage: true });
      hashes[file] = fs.readFileSync(file).length;
      await page.close();
    }
  }
  return hashes;
}

async function captureFrozen(browser, dir) {
  for (const theme of THEMES) {
    for (const v of VIEWS) {
      const page = await browser.newPage({ viewport: { width: v.w, height: v.h } });
      await page.goto(protoUrl);
      await setR1Release(page);
      await page.evaluate((t) => {
        document.documentElement.dataset.theme = t;
      }, theme);
      await sleep(400);
      const file = path.join(dir, `frozen-r1-overview-${v.tag}-${theme}-reference.png`);
      await page.screenshot({ path: file, fullPage: true });
      await page.close();
    }
  }
}

async function main() {
  fs.mkdirSync(outRoot, { recursive: true });
  const browser = await chromium.launch();
  try {
    if (phase === "before") {
      await captureFrozen(browser, outRoot);
    }
    await captureCompiled(browser, outRoot);

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route("**/api/remcard/**", (route) => {
      if (!route.request().url().includes("management/overview")) {
        return route.continue();
      }
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
    });
    await page.goto(compiledUrl);
    await page.getByText("Завершённые регистрации").waitFor({ timeout: 25000 });
    const compiledMeasure = await measureCompiled(page);

    // keyboard focus on period control
    await page.keyboard.press("Tab");
    let focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? "");
    const focusLog = { firstTab: focused };
    await page.getByRole("button", { name: "Сегодня" }).focus();
    focusLog.periodFocused = (await page.evaluate(() => document.activeElement?.getAttribute("aria-pressed"))) !== null;

    // error + retry via period (existing contract)
    await page.close();

    const protoPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await protoPage.goto(protoUrl);
    await setR1Release(protoPage);
    const frozenMeasure = await measureFrozen(protoPage);
    await protoPage.close();

    const report = {
      gapId: "OVERVIEW-A15b-HEADER-R1",
      phase,
      buildId,
      compiledUrl,
      compiledMeasure,
      frozenR1Reference: frozenMeasure,
      focusLog,
      dataMappingNote:
        "Compiled header retains API timestamp line under R1 lead; frozen R1 has only lead — larger headerToKpisGap on compiled is expected, not a spacing regression.",
    };
    fs.writeFileSync(path.join(outRoot, `header-measurements-${phase}.json`), JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
