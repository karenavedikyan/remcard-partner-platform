/**
 * Render smoke for prototype standalone entries (no HTTP-200-only).
 * node design/general-prototype/prototype-entries-smoke.browser.mjs
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

const STANDALONE_ENTRIES = [
  { path: "partner/legacy.html", probe: "main, body" },
  { path: "partner/certificate.html", probe: "#certificate-root" },
  { path: "partner/recommendation.html", probe: "#recommendation-root" },
  { path: "partner/assignment.html", probe: "#assignment-root" },
  { path: "partner/observer.html", probe: "#observer-root" },
  { path: "partner/partner-cooperation-detail.html", probe: "#partner-title, .partner-dialog" },
  { path: "partner/partner-purchase-detail.html", probe: "#op-detail, #op-title" },
  { path: "partner/partner-reward-receipt.html", probe: "#prr-dialog, #prr-main" },
  { path: "partner/partner-scan-transaction.html", probe: "#pst-confirm, .pst-page" },
  { path: "partner/partner-wallet-history.html", probe: "#history-view, #history-title" },
];

const CABINET_ROLES = ["store", "agent", "employee", "specialist"];

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

function assertNoInlineEditLeak(bodyText, label) {
  assert.doesNotMatch(bodyText, /allowedParentOrigins/, `${label}: inline-edit script must not render as page text`);
  assert.doesNotMatch(bodyText, /INLINE_EDIT_CAPTURE_REQUEST/, `${label}: pplx harness must not leak to body`);
}

try {
  for (const entry of STANDALONE_ENTRIES) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err.message || err)));
    await page.goto(`${base}/${entry.path}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const bodyText = (await page.locator("body").innerText()) || "";
    assertNoInlineEditLeak(bodyText, entry.path);
    const probe = entry.probe.split(",")[0].trim();
    await page.locator(probe).first().waitFor({ state: "attached", timeout: 8000 });
    const syntaxish = errors.filter((m) => /Unexpected token|SyntaxError/i.test(m));
    assert.equal(syntaxish.length, 0, `${entry.path} JS errors: ${syntaxish.join("; ")}`);
    await page.close();
  }

  const hub = await browser.newPage();
  await hub.goto(`${base}/index.html`, { waitUntil: "domcontentloaded" });
  assertNoInlineEditLeak((await hub.locator("body").innerText()) || "", "index.html");
  await hub.locator("a.proto-launch, .proto-page-flow").first().waitFor({ timeout: 8000 });
  await hub.close();

  for (const role of CABINET_ROLES) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(String(err.message || err)));
    await page.goto(`${base}/partner/index.html?role=${role}`, { waitUntil: "load" });
    await page.waitForFunction(
      () => document.querySelector('[data-testid="view-cabinet"]') || document.querySelector("script[type=module]"),
      null,
      { timeout: 20000 },
    );
    await page.evaluate(() => {
      document.querySelector('[data-testid="scenario-role"]')?.dispatchEvent(new Event("change", { bubbles: true }));
      document.querySelector('[data-testid="view-cabinet"]')?.click();
    });
    await page.waitForSelector(".shell aside.sidebar, [data-testid='view-cabinet'][aria-pressed='true']", {
      timeout: 25000,
    });
    assertNoInlineEditLeak((await page.locator("body").innerText()) || "", `partner/index ${role}`);
    const syntaxish = errors.filter((m) => /Unexpected token|SyntaxError/i.test(m));
    assert.equal(syntaxish.length, 0, `partner/index ${role} JS errors: ${syntaxish.join("; ")}`);
    await page.close();
  }

  console.log("prototype-entries-smoke.browser.mjs: ok (15 checks)");
} finally {
  await browser.close();
  server.close();
}
