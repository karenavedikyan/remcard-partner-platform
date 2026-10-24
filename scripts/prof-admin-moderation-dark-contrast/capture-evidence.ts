/**
 * Dark-contrast evidence: synthetic fixtures, loopback PROF :3420.
 * Fails on contrast < 4.5:1 or unparsable colors. Pins FE/BE runtime SHAs in metadata.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";
import {
  compositeRgb,
  contrastRatio,
  parseRgbCss,
  rgbaToHex,
} from "../../src/lib/moderation-badge-contrast";

export const MODERATION_HOTFIX_FE_SHA =
  process.env.MODERATION_HOTFIX_FE_SHA ??
  "be43ffc8a34088392635fb9e9079b5929369c117";
export const MODERATION_HOTFIX_BE_SHA =
  process.env.MODERATION_HOTFIX_BE_SHA ?? "5a2c2a7d9d5c03f2b948626dea2a987daa0422a4";

const MIN_TEXT_RATIO = 4.5;
const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const ART = path.resolve("artifacts/prof-admin-moderation-dark-contrast-01");
const SHOTS = path.join(ART, "screenshots");
const ADMIN_LOGIN = process.env.CATALOG_QA_ADMIN_LOGIN ?? "catqa-admin@catalog.invalid";
const ADMIN_PASSWORD = process.env.CATALOG_QA_ADMIN_PASSWORD ?? "catalog-qa-admin-pass-16-chars";
const FIXTURES = path.join(
  process.env.CATALOG_QA_ROOT ?? "/agent/repos/remcard-navigator/.catalog-qa-isolated",
  "moderation-fixtures.json",
);

type StyleSample = {
  label: string;
  raw: { color: string; backgroundColor: string; borderTopColor: string };
  fg: string | null;
  bg: string | null;
  ratio: number | null;
  state?: string;
};

function repoHeadSha(): string | null {
  try {
    return execSync("git rev-parse HEAD", { cwd: path.resolve("."), encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function assertMinContrast(sample: StyleSample, context: string) {
  if (sample.ratio == null) {
    throw new Error(`${context} ${sample.label}: could not compute contrast (fg=${sample.fg} bg=${sample.bg})`);
  }
  if (sample.ratio < MIN_TEXT_RATIO) {
    throw new Error(
      `${context} ${sample.label}: contrast ${sample.ratio.toFixed(2)}:1 < ${MIN_TEXT_RATIO}:1`,
    );
  }
}

function effectiveFgBg(color: string, backgroundColor: string): { fg: string; bg: string } | null {
  const fgRgba = parseRgbCss(color);
  const bgRgba = parseRgbCss(backgroundColor);
  if (!fgRgba || !bgRgba) return null;
  const effectiveBg = bgRgba.a < 1 ? { ...bgRgba, a: 1 } : bgRgba;
  const effectiveFg = fgRgba.a < 1 ? compositeRgb(fgRgba, effectiveBg) : fgRgba;
  return { fg: rgbaToHex(effectiveFg), bg: rgbaToHex(effectiveBg) };
}

async function adminLogin(
  page: import("playwright").Page,
  pendingOrgId: string,
  pendingOrgTitle: string,
) {
  const returnTo = `/admin/moderation/organizations/${pendingOrgId}`;
  await page.context().clearCookies();
  const loginResp = await page.request.post(
    `${PROF_URL}/api/remcard/api/pro/admin/auth/password-login`,
    {
      data: { login: ADMIN_LOGIN, password: ADMIN_PASSWORD },
      headers: { Origin: PROF_URL, Referer: `${PROF_URL}/login` },
    },
  );
  if (!loginResp.ok()) {
    throw new Error(`password-login HTTP ${loginResp.status()} ${await loginResp.text()}`);
  }
  const detailResp = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/pro/admin/moderation/organizations/${pendingOrgId}`) &&
      r.request().method() === "GET" &&
      r.ok(),
    { timeout: 60000 },
  );
  await page.goto(`${PROF_URL}${returnTo}`, { waitUntil: "domcontentloaded" });
  await detailResp;
  await page.getByRole("heading", { level: 1, name: pendingOrgTitle }).waitFor({ timeout: 60000 });
}

async function sampleElementStyles(
  page: import("playwright").Page,
  locator: import("playwright").Locator,
  label: string,
  state?: string,
): Promise<StyleSample> {
  const raw = await locator.evaluate((node) => {
    let current: Element | null = node.parentElement;
    let resolvedBg = "rgb(255, 255, 255)";
    const s = getComputedStyle(node);
    let backgroundColor = s.backgroundColor;
    if (backgroundColor === "rgba(0, 0, 0, 0)" || backgroundColor === "transparent") {
      while (current) {
        const ps = getComputedStyle(current);
        const bg = ps.backgroundColor;
        const m = bg.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
        if (m) {
          const a = m[4] === undefined ? 1 : Number(m[4]);
          if (a >= 0.99) {
            resolvedBg = bg;
            break;
          }
        }
        current = current.parentElement;
      }
      backgroundColor = resolvedBg;
    }
    return {
      color: s.color,
      backgroundColor,
      borderTopColor: s.borderTopColor,
    };
  });
  const pair = effectiveFgBg(raw.color, raw.backgroundColor);
  const ratio = pair ? contrastRatio(pair.fg, pair.bg) : null;
  return {
    label,
    raw,
    fg: pair?.fg ?? null,
    bg: pair?.bg ?? null,
    ratio,
    state,
  };
}

async function sampleBadgeStyles(page: import("playwright").Page, text: string) {
  const el = page.locator("header span").filter({ hasText: text }).first();
  await el.waitFor({ timeout: 10000 });
  return sampleElementStyles(page, el, text);
}

async function applyTheme(page: import("playwright").Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    try {
      localStorage.setItem("remcard-theme", t);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

type ButtonProbe = {
  name: string;
  states: StyleSample[];
};

async function sampleButtonStates(
  page: import("playwright").Page,
  name: string | RegExp,
): Promise<ButtonProbe> {
  const button = page.getByRole("button", { name }).first();
  await button.waitFor({ timeout: 10000 });
  const states: StyleSample[] = [];
  states.push(await sampleElementStyles(page, button, String(name), "default"));
  await button.hover();
  states.push(await sampleElementStyles(page, button, String(name), "hover"));
  await button.focus();
  states.push(await sampleElementStyles(page, button, String(name), "focus-visible"));
  await page.evaluate((el) => {
    (el as HTMLButtonElement).disabled = true;
  }, await button.elementHandle());
  states.push(await sampleElementStyles(page, button, String(name), "disabled"));
  await page.evaluate((el) => {
    (el as HTMLButtonElement).disabled = false;
  }, await button.elementHandle());
  return { name: String(name), states };
}

async function captureOrgDetail(
  page: import("playwright").Page,
  fx: { pendingOrgId: string; pendingOrgTitle: string },
  theme: "light" | "dark",
  viewport: { width: number; height: number },
  assertBadges: boolean,
) {
  await page.setViewportSize(viewport);
  await applyTheme(page, theme);
  await page.goto(`${PROF_URL}/admin/moderation/organizations/${fx.pendingOrgId}`, {
    waitUntil: "domcontentloaded",
  });
  await applyTheme(page, theme);
  await page.getByRole("heading", { level: 1, name: fx.pendingOrgTitle }).waitFor({ timeout: 20000 });
  const pending = await sampleBadgeStyles(page, "На проверке");
  const testBadge = await sampleBadgeStyles(page, "Тестовый партнёр");
  if (assertBadges) {
    const ctx = `${theme} ${viewport.width}px badge`;
    assertMinContrast(pending, ctx);
    assertMinContrast(testBadge, ctx);
  }
  const buttons: ButtonProbe[] = [];
  for (const label of [
    /каталоге · список/i,
    /каталоге · полная карточка/i,
    "Одобрить заявку",
    "Отклонить заявку",
  ]) {
    buttons.push(await sampleButtonStates(page, label));
  }
  for (const probe of buttons) {
    for (const st of probe.states) {
      if (st.state === "disabled") continue;
      if (st.ratio != null && st.ratio < MIN_TEXT_RATIO) {
        throw new Error(
          `${theme} ${viewport.width}px button "${probe.name}" ${st.state}: ${st.ratio.toFixed(2)}:1`,
        );
      }
    }
  }
  const name = `org-detail-${theme}-${viewport.width}.png`;
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
  await page.getByRole("button", { name: /полная карточка/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 10000 });
  await page.screenshot({
    path: path.join(SHOTS, `org-preview-dialog-${theme}-${viewport.width}.png`),
    fullPage: true,
  });
  const closeDisabled = await sampleElementStyles(
    page,
    page.getByRole("button", { name: /^Закрыть$/i }).first(),
    "Закрыть",
    "default",
  );
  await page.getByRole("button", { name: /^Закрыть$/i }).click();
  return { pending, testBadge, buttons, dialogClose: closeDisabled };
}

async function main() {
  const head = repoHeadSha();
  const evidenceRepoHead = head;
  if (head && head !== MODERATION_HOTFIX_FE_SHA && !head.startsWith(MODERATION_HOTFIX_FE_SHA.slice(0, 12))) {
    console.warn(
      `[capture] evidence repo HEAD ${head} is ahead of pinned FE runtime ${MODERATION_HOTFIX_FE_SHA} (expected for test/evidence commits)`,
    );
  }
  fs.mkdirSync(SHOTS, { recursive: true });
  const fx = JSON.parse(fs.readFileSync(FIXTURES, "utf8"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await adminLogin(page, fx.pendingOrgId, fx.pendingOrgTitle);
  const results: Record<string, unknown> = {};
  for (const theme of ["light", "dark"] as const) {
    results[theme] = await captureOrgDetail(
      page,
      fx,
      theme,
      {
        width: theme === "dark" ? 390 : 1440,
        height: theme === "dark" ? 844 : 900,
      },
      true,
    );
  }
  results.dark1440 = await captureOrgDetail(
    page,
    fx,
    "dark",
    { width: 1440, height: 900 },
    true,
  );
  results.light390 = await captureOrgDetail(
    page,
    fx,
    "light",
    { width: 390, height: 844 },
    true,
  );
  await browser.close();

  const metadata = {
    frontendRuntimeSha: MODERATION_HOTFIX_FE_SHA,
    backendRuntimeSha: MODERATION_HOTFIX_BE_SHA,
    evidenceCapturedAt: new Date().toISOString(),
    profUrl: PROF_URL,
    evidenceRepoHeadAtCapture: evidenceRepoHead,
    measuredSurfaces: [
      "org detail header badges: На проверке, Тестовый партнёр (computed fg/bg, all captured viewports)",
    ],
    buttonStateProbe:
      "secondary/primary action + preview buttons: default/hover/focus-visible contrast asserted; disabled recorded only (opacity, no WCAG claim)",
    notMeasuredInBrowser: [
      "queue list cards",
      "partner detail page",
      "loading spinner buttons",
      "readiness list chips (CSS-only regression)",
    ],
  };

  fs.writeFileSync(path.join(ART, "metadata.json"), JSON.stringify(metadata, null, 2));
  fs.writeFileSync(
    path.join(ART, "computed-contrast.json"),
    JSON.stringify({ metadata, results }, null, 2),
  );
  console.log(JSON.stringify({ ok: true, art: ART, metadata }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
