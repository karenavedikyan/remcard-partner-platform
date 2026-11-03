/**
 * Regression: wallet quick-action <dialog> must not shrink-wrap to ~40px when
 * .wallet-accrual-dialog__inner uses container-type:inline-size.
 *
 * Kind: CSS binding (a)+(b) + Playwright native geometry (c) in this colocated file.
 * No product TSX changes. WalletAccrualsShell.tsx stays byte-identical to base.
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { describe, expect, it } from "vitest";
import { formatMoneyRub } from "@/lib/history-format";

const cssPath = path.join(__dirname, "wallet-accruals.global.css");

/** Production formatter amounts (ru-RU groups with U+00A0 NBSP, then ordinary space + ₽). */
const TILE_AMOUNTS = [
  { testId: "wallet-detail-stat-confirmed", value: 9_999_999, label: "Подтверждено" },
  { testId: "wallet-detail-stat-waiting", value: 9_999_999_999, label: "Ожидает" },
  { testId: "wallet-detail-stat-suspended", value: 99_999_999_999.99, label: "Приостановлено" },
] as const;
const ROW_BADGE_AMOUNT = 1400;
const TILE_EXPECTED = TILE_AMOUNTS.map((t) => ({
  testId: t.testId,
  formatted: formatMoneyRub(t.value),
  label: t.label,
}));
const BADGE_EXPECTED = formatMoneyRub(ROW_BADGE_AMOUNT);

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 2038, height: 982 },
] as const;

export type DialogWidthMeasurement = {
  viewport: { width: number; height: number };
  dialogWidth: number;
  dialogHeight: number;
  innerWidth: number;
  innerContainerType: string;
};

function extractRuleBlock(css: string, selector: string): string {
  const idx = css.indexOf(selector);
  if (idx < 0) throw new Error(`Missing selector ${selector}`);
  const start = css.indexOf("{", idx);
  let depth = 0;
  let end = start;
  for (let i = start; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  return css.slice(start + 1, end);
}

const LONG_UNBROKEN =
  "Сертификат на услуги премиум-класса с очень длинным описанием основания начисления без пробелов_и_переносов_по_умолчанию";

function buildFixtureHtml(cssText: string): string {
  return `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root {
  --pw-line: #d7d2cc; --pw-radius: 12px; --pw-bg: #fff; --pw-text: #1d1d1f;
  --pw-muted: #5a6068; --pw-2: 8px; --pw-3: 12px; --pw-4: 16px;
  --pw-accent: #b52a2e; --wallet-accrual-ink-muted: #5a6068;
  --wallet-accrual-ink-muted-strong: #5a6068;
}
body { margin: 0; font-family: Manrope, system-ui, sans-serif; }
</style>
<style id="wallet-accruals-css">${cssText}</style>
</head><body>
<dialog class="wallet-accrual-dialog" open>
  <form method="dialog" class="wallet-accrual-dialog__inner">
    <div class="wallet-accrual-dialog__head">
      <h3>Ожидает · входящие</h3>
      <button type="button" class="wallet-accrual-dialog__close" aria-label="Закрыть">×</button>
    </div>
    <p style="font-size:12px">Партнёр · № 9988776655 · 1 234 567,89 ₽</p>
    <button type="button" style="min-height:44px;min-width:44px;font-size:12px">Закрыть</button>
  </form>
</dialog>
</body></html>`;
}

/** Fixture with real formatMoneyRub tile amounts + long unbroken row. */
function buildWrapFixtureHtml(cssText: string, theme: "light" | "dark" = "light"): string {
  const themeAttr = theme === "dark" ? ' data-theme="dark"' : "";
  const tilesHtml = TILE_EXPECTED.map(
    (t) => `      <div class="wallet-accrual-stat-tiles__tile" data-testid="${t.testId}">
        <strong>${t.formatted}</strong>
        <span>${t.label}</span>
      </div>`,
  ).join("\n");
  return `<!DOCTYPE html>
<html lang="ru"${themeAttr}><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
:root {
  --pw-line: #d7d2cc; --pw-radius: 12px; --pw-bg: #fff; --pw-text: #1d1d1f;
  --pw-muted: #5a6068; --pw-2: 8px; --pw-3: 12px; --pw-4: 16px;
  --pw-accent: #b52a2e; --wallet-accrual-ink-muted: #5a6068;
  --wallet-accrual-ink-muted-strong: #5a6068;
  --wallet-accrual-ink-muted-on-dark: #b8bec6;
}
html[data-theme="dark"] {
  --pw-bg: #171a17; --pw-text: #f2f2f0; --pw-line: #3a3f3a; --pw-muted: #b8bec6;
}
body { margin: 0; font-family: Manrope, system-ui, sans-serif; background: var(--pw-bg); color: var(--pw-text); }
</style>
<style id="wallet-accruals-css">${cssText}</style>
</head><body>
<dialog class="wallet-accrual-dialog" open data-testid="wrap-dialog">
  <form method="dialog" class="wallet-accrual-dialog__inner">
    <div class="wallet-accrual-dialog__head">
      <h3>График · исходящие</h3>
      <button type="button" class="wallet-accrual-dialog__close" aria-label="Закрыть">×</button>
    </div>
    <div class="wallet-accrual-stat-tiles" data-testid="wallet-detail-stat-tiles">
${tilesHtml}
    </div>
    <div class="wallet-accrual-row-list">
      <button type="button" class="wallet-accrual-row wallet-accruals-history__row" data-testid="wrap-long-row">
        <span class="wallet-accrual-row__main">
          <strong class="wallet-accrual-row__title">${LONG_UNBROKEN}</strong>
          <span class="wallet-accrual-row__sub">Партнёр · № order-long-1</span>
        </span>
        <span class="wallet-status-badge wallet-status-badge--confirmed">
          <span class="wallet-status-badge__amount">${BADGE_EXPECTED}</span>
        </span>
      </button>
    </div>
    <button type="button" class="pw-btn primary" style="min-height:44px;min-width:44px;font-size:12px">Закрыть</button>
  </form>
</dialog>
</body></html>`;
}

function isMissingBrowserError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("Executable doesn't exist");
}

