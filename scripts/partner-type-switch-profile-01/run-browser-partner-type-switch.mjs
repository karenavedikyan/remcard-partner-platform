/**
 * Browser smoke: partner type switch chain on isolated prof-test owner (loopback).
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const NAV_ROOT = process.env.NAV_ROOT ?? "/agent/repos/remcard-navigator";
const PROF_URL = (process.env.PROF_E2E_URL ?? "http://127.0.0.1:3452").replace(/\/$/, "");
const ART = path.resolve("artifacts/partner-type-switch-profile-01");
const failures = [];
const steps = [];

const RUNTIME = {
  frontendSha: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  backendSha: execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", {
    encoding: "utf8",
  }).trim(),
  captureStartedAt: process.env.E2E_CAPTURE_STARTED_AT ?? new Date().toISOString(),
};

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

async function withSession(browser, token, viewport) {
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
  return { context, page: await context.newPage() };
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  execSync("pnpm exec tsx scripts/partner-type-switch-profile-01/seed-partner-type-switch-harness.ts", {
    cwd: NAV_ROOT,
    env: { ...process.env, CATALOG_QA_ROOT: path.join(NAV_ROOT, ".catalog-qa-isolated") },
    stdio: "pipe",
  });
  const state = JSON.parse(
    fs.readFileSync(path.join(NAV_ROOT, ".catalog-qa-isolated/ui-harness-state.json"), "utf8"),
  );
  const token = state.roles?.partnerTypeSwitch?.ownerToken;
  assert(token, "harness owner token");
  if (!token) {
    finish();
    return;
  }

  async function uiSwitch(page, fromKind, toKind) {
    await page.goto(`${PROF_URL}/profile?section=overview`, {
      waitUntil: "networkidle",
      timeout: 120_000,
    });
    await page.getByTestId("partner-type-settings").waitFor({ timeout: 60_000 });
    await page.getByTestId("partner-type-open").click();
    await page.getByTestId("partner-type-choose").waitFor({ timeout: 30_000 });
    await page.locator(`input[name="partner-type"][value="${toKind}"]`).click();
    await page.locator('[data-partner-type-action="review"]').click();
    await page.getByTestId("partner-type-review").waitFor({ timeout: 30_000 });
    await page.locator("[data-partner-type-ack]").check();
    const wait = page.waitForResponse(
      (res) =>
        res.url().includes("/api/pro/partner-type/switch") &&
        res.request().method() === "POST" &&
        res.status() === 200,
      { timeout: 60_000 },
    );
    await page.getByTestId("partner-type-apply").click();
    await wait;
    await page.reload({ waitUntil: "networkidle" });
    const expectedRole =
      toKind === "agent"
        ? "Агент"
        : toKind === "specialist"
          ? "Специалист"
          : toKind === "store"
            ? "Магазин"
            : "Компания";
    await page.getByTestId("partner-type-settings").waitFor({ timeout: 60_000 });
    const typeCurrent = page.getByTestId("partner-type-current");
    await typeCurrent.waitFor({ timeout: 30_000 });
    const typeLabel = (await typeCurrent.innerText()).trim();
    assert(
      typeLabel === expectedRole,
      `partner-type-current ${expectedRole} after switch (got ${typeLabel})`,
    );
    const roleEl = page.getByTestId("profile-overview-role");
    if (await roleEl.count()) {
      const roleText = (await roleEl.innerText()).trim();
      assert(
        roleText === expectedRole,
        `overview role ${expectedRole} after switch (got ${roleText})`,
      );
    }
    const me = await page.request.get(`${PROF_URL}/api/remcard/api/pro/partner-type/switch`, {
      headers: { Origin: PROF_URL, Cookie: `remcard-token=${token}` },
    });
    assert(me.ok(), `GET switch after ${fromKind}->${toKind}`);
    const body = await me.json();
    assert(body.currentKind === toKind, `persisted ${toKind} (from ${fromKind})`);
    steps.push(`switch-${fromKind}-to-${toKind}`);
  }

  const browser = await chromium.launch({ headless: true });
  const chain = ["agent", "specialist", "store", "company", "agent"];
  try {
    const { context, page } = await withSession(browser, token, { width: 1440, height: 900 });
    for (let i = 0; i < chain.length - 1; i++) {
      await uiSwitch(page, chain[i], chain[i + 1]);
    }
    async function captureDialogs(viewport, theme) {
      await page.setViewportSize({ width: viewport.w, height: viewport.h });
      await page.goto(`${PROF_URL}/profile?section=overview`, {
        waitUntil: "networkidle",
        timeout: 120_000,
      });
      await page.evaluate((t) => {
        document.documentElement.setAttribute("data-theme", t);
        try {
          localStorage.setItem("remcard-theme", t);
        } catch {
          /* ignore */
        }
      }, theme);
      await page.getByTestId("partner-type-settings").waitFor({ timeout: 60_000 });
      await page.getByTestId("partner-type-open").click();
      await page.getByTestId("partner-type-choose").waitFor({ timeout: 30_000 });
      await page.locator('input[name="partner-type"][value="specialist"]').click();
      await page.screenshot({
        path: path.join(ART, `dialog-choose-${theme}-${viewport.tag}.png`),
        fullPage: true,
      });
      await page.locator('[data-partner-type-action="review"]').click();
      await page.getByTestId("partner-type-review").waitFor({ timeout: 30_000 });
      const footer = page.locator('[data-testid="partner-type-review"] .dialogBody, [data-testid="partner-type-review"]');
      await footer.first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: path.join(ART, `dialog-review-${theme}-${viewport.tag}.png`),
        fullPage: true,
      });
      await page.getByRole("button", { name: "Отмена" }).click();
      await page.getByTestId("partner-type-review").waitFor({ state: "hidden", timeout: 10_000 });
      steps.push(`dialog-captures-${theme}-${viewport.tag}`);
    }

    for (const viewport of [
      { w: 1440, h: 900, tag: "1440" },
      { w: 390, h: 844, tag: "390" },
    ]) {
      for (const theme of ["light", "dark"]) {
        await captureDialogs(viewport, theme);
        const themeAttr = await page.evaluate(() =>
          document.documentElement.getAttribute("data-theme"),
        );
        assert(themeAttr === theme, `theme ${theme} ${viewport.tag}`);
        await page.screenshot({
          path: path.join(ART, `profile-partner-type-${theme}-${viewport.tag}.png`),
          fullPage: true,
        });
        steps.push(`screenshot-${theme}-${viewport.tag}`);
      }
    }
    await context.close();
  } finally {
    await browser.close();
  }
  finish();
}

function finish() {
  const payload = { failures, runtime: RUNTIME, steps };
  fs.writeFileSync(path.join(ART, "browser-capture.json"), JSON.stringify(payload, null, 2));
  if (failures.length) {
    console.error(failures.join("\n"));
    process.exit(1);
  }
  console.log(JSON.stringify({ ok: true, ...payload }, null, 2));
}

main().catch((e) => {
  failures.push(String(e));
  finish();
});
