import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const BASE = "http://127.0.0.1:3000";
const NAV = "http://127.0.0.1:3000/api/remcard";
const USER_A = "m1fix-prof-browser01";
const USER_B = "m1fix-prof-browser02";

const results = {
  scenarios: {},
  consoleErrors: [],
  exitCode: 0,
  shas: {},
  screenshots: [],
};

function mintToken(userId) {
  return execSync(
    `cd /agent/repos/remcard-navigator && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8" },
  ).trim();
}

function partnerTitle(partner) {
  return (
    partner.organizationName?.trim() ||
    partner.displayName?.trim() ||
    "Партнёр"
  );
}

function gitHead(repo) {
  return execSync(`git -C ${repo} rev-parse HEAD`, { encoding: "utf8" }).trim();
}

async function remcardSearch(token, params) {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${NAV}/api/partnership/search?${qs}`, {
    headers: { Cookie: `remcard-token=${token}` },
  });
  if (!res.ok) throw new Error(`search ${res.status}`);
  return res.json();
}

async function fetchAllSearchPartners(token, baseParams) {
  const partners = [];
  let cursor = null;
  for (let page = 0; page < 20; page++) {
    const params = { ...baseParams, limit: "20" };
    if (cursor) params.cursor = cursor;
    const data = await remcardSearch(token, params);
    partners.push(...(data.partners ?? []));
    cursor = data.nextCursor ?? null;
    if (!cursor) break;
  }
  return partners;
}

