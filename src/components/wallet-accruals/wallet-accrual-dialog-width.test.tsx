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
