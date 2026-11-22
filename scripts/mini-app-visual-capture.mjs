#!/usr/bin/env node
/**
 * Synthetic mini-app screenshots (/dev/mini-app-* only). Not proof of live Telegram/MAX WebView.
 * Waits for CSS hydration, styled wallet card, flow content, and QR image decode before capture.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE = process.env.MINI_APP_CAPTURE_BASE ?? "http://127.0.0.1:3000";
const OUT =
  process.env.MINI_APP_CAPTURE_OUT ??
  path.join(process.cwd(), "artifacts/mini-app-pilot-20261122/screenshots-synthetic");

const HOME_FIXTURES = [
  "agent-telegram",
  "agent-max",
  "specialist-telegram",
  "specialist-max",
  "store-telegram",
  "store-max",
  "company-telegram",
  "company-max",
];

/** Shared flows per role fixture (create + ready emphasized for store/company). */
const FLOW_MATRIX = [
  { fixture: "specialist-telegram", screens: ["create", "certificate-ready", "invite", "full-cabinet"] },
  { fixture: "store-telegram", screens: ["create", "certificate-ready"] },
  { fixture: "company-telegram", screens: ["create", "certificate-ready"] },
];

async function hideNextDevBadge(page) {
  await page.evaluate(() => {
    const id = "mini-app-capture-hide-next-badge";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent =
      "#__nextjs-build-indicator, nextjs-portal, [data-nextjs-toast], #devtools-indicator { display: none !important; }";
    document.head.appendChild(style);
  });
}

async function waitForMiniStylesheet(page) {
  await page
    .waitForResponse(
      (r) => r.url().includes("_next/static/css") && r.status() === 200,
      { timeout: 45_000 },
    )
    .catch(() => null);
  await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => null);
}

async function waitForStyledWalletCard(page) {
  await page.waitForSelector('[data-testid="mini-app-wallet-card"]', { state: "visible", timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const el = document.querySelector('[data-testid="mini-app-wallet-card"]');
      if (!el) return false;
      const style = getComputedStyle(el);
      const radius = parseFloat(style.borderRadius);
      const bg = style.backgroundImage;
      const width = el.getBoundingClientRect().width;
      return radius >= 12 && bg !== "none" && width >= 260;
    },
    { timeout: 30_000 },
  );
}

async function waitForCreateForm(page) {
  await page.waitForSelector('[data-testid="mini-create-form"]', { state: "visible", timeout: 30_000 });
  await page.waitForSelector('[data-testid="mini-create-submit"]:not([disabled])', { timeout: 15_000 }).catch(() => null);
}

async function waitForCertificateReady(page) {
  await page.waitForSelector('[data-testid="mini-cert-code"]', { state: "visible", timeout: 30_000 });
  await page.waitForSelector('[data-testid="mini-cert-qr"]', { state: "visible", timeout: 30_000 });
  await page.waitForFunction(
    () => {
      const img = document.querySelector('[data-testid="mini-cert-qr"]');
      return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 32;
    },
    { timeout: 30_000 },
  );
}

async function waitForInviteReady(page) {
  await page.waitForSelector('[data-testid="mini-invite-link"]', { state: "visible", timeout: 30_000 });
}

async function waitForFullCabinet(page) {
  await page.waitForSelector('[data-testid="mini-full-cabinet"]', { state: "visible", timeout: 30_000 }).catch(() =>
    page.waitForFunction(() => {
      const root = document.querySelector('[data-mini-app-flow-screen="full-cabinet"]');
      return Boolean(root && root.textContent && root.textContent.includes("полный"));
    }),
  );
}

async function gotoFlow(page, fixture, screen) {
  await page.goto(`${BASE}/dev/mini-app-flow?fixture=${fixture}&screen=${screen}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMiniStylesheet(page);
  await hideNextDevBadge(page);
  await page.waitForSelector(`[data-mini-app-flow-screen="${screen}"]`, { timeout: 30_000 });
  if (screen === "create") await waitForCreateForm(page);
  else if (screen === "certificate-ready") await waitForCertificateReady(page);
  else if (screen === "invite") await waitForInviteReady(page);
  else if (screen === "full-cabinet") await waitForFullCabinet(page);
}

async function gotoHome(page, fixture) {
  await page.goto(`${BASE}/dev/mini-app-fixture?fixture=${fixture}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await waitForMiniStylesheet(page);
  await hideNextDevBadge(page);
  await page.waitForSelector('[data-testid="mini-app-home"]', { timeout: 30_000 });
  await waitForStyledWalletCard(page);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 12"],
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  const metrics = [];
  const checks = [];

  for (const key of HOME_FIXTURES) {
    await gotoHome(page, key);
    const card = page.locator('[data-testid="mini-app-wallet-card"]');
    const box = await card.boundingBox();
    if (box) {
      const row = { fixture: key, cardWidth: Math.round(box.width * 10) / 10, cardHeight: Math.round(box.height * 100) / 100 };
      metrics.push(row);
      const styled = await card.evaluate((el) => {
        const s = getComputedStyle(el);
        return { radius: s.borderRadius, bg: s.backgroundImage !== "none" };
      });
      checks.push({ shot: `${key}-home`, ok: styled.bg && box.width >= 260, styled, box: row });
    }
    await page.screenshot({ path: path.join(OUT, `${key}-home.png`), fullPage: true });
  }

  for (const { fixture, screens } of FLOW_MATRIX) {
    for (const flow of screens) {
      await gotoFlow(page, fixture, flow);
      await page.screenshot({
        path: path.join(OUT, `flow-${fixture}-${flow}.png`),
        fullPage: true,
      });
      checks.push({ shot: `flow-${fixture}-${flow}`, ok: true });
    }
  }

  await browser.close();
  console.log(`Saved ${HOME_FIXTURES.length} home + flow screenshots to ${OUT}`);
  console.log(JSON.stringify({ walletCardMetrics: metrics, checks }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});