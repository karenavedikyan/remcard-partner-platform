import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  GROUPED_ROW_PARITY_WIDTHS,
  GROUPED_STATUS_UPDATED_TOP_MAX_DELTA_PX,
  MIN_CLIENT_OPEN_BUTTON_HEIGHT_PX,
  MIN_CLIENT_OPEN_BUTTON_WIDTH_PX,
  PERSONAL_ROW_MOBILE_WIDTHS,
} from "./observer-personal-row-spec";

const repoRoot = path.resolve(__dirname, "../../..");
const harnessDir = path.join(repoRoot, "scripts/clients-parity-20261113/observer-list-harness");
const harnessUrl = "http://127.0.0.1:5377";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHarness(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(400);
  }
  throw new Error(`Harness not ready at ${url}`);
}

async function measureGroupedRowParity(page: Page) {
  return page.getByTestId("ca-observer-partner-page").getByTestId("ca-observer-client-row").first().evaluate((rowEl) => {
    const status = rowEl.querySelector('[class*="personalStatus"]');
    const updated = rowEl.querySelector('[class*="clientUpdated"]');
    const cs = getComputedStyle(rowEl);
    const sY = status?.getBoundingClientRect().top;
    const uY = updated?.getBoundingClientRect().top;
    return {
      gridTemplateAreas: cs.gridTemplateAreas,
      gridTemplateColumns: cs.gridTemplateColumns,
      statusTop: sY ?? null,
      updatedTop: uY ?? null,
      topDelta: sY != null && uY != null ? Math.abs(sY - uY) : null,
    };
  });
}

async function assertPartnerPageClientClickable(page: Page, innerWidth: number) {
  await page.setViewportSize({ width: innerWidth, height: 812 });
  await page.goto(`${harnessUrl}/?theme=dark`, { waitUntil: "networkidle" });
  await page.getByLabel(/Открыть партнёра:.*Бета/).click();
  await page.getByTestId("ca-observer-partner-page").waitFor({ state: "visible" });

  const row = page.getByTestId("ca-observer-partner-page").getByTestId("ca-observer-client-row").first();
  const openBtn = row.getByRole("button", { name: /Мария|Анна|Игорь/ });

  const box = await openBtn.boundingBox();
  expect(box, `open button box @${innerWidth}px`).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(MIN_CLIENT_OPEN_BUTTON_WIDTH_PX);
  expect(box!.height).toBeGreaterThanOrEqual(MIN_CLIENT_OPEN_BUTTON_HEIGHT_PX);

  const gridCols = await row.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(gridCols).not.toMatch(/^24px\s+0px/);

  const parity = await measureGroupedRowParity(page);
  expect(parity.gridTemplateAreas).toBe("none");
  expect(parity.topDelta).not.toBeNull();
  expect(parity.topDelta!).toBeLessThanOrEqual(GROUPED_STATUS_UPDATED_TOP_MAX_DELTA_PX);

  await openBtn.click();
  await page.getByTestId("ca-observer-client-page").waitFor({ state: "visible" });
  await page.getByRole("button", { name: /Назад/ }).click();
  await page.getByTestId("ca-observer-partner-page").waitFor({ state: "visible" });
}

let viteProc: ChildProcess | null = null;
let browser: Browser;

describe("observer mobile partner→client (Playwright harness, fixtures)", () => {
  beforeAll(async () => {
    viteProc = spawn("npx", ["vite", "--config", path.join(harnessDir, "vite.config.ts")], {
      cwd: harnessDir,
      stdio: "pipe",
      env: { ...process.env, BROWSER: "none" },
    });
    await waitForHarness(harnessUrl);
    browser = await chromium.launch();
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    viteProc?.kill("SIGTERM");
    viteProc = null;
  });

  for (const innerWidth of GROUPED_ROW_PARITY_WIDTHS) {
    it(`grouped status+updated same row @ ${innerWidth}px (|Δtop|≤1px)`, async () => {
      const context = await browser.newContext({ viewport: { width: innerWidth, height: 900 } });
      const page = await context.newPage();
      await page.goto(`${harnessUrl}/?theme=dark`, { waitUntil: "networkidle" });
      await page.getByLabel(/Открыть партнёра:.*Бета/).click();
      await page.getByTestId("ca-observer-partner-page").waitFor({ state: "visible" });
      const parity = await measureGroupedRowParity(page);
      expect(parity.gridTemplateAreas).toBe("none");
      expect(parity.topDelta!).toBeLessThanOrEqual(GROUPED_STATUS_UPDATED_TOP_MAX_DELTA_PX);
      await context.close();
    }, 60_000);
  }

  for (const innerWidth of PERSONAL_ROW_MOBILE_WIDTHS) {
    it(`partner «Салон Бета» → client @ ${innerWidth}px (real click)`, async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await assertPartnerPageClientClickable(page, innerWidth);
      await context.close();
    }, 60_000);
  }

  it("expanded grouped card client row is clickable @ 375px", async () => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(`${harnessUrl}/?theme=dark`, { waitUntil: "networkidle" });
    const card = page.getByTestId("ca-observer-partner-card").filter({ hasText: "Бета" });
    await card.locator("summary").click();
    const openBtn = card.getByTestId("ca-observer-client-row").first().getByRole("button", { name: /Мария/ });
    const box = await openBtn.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_CLIENT_OPEN_BUTTON_WIDTH_PX);
    await openBtn.click();
    await page.getByTestId("ca-observer-client-page").waitFor({ state: "visible" });
    await context.close();
  }, 60_000);

  it("flat list client row is clickable @ 375px", async () => {
    const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto(`${harnessUrl}/?theme=dark`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Списком/ }).click();
    const openBtn = page
      .getByTestId("ca-observer-client-row")
      .first()
      .getByRole("button", { name: /Анна|Игорь|Мария/ });
    const box = await openBtn.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(MIN_CLIENT_OPEN_BUTTON_WIDTH_PX);
    const parity = await page
      .getByTestId("ca-observer-client-row")
      .first()
      .evaluate((rowEl) => {
        const cs = getComputedStyle(rowEl);
        const cols = cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
        return { gridTemplateAreas: cs.gridTemplateAreas, hasZeroTrack: cols.some((c) => c === "0px") };
      });
    expect(parity.gridTemplateAreas).toBe("none");
    expect(parity.hasZeroTrack).toBe(false);
    await openBtn.click();
    await page.getByTestId("ca-observer-client-page").waitFor({ state: "visible" });
    await context.close();
  }, 60_000);

});
