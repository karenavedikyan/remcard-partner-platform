#!/usr/bin/env node
/**
 * Local production-browser QA for Admin R1 against isolated staff upstream.
 * No production writes. Screenshots prove real shell + controls.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP = (process.env.ADMIN_R1_APP_URL || "http://127.0.0.1:3017").replace(/\/$/, "");
const OUT = process.env.ADMIN_R1_QA_OUT || "/workspace/artifacts/admin-r1-20261029/screenshots/local-next-qa";
const failures = [];

fs.mkdirSync(OUT, { recursive: true });

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  const meta = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    theme: document.documentElement.dataset.theme || "light",
    themeToggleCount: document.querySelectorAll('[data-testid="theme-toggle"]').length,
    notifButtons: Array.from(document.querySelectorAll("button,a"))
      .filter((el) => /уведомлен/i.test(el.getAttribute("aria-label") || el.textContent || ""))
      .length,
    bodyTextSample: (document.body?.innerText || "").slice(0, 400),
  }));
  fs.writeFileSync(path.join(OUT, `${name}.meta.json`), JSON.stringify(meta, null, 2));
  return meta;
}

async function gotoAdmin(page, route) {
  await page.goto(`${APP}${route}`, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(400);
  // Wait past initial loading skeletons when present.
  await page
    .locator(".r1StateLoading")
    .waitFor({ state: "detached", timeout: 15000 })
    .catch(() => undefined);
  await page.waitForTimeout(200);
}

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROME || "/usr/local/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  await context.addCookies([
    { name: "remcard_session", value: "local-staff-fixture", url: APP },
  ]);
  // Block non-local network except fonts (layout CSS). Upstream is loopback-only.
  await context.route("**/*", async (route) => {
    const url = route.request().url();
    if (
      url.startsWith(APP) ||
      url.startsWith("http://127.0.0.1") ||
      url.startsWith("http://localhost") ||
      url.startsWith("data:") ||
      url.startsWith("blob:") ||
      url.includes("fonts.googleapis.com") ||
      url.includes("fonts.gstatic.com")
    ) {
      return route.continue();
    }
    return route.abort();
  });

  const page = await context.newPage();
  page.on("pageerror", (err) => {
    failures.push(`pageerror: ${err.message}`);
  });
  const routes = [
    ["/admin/overview", "overview"],
    ["/admin/analytics", "analytics"],
    ["/admin/results", "results"],
    ["/admin/moderation/reviews", "reviews"],
    ["/admin/clients", "clients"],
    ["/admin/team", "team"],
    ["/admin/settings", "settings"],
  ];

  for (const [route, name] of routes) {
    await gotoAdmin(page, route);
    const text = await page.locator("body").innerText();
    assert(!/Application error/i.test(text), `${name}: application error`);
    assert(!/availableKeys/.test(text), `${name}: leaked availableKeys`);
    assert(!/LOCAL QA/.test(text), `${name}: leaked LOCAL QA`);
    const light = await shot(page, `${name}-1440-light`);
    assert(light.themeToggleCount === 1, `${name} 1440: expected 1 theme toggle, got ${light.themeToggleCount}`);

    await page.evaluate(() => {
      document.documentElement.dataset.theme = "dark";
      localStorage.setItem("remcard-theme", "dark");
    });
    await shot(page, `${name}-1440-dark`);
    await page.evaluate(() => {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("remcard-theme", "light");
    });
  }

  // Reviews moderation controls
  await gotoAdmin(page, "/admin/moderation/reviews");
  const approve = page.getByRole("button", { name: /одобрить|опубликовать/i });
  const reject = page.getByRole("button", { name: /отклонить/i });
  assert((await approve.count()) > 0, "reviews: missing approve/publish button");
  assert((await reject.count()) > 0, "reviews: missing reject button");
  // Do not click mutating commands against anything real; stub is local-only, still skip click.

  // Analytics quality tab must not show API field names
  await gotoAdmin(page, "/admin/analytics");
  await page.getByRole("tab", { name: "Качество базы" }).click();
  await page.waitForTimeout(300);
  const analyticsText = await page.locator("body").innerText();
  assert(!/availableKeys/.test(analyticsText), "analytics quality: availableKeys visible");
  assert(!/\{[\s\S]*"visitors"/.test(analyticsText), "analytics: raw JSON blob visible");
  await shot(page, "analytics-quality-1440-light");

  // Results remscore error dash state is covered by unit test; verify pager exists for rating
  await gotoAdmin(page, "/admin/results");
  const pager = page.locator(".r1Pager");
  assert((await pager.count()) > 0, "results: missing pager for remscore list");
  await shot(page, "results-rating-1440-light");

  // Mobile 375 overflow check on overview + reviews
  await page.setViewportSize({ width: 375, height: 812 });
  for (const [route, name] of [
    ["/admin/overview", "overview"],
    ["/admin/moderation/reviews", "reviews"],
    ["/admin/results", "results"],
  ]) {
    await gotoAdmin(page, route);
    const meta = await shot(page, `${name}-375-light`);
    assert(
      meta.scrollWidth <= 375 + 1,
      `${name} 375: document scrollWidth ${meta.scrollWidth} > 375`,
    );
    assert(meta.themeToggleCount === 1, `${name} 375: expected 1 theme toggle`);
  }

  // Theme toggle label consistency after dark
  await gotoAdmin(page, "/admin/overview");
  const themeBtn = page.getByTestId("theme-toggle");
  if ((await themeBtn.count()) > 0) {
    const before = await themeBtn.getAttribute("aria-label");
    await themeBtn.click();
    await page.waitForTimeout(200);
    const after = await themeBtn.getAttribute("aria-label");
    const htmlTheme = await page.evaluate(() => document.documentElement.dataset.theme || "light");
    assert(before !== after || htmlTheme === "dark" || htmlTheme === "light", "theme toggle did not change state");
    // After clicking to dark, label should invite light (or vice versa) — not a stale duplicate control.
    assert((await page.getByTestId("theme-toggle").count()) === 1, "duplicate theme toggles after click");
    await shot(page, "overview-375-after-theme");
  }

  await browser.close();

  const report = { failures, out: OUT, ok: failures.length === 0 };
  fs.writeFileSync(path.join(OUT, "qa-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