async function cookieContext(browser, token, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addCookies([
    {
      name: "remcard-token",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") results.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => results.consoleErrors.push(String(err)));
  return { context, page };
}

async function shot(page, name) {
  const path = `${outDir}/${name}`;
  await page.screenshot({ path, fullPage: true });
  results.screenshots.push(path);
  return path;
}

async function openBasics(page) {
  await page.goto(`${BASE}/profile?section=basics`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.waitForTimeout(1500);
}

async function fillBasicsName(page, value) {
  await page.locator("#имя-представителя").fill(value);
}

async function fillBasicsCity(page, value) {
  await page.locator("#город").fill(value);
}

async function saveBasics(page) {
  await page.getByRole("button", { name: /Сохранить основные данные/i }).click();
  await page.waitForTimeout(3500);
}

async function ensureCheckbox(page, nameRe) {
  const box = page.getByRole("checkbox", { name: nameRe }).first();
  await box.waitFor({ state: "visible", timeout: 60_000 });
  if (!(await box.isChecked())) await box.check();
}

async function openPartnersFind(page) {
  await page.goto(`${BASE}/partners`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByRole("tab", { name: /Найти в RemCard/i }).click();
  await page.waitForTimeout(1200);
}

async function runSearch(page, { q, city, filterProductRe, filterServiceRe, filterStageRe }) {
  if (q != null) await page.getByLabel(/Поиск по имени/i).fill(q);
  if (city != null) {
    await page.locator('[class*="searchGrid"] input').nth(1).fill(city);
  }
  const filterInput = page.getByPlaceholder(/двери, сантехника/i);
  if (filterProductRe) {
    await filterInput.fill("двер");
    await ensureCheckbox(page, filterProductRe);
  }
  if (filterServiceRe) {
    await filterInput.fill("плит");
    await ensureCheckbox(page, filterServiceRe);
  }
  if (filterStageRe) {
    await filterInput.fill("диаг");
    await ensureCheckbox(page, filterStageRe);
  }
  await page.getByRole("button", { name: /^Найти$/i }).click();
  await page.getByText("Ищем партнёров…").waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(800);
}

function cardTitles(page) {
  return page.locator("h3").allTextContents();
}

async function partnerVisible(page, needle) {
  const titles = await cardTitles(page);
  return titles.some((t) => t.includes(needle));
}

async function runScenario(key, fn) {
  try {
    await fn();
    results.scenarios[key] = "PASS";
  } catch (err) {
    results.scenarios[key] = `FAIL: ${err instanceof Error ? err.message : String(err)}`;
    results.exitCode = 1;
  }
}

results.shas = {
  navigator: gitHead("/agent/repos/remcard-navigator"),
  platform: gitHead("/agent/repos/remcard-partner-platform"),
};

execSync("node /agent/repos/remcard-partner-platform/scripts/prof-h2-seed-pagination.mjs", {
  stdio: "inherit",
});

const tokenA = mintToken(USER_A);
const tokenB = mintToken(USER_B);

const workingName = `H2Accept ${Date.now().toString().slice(-6)}`;
const workingCity = "Краснодар";

const browser = await chromium.launch({ headless: true });

const { page: pageA, context: ctxA } = await cookieContext(browser, tokenA, {
  width: 1440,
  height: 900,
});
const { page: pageB, context: ctxB } = await cookieContext(browser, tokenB, {
  width: 1440,
  height: 900,
});

await runScenario("1_partner_a_basics_save_reload", async () => {
  await openBasics(pageA);
  await shot(pageA, "prof-h2-s1-a-basics-1440.png");
  await fillBasicsName(pageA, workingName);
  await fillBasicsCity(pageA, workingCity);
  await pageA.getByPlaceholder(/двери, плитка/i).fill("двер");
  await ensureCheckbox(pageA, /Двери/i);
  await pageA.getByPlaceholder(/двери, плитка/i).fill("плит");
  await ensureCheckbox(pageA, /Плитка/i);
  await pageA.getByPlaceholder(/двери, плитка/i).fill("диаг");
  await ensureCheckbox(pageA, /Диагностика/i);
  const optIn = pageA.getByLabel(/Показывать партнёрам в RemCard/i);
  if (!(await optIn.isChecked())) await optIn.check();
  await saveBasics(pageA);
  await shot(pageA, "prof-h2-s1-a-after-save.png");
  await pageA.reload({ waitUntil: "networkidle" });
  await pageA.waitForTimeout(2000);
  if ((await pageA.locator("#имя-представителя").inputValue()) !== workingName) {
    throw new Error("name not persisted after reload");
  }
  if ((await pageA.locator("#город").inputValue()) !== workingCity) {
    throw new Error("city not persisted after reload");
  }
  if (!(await pageA.getByLabel(/Показывать партнёрам в RemCard/i).isChecked())) {
    throw new Error("opt-in not persisted after reload");
  }
  await shot(pageA, "prof-h2-s1-a-after-reload.png");
});

await runScenario("2_partner_b_search_filters_card", async () => {
  await openPartnersFind(pageB);
  await runSearch(pageB, {
    q: workingName,
    city: workingCity,
    filterProductRe: /Двери/i,
    filterServiceRe: /Плитка/i,
    filterStageRe: /Диагностика/i,
  });
  if (!(await partnerVisible(pageB, workingName))) {
    throw new Error(`B did not find A by name ${workingName}`);
  }
  const body = await pageB.locator("body").innerText();
  if (!body.includes(workingCity)) throw new Error("card missing city");
  await shot(pageB, "prof-h2-s2-b-found-a.png");
});

await runScenario("3_visibility_toggle", async () => {
  await openBasics(pageA);
  await pageA.getByLabel(/Показывать партнёрам в RemCard/i).uncheck();
  await saveBasics(pageA);
  await openPartnersFind(pageB);
  await runSearch(pageB, { q: workingName, city: workingCity });
  if (await partnerVisible(pageB, workingName)) {
    throw new Error("A still visible after opt-out");
  }
  await shot(pageB, "prof-h2-s3-b-a-hidden.png");
  await openBasics(pageA);
  await pageA.getByLabel(/Показывать партнёрам в RemCard/i).check();
  await saveBasics(pageA);
  await openPartnersFind(pageB);
  await runSearch(pageB, { q: workingName, city: workingCity });
  if (!(await partnerVisible(pageB, workingName))) {
    throw new Error("A not visible after opt-in restore");
  }
  await shot(pageB, "prof-h2-s3-b-a-visible-again.png");
});

await runScenario("4_pagination_no_dupes_gaps", async () => {
  await openBasics(pageA);
  await pageA.getByLabel(/Показывать партнёрам в RemCard/i).uncheck();
  await saveBasics(pageA);

  const baseParams = {
    role: "pro",
    city: workingCity,
    product: "doors",
    service: "tiles",
    stage: "L1-0",
  };
  const expectedPartners = await fetchAllSearchPartners(tokenB, baseParams);
  const expectedTitles = expectedPartners.map((p) => partnerTitle(p));
  if (expectedTitles.length < 25) {
    throw new Error(`expected >=25 search hits, got ${expectedTitles.length}`);
  }
  await openPartnersFind(pageB);
  await pageB.getByLabel(/Поиск по имени/i).fill("");
  await pageB.locator('[class*="searchGrid"] input').nth(1).fill(workingCity);
  await runSearch(pageB, {
    city: workingCity,
    filterProductRe: /Двери/i,
    filterServiceRe: /Плитка/i,
    filterStageRe: /Диагностика/i,
  });
  const uiTitlesPage1 = await searchCardTitles(pageB);
  const loadMore = pageB.getByRole("button", { name: /Показать ещё/i });
  if (!(await loadMore.isVisible())) throw new Error("Показать ещё not visible");
  await loadMore.click();
  await pageB.waitForTimeout(3000);
  const uiTitlesAll = await searchCardTitles(pageB);
  await shot(pageB, "prof-h2-s4-pagination.png");
  const uniq = new Set(uiTitlesAll);
  if (uniq.size !== uiTitlesAll.length) throw new Error("duplicate cards in UI list");
  assertTitleSlice(expectedTitles, uiTitlesPage1, 0, 20);
  assertTitleSlice(expectedTitles, uiTitlesAll, 0, Math.min(40, expectedTitles.length));
});

await runScenario("5_unsaved_leave_guard", async () => {
  await openBasics(pageA);
  const draft = `DraftLeave ${Date.now().toString().slice(-5)}`;
  await fillBasicsName(pageA, draft);
  pageA.once("dialog", async (dialog) => {
    if (dialog.type() !== "confirm") return;
    await dialog.dismiss();
  });
  await pageA.getByRole("tab", { name: /Обзор/i }).click();
  await pageA.waitForTimeout(800);
  if ((await pageA.locator("#имя-представителя").inputValue()) !== draft) {
    throw new Error("draft name lost after cancelled leave");
  }
  await shot(pageA, "prof-h2-s5-cancel-leave.png");
  await saveBasics(pageA);
  let confirmSeen = false;
  pageA.on("dialog", () => {
    confirmSeen = true;
  });
  await pageA.getByRole("tab", { name: /Обзор/i }).click();
  await pageA.waitForTimeout(800);
  if (confirmSeen) throw new Error("confirm after save");
  await pageA.getByRole("tab", { name: /Основные данные/i }).click();
  await pageA.waitForTimeout(500);
});

await pageA.setViewportSize({ width: 390, height: 844 });
await pageA.waitForTimeout(400);
const overflow = await pageA.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
);
await shot(pageA, "prof-h2-browser-390.png");
results.scenarios.overflow_390 = overflow ? "FAIL: horizontal overflow" : "PASS";

await browser.close();

console.log(
  JSON.stringify(
    {
      ...results,
      workingName,
      command: "node scripts/prof-h2-browser-smoke.mjs",
    },
    null,
    2,
  ),
);

process.exit(results.exitCode);

async function searchCardTitles(page) {
  return page
    .locator("div")
    .filter({ has: page.getByRole("button", { name: /^Пригласить$/i }) })
    .locator("h3")
    .allTextContents();
}

function assertTitleSlice(expected, actual, start, count) {
  const slice = expected.slice(start, start + count);
  if (actual.length < slice.length) {
    throw new Error(`UI has ${actual.length} cards, expected at least ${slice.length}`);
  }
  for (let i = 0; i < slice.length; i++) {
    if (actual[i] !== slice[i]) {
      throw new Error(`order mismatch at ${i}: UI "${actual[i]}" vs API "${slice[i]}"`);
    }
  }
}
