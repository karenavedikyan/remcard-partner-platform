/**
 * Live prototype: ROOT from script src + nested hosted prefix.
 * Run from repo root: node design/general-prototype/prototype-numbering.browser.mjs
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const HOSTED_PREFIX = "/unique-id";

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

function createStaticServer() {
  return createServer((req, res) => {
    try {
      const raw = (req.url || "/").split("?")[0];
      let rel = raw;
      if (rel.startsWith(HOSTED_PREFIX + "/") || rel === HOSTED_PREFIX) {
        rel = rel.slice(HOSTED_PREFIX.length) || "/";
      }
      if (rel === "/") rel = "/index.html";
      const filePath = path.join(__dir, decodeURIComponent(rel.replace(/^\//, "")));
      if (!filePath.startsWith(__dir) || !existsSync(filePath)) {
        res.statusCode = 404;
        res.end("not found");
        return;
      }
      res.setHeader("Content-Type", contentType(filePath));
      res.end(readFileSync(filePath));
    } catch (e) {
      res.statusCode = 500;
      res.end(String(e));
    }
  });
}

async function waitFrames(page, n) {
  await page.evaluate(async (count) => {
    for (let i = 0; i < count; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
  }, n);
}

async function assertChromeIdle(page) {
  const bad = await page.evaluate(async () => {
    const flow = document.querySelector(".proto-page-flow");
    if (!flow) return "missing flow";
    const before = flow.outerHTML;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    return flow.outerHTML === before ? null : "chrome mutated over 60 frames";
  });
  assert.equal(bad, null, bad || "chrome stable");
}

const server = createStaticServer();
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const hosted = `${base}${HOSTED_PREFIX}`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${base}/index.html`, { waitUntil: "load" });
  await page.waitForFunction(() => window.protoPathnameRel && document.querySelector(".proto-page-badge"));
  let rel = await page.evaluate(() => window.protoPathnameRel());
  assert.equal(rel, "index.html");
  let pageId = await page.evaluate(() => window.protoResolvePage()?.id);
  assert.equal(pageId, "hub");
  await assertChromeIdle(page);

  await page.goto(`${hosted}/partner/index.html`, { waitUntil: "load" });
  await page.waitForFunction(() => window.protoPathnameRel());
  rel = await page.evaluate(() => window.protoPathnameRel());
  assert.equal(rel, "partner/index.html");
  pageId = await page.evaluate(() => window.protoResolvePage()?.id);
  assert.equal(pageId, "partner:registration");

  const hubHref = await page.evaluate(() => window.protoHubUrl("index.html"));
  assert.ok(hubHref.includes(`${HOSTED_PREFIX}/index.html`), `hub under prefix: ${hubHref}`);

  await page.goto(`${hosted}/client/index.html#/product/demo`, { waitUntil: "load" });
  pageId = await page.evaluate(() => window.protoResolvePage()?.id);
  assert.equal(pageId, "client:product");

  await page.goto(`${hosted}/admin/index.html`, { waitUntil: "load" });
  await page.click('[data-action="go"][data-view="partners"]');
  await page.waitForFunction(() => location.hash.includes("partners"));
  await page.waitForSelector('[data-action="go"][data-view="partners"][aria-current="page"]');
  await waitFrames(page, 5);
  pageId = await page.evaluate(() => window.protoResolvePage()?.id);
  assert.equal(pageId, "admin:partners");

  const { catalogLen, tocHrefs } = await page.evaluate(() => ({
    catalogLen: window.PROTOTYPE_PAGE_CATALOG?.length || 0,
    tocHrefs: [...document.querySelectorAll(".proto-page-list a")].map((a) => a.getAttribute("href") || ""),
  }));
  assert.equal(catalogLen, 107);
  assert.ok(tocHrefs.length > 0);
  for (const h of tocHrefs) {
    assert.doesNotMatch(h, /rc_demo_release/, `TOC href must not gate R2: ${h}`);
  }

  await page.goto(`${hosted}/partner/roles.html?role=agent&open=bonus`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  pageId = await page.evaluate(() => window.protoResolvePage()?.id);
  assert.equal(pageId, "partner:agent:bonus");

  await assertChromeIdle(page);

  await page.setViewportSize({ width: 375, height: 812 });
  const bottomPx = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".proto-page-flow")).bottom));
  assert.ok(bottomPx >= 90, `mobile bottom clearance >= 90px (got ${bottomPx}px)`);
} finally {
  await browser.close();
  server.close();
}

console.log("prototype-numbering.browser: ok", { port, hostedPrefix: HOSTED_PREFIX });
