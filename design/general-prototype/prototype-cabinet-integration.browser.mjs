/**
 * Browser flows for cabinet standalone embed.
 * node design/general-prototype/prototype-cabinet-integration.browser.mjs
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dir = path.dirname(fileURLToPath(import.meta.url));

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

const server = createServer((req, res) => {
  const raw = (req.url || "/").split("?")[0];
  let rel = raw === "/" ? "/index.html" : raw;
  const filePath = path.join(__dir, decodeURIComponent(rel.replace(/^\//, "")));
  if (!filePath.startsWith(__dir) || !existsSync(filePath)) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  res.setHeader("Content-Type", contentType(filePath));
  res.end(readFileSync(filePath));
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

async function enterCabinet(page, role = "store") {
  await page.goto(`${base}/partner/index.html?role=${role}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector('[data-testid="view-cabinet"]'), null, {
    timeout: 20000,
  });
  await page.evaluate(() => {
    const roleEl = document.querySelector('[data-testid="scenario-role"]');
    if (roleEl) roleEl.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await page.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
}

try {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
  ]) {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);
    await enterCabinet(page, "store");
    await page.click('[data-action="nav:partners"], [data-action="nav:links"]');
    await page.waitForSelector("[data-coll-open]", { timeout: 10000 });
    const partnerName = await page.evaluate(() => {
      const btn = document.querySelector("[data-coll-open]");
      return btn?.textContent?.trim() || "";
    });
    await page.click("[data-coll-open]");
    await page.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", { timeout: 10000 });
    const frame = page.frameLocator("[data-testid='cabinet-standalone-frame']");
    await frame.locator("#partner-title").filter({ hasText: partnerName }).waitFor({ timeout: 8000 });
    const titleOk = await frame.locator("#partner-title").textContent();
    assert.equal(titleOk?.trim(), partnerName, `143 title must match selected partner at ${viewport.width}px`);
    await page.evaluate(() => document.querySelector('[data-testid="proto-standalone-back"]')?.click());
    await page.waitForFunction(
      () => document.querySelector("[data-testid='cabinet-standalone-host']")?.hidden,
      null,
      { timeout: 10000 },
    );
    await page.evaluate(() =>
      document.querySelector('[data-action="nav:settlements"], [data-action="nav:wallet"]')?.click(),
    );
    await page.waitForSelector("[data-testid='wallet-history-hub-link']", { timeout: 15000 });
    await page.waitForSelector("[data-testid='wallet-history-hub-link']", { timeout: 10000 });
    await page.click("[data-testid='wallet-history-hub-link']");
    await page.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])");
    const badge = await page.evaluate(() => window.__protoCabinetEmbeddedPage?.n);
    assert.equal(badge, 147);
    await page.evaluate(() => document.querySelector('[data-action="nav:home"]')?.click());
    await page.waitForFunction(() => document.querySelector("[data-testid='cabinet-standalone-host']")?.hidden);
    await page.close();
  }

  const denyPage = await browser.newPage();
  await denyPage.setViewportSize({ width: 1280, height: 800 });
  await enterCabinet(denyPage, "agent");
  await denyPage.goto(`${base}/partner/index.html?role=agent&open=clients&proto_standalone=146`, { waitUntil: "load" });
  await denyPage.waitForSelector('[data-testid="view-cabinet"][aria-pressed="true"]', { timeout: 15000 });
  await denyPage.waitForTimeout(500);
  const agentDenied = await denyPage.evaluate(() => {
    const host = document.querySelector("[data-testid='cabinet-standalone-host']");
    return !host || host.hidden || window.__protoCabinetEmbeddedPage?.n !== 146;
  });
  assert.ok(agentDenied, "agent must not keep embed 146 open via deep link");
  await denyPage.close();

  console.log("prototype-cabinet-integration.browser.mjs: ok");
} finally {
  await browser.close();
  server.close();
}
