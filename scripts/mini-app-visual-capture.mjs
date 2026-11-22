#!/usr/bin/env node
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE = process.env.MINI_APP_CAPTURE_BASE ?? "http://127.0.0.1:3000";
const OUT = process.env.MINI_APP_CAPTURE_OUT ?? path.join(process.cwd(), "artifacts/mini-app-pilot-20261122/screenshots");

const FIXTURES = [
  "agent-telegram",
  "agent-max",
  "specialist-telegram",
  "specialist-max",
  "store-telegram",
  "store-max",
  "company-telegram",
  "company-max",
];

const FLOW_SCREENS = ["create", "certificate-ready", "invite", "full-cabinet"];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices["iPhone 12"],
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  await page.addStyleTag({
    content:
      "#__nextjs-build-indicator, nextjs-portal, [data-nextjs-toast], #devtools-indicator { display: none !important; }",
  });
  const metrics = [];
  for (const key of FIXTURES) {
    await page.goto(`${BASE}/dev/mini-app-fixture?fixture=${key}`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="mini-app-home"]');
    const card = page.locator('[data-testid="mini-app-wallet-card"]');
  await card.waitFor();
    const box = await card.boundingBox();
    if (box) metrics.push({ fixture: key, cardWidth: Math.round(box.width), cardHeight: Math.round(box.height) });
    await page.screenshot({ path: path.join(OUT, `${key}-home.png`), fullPage: true });
  }
  const flowFixture = "specialist-telegram";
  for (const flow of FLOW_SCREENS) {
    await page.goto(`${BASE}/dev/mini-app-flow?fixture=${flowFixture}&screen=${flow}`, {
      waitUntil: "networkidle",
    });
    await page.waitForSelector('[data-mini-app-flow-screen]');
    await page.screenshot({
      path: path.join(OUT, `flow-${flowFixture}-${flow}.png`),
      fullPage: true,
    });
  }
  await browser.close();
  console.log(`Saved ${FIXTURES.length} home + ${FLOW_SCREENS.length} flow screenshots to ${OUT}`);
  console.log(JSON.stringify({ walletCardMetrics: metrics }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});