/**
 * Launch Chromium for geometry checks.
 * Prefer WALLET_QA_CHROME / CHROME_BIN when set; otherwise Playwright default.
 * Returns null when the bundled (or pointed) binary is missing so callers can skip.
 */
export async function launchGeometryBrowser(): Promise<Browser | null> {
  const executablePath =
    process.env.WALLET_QA_CHROME?.trim() ||
    process.env.CHROME_BIN?.trim() ||
    undefined;
  try {
    return await chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    });
  } catch (err) {
    if (isMissingBrowserError(err)) {
      console.warn(
        "[wallet-accrual-dialog-width] Skipping Playwright geometry: browser executable missing.",
        executablePath
          ? `(tried executablePath=${executablePath})`
          : "(Playwright bundled Chromium not installed; set WALLET_QA_CHROME or CHROME_BIN)",
        err instanceof Error ? err.message : err,
      );
      return null;
    }
    throw err;
  }
}

/** Native Chromium geometry against an arbitrary CSS string (used for RED/GREEN proof). */
export async function measureDialogWidths(
  cssText: string,
  viewports: readonly { width: number; height: number }[] = VIEWPORTS,
  browser?: Browser,
): Promise<DialogWidthMeasurement[]> {
  const dir = mkdtempSync(path.join(tmpdir(), "wallet-dialog-width-"));
  const htmlPath = path.join(dir, "fixture.html");
  writeFileSync(htmlPath, buildFixtureHtml(cssText), "utf8");
  const owned = !browser;
  const launched = browser ?? (await launchGeometryBrowser());
  if (!launched) {
    throw new Error("Executable doesn't exist");
  }
  const measurements: DialogWidthMeasurement[] = [];
  try {
    for (const viewport of viewports) {
      const page = await launched.newPage({ viewport });
      await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
      const metrics = await page.evaluate(() => {
        const dlg = document.querySelector("dialog.wallet-accrual-dialog");
        const inner = document.querySelector("form.wallet-accrual-dialog__inner");
        if (!dlg || !inner) return null;
        const dr = dlg.getBoundingClientRect();
        const ir = inner.getBoundingClientRect();
        return {
          dialogWidth: dr.width,
          dialogHeight: dr.height,
          innerWidth: ir.width,
          innerContainerType: getComputedStyle(inner).containerType,
        };
      });
      await page.close();
      if (!metrics) throw new Error(`missing dialog at ${viewport.width}`);
      measurements.push({ viewport, ...metrics });
    }
  } finally {
    if (owned) await launched.close();
    rmSync(dir, { recursive: true, force: true });
  }
  return measurements;
}

