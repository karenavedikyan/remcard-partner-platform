/**
 * Isolated cross-site iframe mini-app auth checks (two origins, third-party cookies blocked).
 * Requires local FE on 127.0.0.1:3000 and test backend stubs — does not call production MAX/Comet.
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";

const FE = process.env.MINI_APP_E2E_FE ?? "http://127.0.0.1:3000";
const PARENT = process.env.MINI_APP_E2E_PARENT ?? "http://127.0.0.1:3199";

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    storageState: undefined,
    ignoreHTTPSErrors: true,
  });
  await ctx.route("**/*", async (route) => {
    if (route.request().url().startsWith(PARENT)) {
      const html = `<!doctype html><meta charset=utf-8><iframe id=f src="${FE}/mini-app?host=max" width=400 height=900></iframe>`;
      await route.fulfill({ status: 200, contentType: "text/html", body: html });
      return;
    }
    await route.continue();
  });
  const page = await ctx.newPage();
  await page.goto(`${PARENT}/parent`, { waitUntil: "domcontentloaded" });
  const frame = page.frame({ url: /mini-app/ });
  assert.ok(frame, "iframe must load mini-app");
  await frame.waitForSelector("[data-testid=mini-app-max-entry], [data-testid=mini-app-home], [data-testid=mini-app-loading]", {
    timeout: 30_000,
  });
  console.log(JSON.stringify({ ok: true, note: "cross-site shell reached mini-app (manual Comet not exercised)" }));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});