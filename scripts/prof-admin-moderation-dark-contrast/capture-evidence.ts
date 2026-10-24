/**
 * Dark-contrast evidence: synthetic fixtures, loopback PROF :3420.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { contrastRatio } from "../../src/lib/moderation-badge-contrast";

const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3420").replace(/\/$/, "");
const ART = path.resolve("artifacts/prof-admin-moderation-dark-contrast-01");
const SHOTS = path.join(ART, "screenshots");
const ADMIN_LOGIN = process.env.CATALOG_QA_ADMIN_LOGIN ?? "catqa-admin@catalog.invalid";
const ADMIN_PASSWORD = process.env.CATALOG_QA_ADMIN_PASSWORD ?? "catalog-qa-admin-pass-16-chars";
const FIXTURES = path.join(
  process.env.CATALOG_QA_ROOT ?? "/agent/repos/remcard-navigator/.catalog-qa-isolated",
  "moderation-fixtures.json",
);

function parseRgb(css: string): string | null {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const hex = (n: string) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

async function adminLogin(page: import("playwright").Page, pendingOrgId: string) {
  const returnTo = `/admin/moderation/organizations/${pendingOrgId}`;
  const capsResp = page.waitForResponse(
    (r) =>
      r.url().includes("/api/remcard/api/pro/admin/auth/capabilities") &&
      r.request().method() === "GET",
    { timeout: 45000 },
  );
  await page.goto(`${PROF_URL}/login?mode=admin&returnTo=${encodeURIComponent(returnTo)}`, {
    waitUntil: "domcontentloaded",
  });
  await capsResp;
  await page.getByTestId("admin-login-modal").waitFor({ timeout: 15000 });
  await page.getByTestId("admin-login-form").waitFor({ state: "visible", timeout: 45000 });
  await page.getByTestId("admin-login-input").fill(ADMIN_LOGIN);
  await page.getByTestId("admin-password-input").fill(ADMIN_PASSWORD);
  const loginResp = page.waitForResponse(
    (r) => r.url().includes("password-login") && r.request().method() === "POST",
    { timeout: 20000 },
  );
  await page.getByTestId("admin-login-form").locator('button[type="submit"]').click();
  const resp = await loginResp;
  if (!resp.ok()) throw new Error(`password-login HTTP ${resp.status()}`);
  await page.goto(`${PROF_URL}${returnTo}`, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { level: 1 }).waitFor({ timeout: 45000 });
}

async function sampleBadgeStyles(page: import("playwright").Page, text: string) {
  const el = page.locator("header span").filter({ hasText: text }).first();
  await el.waitFor({ timeout: 10000 });
  const raw = await el.evaluate((node) => {
    const s = getComputedStyle(node);
    return {
      color: s.color,
      backgroundColor: s.backgroundColor,
      borderTopColor: s.borderTopColor,
    };
  });
  const fg = parseRgb(raw.color);
  const bg = parseRgb(raw.backgroundColor);
  const ratio = fg && bg ? contrastRatio(fg, bg) : null;
  return { label: text, raw, fg, bg, ratio };
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

async function captureOrgDetail(
  page: import("playwright").Page,
  fx: { pendingOrgId: string; pendingOrgTitle: string },
  theme: "light" | "dark",
  viewport: { width: number; height: number },
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
  const company = await sampleBadgeStyles(page, "Компания").catch(() => null);
  const name = `org-detail-${theme}-${viewport.width}.png`;
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
  await page.getByRole("button", { name: /полная карточка/i }).click();
  await page.getByRole("dialog").waitFor({ timeout: 10000 });
  await page.screenshot({
    path: path.join(SHOTS, `org-preview-dialog-${theme}-${viewport.width}.png`),
    fullPage: true,
  });
  await page.getByRole("button", { name: /^Закрыть$/i }).click();
  return { pending, testBadge, company };
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const fx = JSON.parse(fs.readFileSync(FIXTURES, "utf8"));
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await adminLogin(page, fx.pendingOrgId);
  const results: Record<string, unknown> = {};
  for (const theme of ["light", "dark"] as const) {
    results[theme] = await captureOrgDetail(page, fx, theme, {
      width: theme === "dark" ? 390 : 1440,
      height: theme === "dark" ? 844 : 900,
    });
  }
  results.dark1440 = await captureOrgDetail(page, fx, "dark", { width: 1440, height: 900 });
  results.light390 = await captureOrgDetail(page, fx, "light", { width: 390, height: 844 });
  await browser.close();
  fs.writeFileSync(path.join(ART, "computed-contrast.json"), JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ ok: true, art: ART }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