describe("wallet-accrual-dialog width (inline-size collapse regression)", () => {
  const css = readFileSync(cssPath, "utf8");
  const dialogBlock = extractRuleBlock(css, ".wallet-accrual-dialog {");
  const innerBlock = extractRuleBlock(css, ".wallet-accrual-dialog__inner {");

  it("(a) dialog rule sets explicit width or min-inline-size as min(560px, calc(100vw - …))", () => {
    const decls = dialogBlock.replace(/\/\*[\s\S]*?\*\//g, " ");
    const widthDecl =
      decls.match(/(?:^|[;\s{])width\s*:\s*([^;]+);/)?.[1]?.trim() ??
      decls.match(/(?:^|[;\s{])min-inline-size\s*:\s*([^;]+);/)?.[1]?.trim();
    expect(widthDecl, "dialog must declare width or min-inline-size").toBeTruthy();
    expect(widthDecl!).toMatch(/min\(\s*560px\s*,\s*calc\(\s*100vw\s*-\s*[^)]+\)\s*\)/);
  });

  it("(b) inner form remains the named container; dialog supplies width", () => {
    expect(innerBlock).toMatch(/container-type\s*:\s*inline-size/);
    expect(innerBlock).toMatch(/container-name\s*:\s*wallet-accrual-dialog/);
    expect(dialogBlock.replace(/\/\*[\s\S]*?\*\//g, " ")).toMatch(
      /(?:^|[;\s{])(?:width|min-inline-size)\s*:/,
    );
    expect(css).toMatch(
      /@container\s+wallet-accrual-dialog\s*\(\s*max-width:\s*480px\s*\)/,
    );
  });

  it("(c) Playwright native geometry: width >=280 at 375 and ~560 at 2038", async (ctx) => {
    const browser = await launchGeometryBrowser();
    if (!browser) {
      ctx.skip();
      return;
    }
    try {
      const measurements = await measureDialogWidths(css, VIEWPORTS, browser);
      const at375 = measurements.find((m) => m.viewport.width === 375);
      const at2038 = measurements.find((m) => m.viewport.width === 2038);
      expect(at375).toBeTruthy();
      expect(at2038).toBeTruthy();
      expect(at375!.dialogWidth).toBeGreaterThanOrEqual(280);
      expect(at2038!.dialogWidth).toBeGreaterThanOrEqual(560);
      expect(at2038!.dialogWidth).toBeLessThanOrEqual(564);
      expect(at375!.innerContainerType).toMatch(/inline-size|size/);
    } finally {
      await browser.close();
    }
  });
});

export type TileAmountFitMeasurement = {
  viewport: { width: number; height: number };
  theme: "light" | "dark";
  dialogWidth: number;
  overflowing: { tag: string; className: string; scrollWidth: number; clientWidth: number }[];
  tiles: {
    tileTestId: string;
    amount: string;
    label: string;
    strongScrollWidth: number;
    strongClientWidth: number;
    textRight: number;
    labelRight: number;
    tileRight: number;
  }[];
  badgeAmount: string;
};

const STACKED_VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
] as const;

const DESKTOP_VIEWPORTS = [
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 2038, height: 982 },
] as const;

/**
 * Native Chromium: real formatMoneyRub amounts must fit inside tiles
 * (stacked at 320/375, 3-column at 768/1440/2038). No forced nowrap.
 */
export async function measureTileAmountFit(
  cssText: string,
  viewports: readonly { width: number; height: number }[],
  themes: readonly ("light" | "dark")[] = ["light", "dark"],
  browser?: Browser,
): Promise<TileAmountFitMeasurement[]> {
  const dir = mkdtempSync(path.join(tmpdir(), "wallet-dialog-tile-amounts-"));
  const owned = !browser;
  const launched = browser ?? (await launchGeometryBrowser());
  if (!launched) {
    throw new Error("Executable doesn't exist");
  }
  const results: TileAmountFitMeasurement[] = [];
  try {
    for (const theme of themes) {
      const htmlPath = path.join(dir, `fixture-${theme}.html`);
      writeFileSync(htmlPath, buildWrapFixtureHtml(cssText, theme), "utf8");
      for (const viewport of viewports) {
        const page = await launched.newPage({ viewport });
        await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
        const metrics = await page.evaluate(() => {
          const dlg = document.querySelector("dialog.wallet-accrual-dialog");
          if (!dlg) return null;
          const dialogWidth = dlg.getBoundingClientRect().width;
          const overflowing: {
            tag: string;
            className: string;
            scrollWidth: number;
            clientWidth: number;
          }[] = [];
          for (const el of Array.from(dlg.querySelectorAll("*"))) {
            const htmlEl = el as HTMLElement;
            if (htmlEl.scrollWidth > htmlEl.clientWidth + 1) {
              overflowing.push({
                tag: htmlEl.tagName.toLowerCase(),
                className: String(htmlEl.className || ""),
                scrollWidth: htmlEl.scrollWidth,
                clientWidth: htmlEl.clientWidth,
              });
            }
          }
          if ((dlg as HTMLElement).scrollWidth > (dlg as HTMLElement).clientWidth + 1) {
            overflowing.push({
              tag: "dialog",
              className: dlg.className,
              scrollWidth: (dlg as HTMLElement).scrollWidth,
              clientWidth: (dlg as HTMLElement).clientWidth,
            });
          }
          const tiles: {
            tileTestId: string;
            amount: string;
            label: string;
            strongScrollWidth: number;
            strongClientWidth: number;
            textRight: number;
            labelRight: number;
            tileRight: number;
          }[] = [];
          for (const tile of Array.from(
            dlg.querySelectorAll(".wallet-accrual-stat-tiles__tile"),
          )) {
            const strong = tile.querySelector("strong");
            const span = tile.querySelector("span");
            if (!strong || !span) continue;
            const range = document.createRange();
            range.selectNodeContents(strong);
            const rects = Array.from(range.getClientRects());
            const textRight =
              rects.length === 0
                ? strong.getBoundingClientRect().right
                : Math.max(...rects.map((r) => r.right));
            const tileRight = tile.getBoundingClientRect().right;
            tiles.push({
              tileTestId: (tile as HTMLElement).dataset.testid || "",
              amount: strong.textContent ?? "",
              label: span.textContent ?? "",
              strongScrollWidth: strong.scrollWidth,
              strongClientWidth: strong.clientWidth,
              textRight,
              labelRight: span.getBoundingClientRect().right,
              tileRight,
            });
          }
          const badge = dlg.querySelector(".wallet-status-badge__amount");
          return {
            dialogWidth,
            overflowing,
            tiles,
            badgeAmount: badge?.textContent ?? "",
          };
        });
        await page.close();
        if (!metrics) throw new Error(`missing dialog at ${viewport.width} ${theme}`);
        results.push({ viewport, theme, ...metrics });
      }
    }
  } finally {
    if (owned) await launched.close();
    rmSync(dir, { recursive: true, force: true });
  }
  return results;
}

function assertTileAmountFit(m: TileAmountFitMeasurement) {
  expect(m.tiles.length).toBe(TILE_EXPECTED.length);
  expect(
    m.overflowing,
    `overflow at ${m.viewport.width}px ${m.theme}: ${JSON.stringify(m.overflowing)}`,
  ).toEqual([]);
  expect(m.badgeAmount).toBe(BADGE_EXPECTED);
  for (const expected of TILE_EXPECTED) {
    const tile = m.tiles.find((t) => t.tileTestId === expected.testId);
    expect(tile, `missing tile ${expected.testId}`).toBeTruthy();
    expect(
      tile!.amount,
      `formatMoneyRub mismatch ${expected.testId} @ ${m.viewport.width} ${m.theme}`,
    ).toBe(expected.formatted);
    expect(
      tile!.strongScrollWidth,
      `strong overflow ${expected.testId} @ ${m.viewport.width} ${m.theme}: scroll=${tile!.strongScrollWidth} client=${tile!.strongClientWidth}`,
    ).toBeLessThanOrEqual(tile!.strongClientWidth + 1);
    expect(
      tile!.textRight,
      `amount past tile edge ${expected.testId} @ ${m.viewport.width} ${m.theme}`,
    ).toBeLessThanOrEqual(tile!.tileRight + 1);
    expect(
      tile!.labelRight,
      `label past tile edge ${expected.testId} @ ${m.viewport.width} ${m.theme}`,
    ).toBeLessThanOrEqual(tile!.tileRight + 1);
  }
}

describe("wallet-accrual-dialog tile amounts (formatMoneyRub, stacked 320/375)", () => {
  const css = readFileSync(cssPath, "utf8");

  it("Playwright: real NBSP amounts fit; exact formatMoneyRub; labels inside tiles", async (ctx) => {
    process.env.CHROME_BIN ||= "/usr/local/bin/google-chrome";
    const browser = await launchGeometryBrowser();
    if (!browser) {
      ctx.skip();
      return;
    }
    try {
      const measurements = await measureTileAmountFit(
        css,
        STACKED_VIEWPORTS,
        ["light", "dark"],
        browser,
      );
      expect(measurements).toHaveLength(4);
      for (const m of measurements) {
        assertTileAmountFit(m);
      }
    } finally {
      await browser.close();
    }
  });
});

describe("wallet-accrual-dialog tile amounts (formatMoneyRub, 3-column desktop)", () => {
  const css = readFileSync(cssPath, "utf8");

  it("Playwright: real NBSP amounts fit at 768/1440/2038 light+dark (no nowrap)", async (ctx) => {
    process.env.CHROME_BIN ||= "/usr/local/bin/google-chrome";
    const browser = await launchGeometryBrowser();
    if (!browser) {
      ctx.skip();
      return;
    }
    try {
      const measurements = await measureTileAmountFit(
        css,
        DESKTOP_VIEWPORTS,
        ["light", "dark"],
        browser,
      );
      expect(measurements).toHaveLength(6);
      for (const m of measurements) {
        expect(m.dialogWidth).toBeGreaterThanOrEqual(550);
        expect(m.dialogWidth).toBeLessThanOrEqual(564);
        assertTileAmountFit(m);
      }
    } finally {
      await browser.close();
    }
  });
});
