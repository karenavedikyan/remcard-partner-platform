import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  expectedStatsGridColumnCount,
  parseComputedGridColumnCount,
} from "@/lib/clients-parity/observer-stats-grid-spec";

const repoRoot = path.resolve(__dirname, "../../../..");
const viteBin = path.join(repoRoot, "node_modules/.bin/vite");
const harnessDir = path.join(repoRoot, "scripts/clients-parity-20261113/observer-list-harness");
const harnessUrl = "http://127.0.0.1:5377";
const evidencePath = path.join(
  repoRoot,
  "audit/remcard-parallel-20261113/P3/harness-computed.json",
);

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

let viteProc: ChildProcess | null = null;
let browser: Browser;

describe("P3 observer list harness (computed, fixtures)", () => {
  beforeAll(async () => {
    try {
      browser = await chromium.launch();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes("Executable doesn't exist")) throw err;
      // publication env: chromium not installed — see audit P3 evidence plan
      return;
    }
    viteProc = spawn(viteBin, ["--config", path.join(harnessDir, "vite.config.ts")], {
      cwd: harnessDir,
      stdio: "pipe",
      env: { ...process.env, BROWSER: "none" },
    });
    await waitForHarness(harnessUrl);
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    viteProc?.kill("SIGTERM");
    viteProc = null;
  });

  it("captures KPI grid columns and disclosure metrics at prototype widths", async (ctx) => {
    if (!browser) ctx.skip();
    const widths = [1024, 375, 360] as const;
    const measures: Record<string, unknown> = { capturedAt: new Date().toISOString(), widths: {} };

    for (const innerWidth of widths) {
      const page = await browser.newPage();
      await page.setViewportSize({ width: innerWidth, height: 812 });
      await page.goto(`${harnessUrl}/?theme=light`, { waitUntil: "networkidle" });
      await page.getByTestId("ca-observer-partners-list").waitFor({ state: "visible" });

      const card = page.getByTestId("ca-observer-partner-card").first();
      const stats = card.locator("dl").first();
      const gridCols = await stats.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
      const colCount = parseComputedGridColumnCount(gridCols);
      const expected = expectedStatsGridColumnCount(innerWidth);

      const summary = card.locator("details summary").first();
      const summaryBox = await summary.boundingBox();

      measures.widths[String(innerWidth)] = {
        gridTemplateColumns: gridCols,
        columnCount: colCount,
        expectedColumnCount: expected,
        summaryMinHeight: summaryBox?.height ?? null,
      };

      expect(colCount).toBe(expected);
      expect(summaryBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      await page.close();
    }

    fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
    fs.writeFileSync(evidencePath, `${JSON.stringify(measures, null, 2)}\n`);
  });
});
