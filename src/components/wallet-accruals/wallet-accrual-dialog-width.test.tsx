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

const cssPath = path.join(__dirname, "wallet-accruals.global.css");

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

/** Large formatted amounts that fit at 4f64b8cf (wrap at spaces) but overflow with global nowrap. */
const AMOUNT_LARGE_INT = "9 999 999 999 ₽";
const AMOUNT_LARGE_FRAC = "99 999 999 999,99 ₽";

/** Fixture with stat tiles + long unbroken row (320/375 overflow regression). */
function buildWrapFixtureHtml(cssText: string, theme: "light" | "dark" = "light"): string {
  const themeAttr = theme === "dark" ? ' data-theme="dark"' : "";
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
      <div class="wallet-accrual-stat-tiles__tile" data-testid="wallet-detail-stat-confirmed">
        <strong>${AMOUNT_LARGE_INT}</strong>
        <span>Подтверждено</span>
      </div>
      <div class="wallet-accrual-stat-tiles__tile" data-testid="wallet-detail-stat-waiting">
        <strong>${AMOUNT_LARGE_FRAC}</strong>
        <span>Ожидает</span>
      </div>
      <div class="wallet-accrual-stat-tiles__tile" data-testid="wallet-detail-stat-suspended">
        <strong>${AMOUNT_LARGE_FRAC}</strong>
        <span>Приостановлено</span>
      </div>
    </div>
    <div class="wallet-accrual-row-list">
      <button type="button" class="wallet-accrual-row wallet-accruals-history__row" data-testid="wrap-long-row">
        <span class="wallet-accrual-row__main">
          <strong class="wallet-accrual-row__title">${LONG_UNBROKEN}</strong>
          <span class="wallet-accrual-row__sub">Партнёр · № order-long-1</span>
        </span>
        <span class="wallet-status-badge wallet-status-badge--confirmed">
          <span class="wallet-status-badge__amount">${AMOUNT_LARGE_INT}</span>
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

export type DialogWrapMeasurement = {
  viewport: { width: number; height: number };
  theme: "light" | "dark";
  overflowing: { tag: string; className: string; scrollWidth: number; clientWidth: number }[];
  tileLabelOverflow: {
    tileTestId: string;
    labelRight: number;
    tileRight: number;
  }[];
};

/** Native Chromium: no horizontal overflow in dialog content at narrow viewports. */
export async function measureDialogWrap(
  cssText: string,
  viewports: readonly { width: number; height: number }[] = [
    { width: 320, height: 640 },
    { width: 375, height: 812 },
  ],
  themes: readonly ("light" | "dark")[] = ["light", "dark"],
  browser?: Browser,
): Promise<DialogWrapMeasurement[]> {
  const dir = mkdtempSync(path.join(tmpdir(), "wallet-dialog-wrap-"));
  const owned = !browser;
  const launched = browser ?? (await launchGeometryBrowser());
  if (!launched) {
    throw new Error("Executable doesn't exist");
  }
  const results: DialogWrapMeasurement[] = [];
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
          const tileLabelOverflow: {
            tileTestId: string;
            labelRight: number;
            tileRight: number;
          }[] = [];
          for (const tile of Array.from(
            dlg.querySelectorAll(".wallet-accrual-stat-tiles__tile"),
          )) {
            const span = tile.querySelector("span");
            if (!span) continue;
            const tileRect = tile.getBoundingClientRect();
            const labelRect = span.getBoundingClientRect();
            tileLabelOverflow.push({
              tileTestId: (tile as HTMLElement).dataset.testid || "",
              labelRight: labelRect.right,
              tileRight: tileRect.right,
            });
          }
          return { overflowing, tileLabelOverflow };
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

export type DesktopTileAmountFit = {
  viewport: { width: number; height: number };
  dialogWidth: number;
  tiles: {
    tileTestId: string;
    amount: string;
    strongScrollWidth: number;
    strongClientWidth: number;
    textRight: number;
    tileRight: number;
  }[];
};

/**
 * Native Chromium: large amounts must fit inside 3-column tiles in a ~560px dialog
 * (desktop viewports). Fails when global white-space:nowrap prevents wrapping at spaces.
 */
export async function measureDesktopTileAmountFit(
  cssText: string,
  viewports: readonly { width: number; height: number }[] = [
    { width: 768, height: 1024 },
    { width: 1440, height: 900 },
    { width: 2038, height: 982 },
  ],
  browser?: Browser,
): Promise<DesktopTileAmountFit[]> {
  const dir = mkdtempSync(path.join(tmpdir(), "wallet-dialog-desktop-amounts-"));
  const htmlPath = path.join(dir, "fixture.html");
  writeFileSync(htmlPath, buildWrapFixtureHtml(cssText, "light"), "utf8");
  const owned = !browser;
  const launched = browser ?? (await launchGeometryBrowser());
  if (!launched) {
    throw new Error("Executable doesn't exist");
  }
  const results: DesktopTileAmountFit[] = [];
  try {
    for (const viewport of viewports) {
      const page = await launched.newPage({ viewport });
      await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
      const metrics = await page.evaluate(() => {
        const dlg = document.querySelector("dialog.wallet-accrual-dialog");
        if (!dlg) return null;
        const dialogWidth = dlg.getBoundingClientRect().width;
        const tiles: {
          tileTestId: string;
          amount: string;
          strongScrollWidth: number;
          strongClientWidth: number;
          textRight: number;
          tileRight: number;
        }[] = [];
        for (const tile of Array.from(
          dlg.querySelectorAll(".wallet-accrual-stat-tiles__tile"),
        )) {
          const strong = tile.querySelector("strong");
          if (!strong) continue;
          const range = document.createRange();
          range.selectNodeContents(strong);
          const rects = Array.from(range.getClientRects());
          const textRight =
            rects.length === 0
              ? strong.getBoundingClientRect().right
              : Math.max(...rects.map((r) => r.right));
          tiles.push({
            tileTestId: (tile as HTMLElement).dataset.testid || "",
            amount: strong.textContent?.trim() || "",
            strongScrollWidth: strong.scrollWidth,
            strongClientWidth: strong.clientWidth,
            textRight,
            tileRight: tile.getBoundingClientRect().right,
          });
        }
        return { dialogWidth, tiles };
      });
      await page.close();
      if (!metrics) throw new Error(`missing dialog at ${viewport.width}`);
      results.push({ viewport, ...metrics });
    }
  } finally {
    if (owned) await launched.close();
    rmSync(dir, { recursive: true, force: true });
  }
  return results;
}

describe("wallet-accrual-dialog content wrap at 320/375", () => {
  const css = readFileSync(cssPath, "utf8");

  it("Playwright: no horizontal overflow; tile labels stay inside tiles", async (ctx) => {
    process.env.CHROME_BIN ||= "/usr/local/bin/google-chrome";
    const browser = await launchGeometryBrowser();
    if (!browser) {
      ctx.skip();
      return;
    }
    try {
      const measurements = await measureDialogWrap(css, undefined, undefined, browser);
      expect(measurements.length).toBeGreaterThanOrEqual(4);
      for (const m of measurements) {
        expect(
          m.overflowing,
          `overflow at ${m.viewport.width}px ${m.theme}: ${JSON.stringify(m.overflowing)}`,
        ).toEqual([]);
        for (const tile of m.tileLabelOverflow) {
          expect(
            tile.labelRight,
            `label past tile edge (${tile.tileTestId} @ ${m.viewport.width} ${m.theme})`,
          ).toBeLessThanOrEqual(tile.tileRight + 1);
        }
      }
    } finally {
      await browser.close();
    }
  });
});

describe("wallet-accrual-dialog desktop tile amounts (3-column, ~560px)", () => {
  const css = readFileSync(cssPath, "utf8");

  it("Playwright: large amounts fit inside tiles at 768/1440/2038 (no global nowrap)", async (ctx) => {
    process.env.CHROME_BIN ||= "/usr/local/bin/google-chrome";
    const browser = await launchGeometryBrowser();
    if (!browser) {
      ctx.skip();
      return;
    }
    try {
      const measurements = await measureDesktopTileAmountFit(css, undefined, browser);
      expect(measurements).toHaveLength(3);
      for (const m of measurements) {
        expect(m.dialogWidth).toBeGreaterThanOrEqual(550);
        expect(m.dialogWidth).toBeLessThanOrEqual(564);
        expect(m.tiles.length).toBe(3);
        for (const tile of m.tiles) {
          expect(
            tile.strongScrollWidth,
            `strong overflow ${tile.tileTestId} «${tile.amount}» @ ${m.viewport.width}: scroll=${tile.strongScrollWidth} client=${tile.strongClientWidth}`,
          ).toBeLessThanOrEqual(tile.strongClientWidth + 1);
          expect(
            tile.textRight,
            `amount past tile edge ${tile.tileTestId} «${tile.amount}» @ ${m.viewport.width}: textRight=${tile.textRight} tileRight=${tile.tileRight}`,
          ).toBeLessThanOrEqual(tile.tileRight + 1);
        }
      }
    } finally {
      await browser.close();
    }
  });
});
