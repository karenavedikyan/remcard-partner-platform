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
    if (viewport.width === 1280) {
      const mainObscured = await page.evaluate(() => {
        const row = document.querySelector(".shell.cabinet-standalone-active main.content > *");
        return row ? getComputedStyle(row).visibility === "hidden" : false;
      });
      assert.ok(mainObscured, "main content hidden under portal while embed open");
      await page.evaluate(() => {
        window.__supplementalPostCount = 0;
        window.addEventListener("message", (ev) => {
          const d = ev.data;
          if (d?.source === "proto-cabinet-embed" && d?.type === "supplemental") {
            window.__supplementalPostCount = (window.__supplementalPostCount || 0) + 1;
          }
        });
      });
      await frame.locator('[data-testid="counterparty-copy-id"]').click();
      await page.waitForFunction(() => (window.__supplementalPostCount || 0) > 0, null, { timeout: 5000 });
      await page.waitForSelector(".action-toast", { timeout: 5000 });
      const toast = await page.locator(".action-toast span:nth-child(2)").textContent();
      assert.match(toast || "", /ID скопирован|Скопируйте ID вручную/i);
    }
    await page.locator('[data-testid="proto-standalone-back"]').click();
    await page.waitForFunction(
      () => document.querySelector("[data-testid='cabinet-standalone-host']")?.hidden,
      null,
      { timeout: 10000 },
    );
    const mainRestored = await page.evaluate(() => {
      const row = document.querySelector(".shell main.content > *, .shell .content.main > *");
      return row ? getComputedStyle(row).visibility !== "hidden" : true;
    });
    assert.ok(mainRestored, "main content visibility restored after embed close");
    await page.evaluate(() =>
      document.querySelector('[data-action="nav:settlements"], [data-action="nav:wallet"]')?.click(),
    );
    await page.waitForSelector("[data-testid='wallet-history-hub-link']", { timeout: 15000 });
    await page.waitForSelector("[data-testid='wallet-history-hub-link']", { timeout: 10000 });
    await page.click("[data-testid='wallet-history-hub-link']");
    await page.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])");
  const walletEmbed = await page.evaluate(() => {
    const host = document.querySelector("[data-testid='cabinet-standalone-host']");
    const iframe = document.querySelector("[data-testid='cabinet-standalone-frame']");
    const rect = host?.getBoundingClientRect();
    return {
      hostCount: document.querySelectorAll("[data-testid='cabinet-standalone-host']").length,
      iframeCount: document.querySelectorAll("[data-testid='cabinet-standalone-frame']").length,
      hostHidden: host?.hidden,
      hasSrc: !!iframe?.getAttribute("src"),
      attached: !!(rect && rect.width > 0 && rect.height > 0),
      badge: window.__protoCabinetEmbeddedPage?.n,
    };
  });
  assert.equal(walletEmbed.badge, 147);
  assert.equal(walletEmbed.hostCount, 1);
  assert.equal(walletEmbed.iframeCount, 1);
  assert.equal(walletEmbed.hostHidden, false);
  assert.ok(walletEmbed.hasSrc && walletEmbed.attached, "wallet 147 embed host must stay attached with iframe src");
    await page.evaluate(() => document.querySelector('[data-action="nav:home"]')?.click());
    await page.waitForFunction(
      () =>
        document.querySelector("[data-testid='cabinet-standalone-host']")?.hidden &&
        !window.__protoCabinetEmbeddedPage,
    );
    await page.close();
  }

  const deepPage = await browser.newPage();
  await deepPage.setViewportSize({ width: 1280, height: 800 });
  await deepPage.goto(`${base}/partner/index.html?role=store&open=partners&proto_standalone=143`, {
    waitUntil: "load",
  });
  await deepPage.waitForSelector('[data-testid="view-cabinet"][aria-pressed="true"]', { timeout: 15000 });
  await deepPage.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", { timeout: 15000 });
  const deepBoot = await deepPage.evaluate(() => ({
    hostCount: document.querySelectorAll("[data-testid='cabinet-standalone-host']").length,
    iframeSrc: document.querySelector("[data-testid='cabinet-standalone-frame']")?.getAttribute("src") || "",
    badge: window.__protoCabinetEmbeddedPage?.n,
    cabinet: document.querySelector('[data-testid="view-cabinet"]')?.getAttribute("aria-pressed"),
  }));
  assert.equal(deepBoot.cabinet, "true");
  assert.equal(deepBoot.badge, 143);
  assert.equal(deepBoot.hostCount, 1);
  assert.ok(deepBoot.iframeSrc.includes("partner-cooperation-detail"), "deep link must load cooperation embed");
  await deepPage.close();

  const empPage = await browser.newPage();
  await empPage.setViewportSize({ width: 1280, height: 800 });
  await empPage.goto(`${base}/partner/index.html?role=employee`, { waitUntil: "load" });
  await empPage.evaluate(() => {
    document.querySelector('[data-testid="scenario-role"]')?.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await empPage.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await empPage.evaluate(() => {
    const review = document.querySelector("#review");
    if (review && !review.open) review.open = true;
  });
  await empPage.waitForSelector('[data-testid="permission-clients"]', { timeout: 10000 });
  for (const perm of [
    "terms",
    "scan",
    "sale",
    "ledger",
    "cash",
    "transfer",
    "recommend",
    "team",
    "catalog",
    "own",
  ]) {
    const el = empPage.locator(`[data-testid="permission-${perm}"]`);
    if (await el.count()) await el.setChecked(false);
  }
  await empPage.locator('[data-testid="permission-clients"]').setChecked(true);
  await empPage.locator('[data-control="invite"]').selectOption("valid");
  await empPage.waitForTimeout(300);
  await empPage.click('[data-action="nav:partners"]');
  await empPage.waitForSelector("[data-coll-open]", { timeout: 10000 });
  await empPage.click("[data-coll-open]");
  await empPage.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", { timeout: 10000 });
  const frame143 = empPage.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame143.locator("#partner-title").waitFor({ timeout: 8000 });
  for (const id of ["edit-terms", "pause", "certificate"]) {
    const btn = frame143.locator(`#${id}`);
    const hidden = await btn.evaluate((el) => el.hidden || el.hasAttribute("hidden") || el.disabled);
    assert.equal(hidden, true, `employee view-only 143 must hide/disable #${id}`);
  }
  await empPage.close();

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

  const agentWallet = await browser.newPage();
  await agentWallet.setViewportSize({ width: 1280, height: 900 });
  await agentWallet.goto(`${base}/partner/index.html?role=agent`, { waitUntil: "load" });
  await agentWallet.evaluate(() => {
    const roleEl = document.querySelector('[data-testid="scenario-role"]');
    if (roleEl) {
      roleEl.value = "agent";
      roleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await agentWallet.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await agentWallet.evaluate(() =>
    document.querySelector('[data-action="nav:bonus"], [data-action="nav:wallet"]')?.click(),
  );
  await agentWallet.waitForSelector("[data-testid='wallet-history-hub-link']", { timeout: 15000 });
  await agentWallet.click("[data-testid='wallet-history-hub-link']");
  await agentWallet.waitForSelector("[data-testid='cabinet-standalone-frame']", { timeout: 10000 });
  const frame147 = agentWallet.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame147.locator(".context span").first().waitFor({ timeout: 8000 });
  const agent147 = {
    badge: (await frame147.locator(".context span").first().textContent())?.trim(),
    purpose: (await frame147.locator("#view-purpose").textContent())?.trim(),
    iframeRole: await frame147.locator("html").evaluate((el) => el.dataset.embedRole),
    srcRole: await frame147.locator("html").evaluate(
      () => new URLSearchParams(location.search).get("embed_role"),
    ),
  };
  assert.equal(agent147.badge, "АГЕНТ");
  assert.match(agent147.purpose || "", /вознагражден/i);
  assert.equal(agent147.iframeRole, "agent");
  assert.equal(agent147.srcRole, "agent");
  const filterPe = await frame147.locator("#filter-button").evaluate((el) => getComputedStyle(el).pointerEvents);
  assert.notEqual(filterPe, "none", "agent read-only wallet must keep filter control clickable");
  await frame147.locator("#filter-button").click();
  await frame147.locator("#filters:not([hidden])").waitFor({ timeout: 5000 });
  assert.equal(await frame147.locator("#filter-button").getAttribute("aria-expanded"), "true");
  await frame147.locator("#status").selectOption("active");
  await frame147.locator("#result-count").waitFor({ timeout: 3000 });
  const src = await agentWallet.locator("[data-testid='cabinet-standalone-frame']").getAttribute("src");
  assert.ok(src?.includes("embed_role=agent"), "147 iframe must carry embed_role");
  await agentWallet.close();

  const scanEmp = await browser.newPage();
  await scanEmp.setViewportSize({ width: 1280, height: 900 });
  await scanEmp.goto(`${base}/partner/index.html?role=employee`, { waitUntil: "load" });
  await scanEmp.evaluate(() => {
    document.querySelector('[data-testid="scenario-role"]')?.dispatchEvent(new Event("change", { bubbles: true }));
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await scanEmp.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await scanEmp.evaluate(() => {
    const review = document.querySelector("#review");
    if (review && !review.open) review.open = true;
  });
  await scanEmp.waitForSelector('[data-testid="permission-clients"]', { timeout: 10000 });
  for (const perm of [
    "terms",
    "sale",
    "ledger",
    "cash",
    "transfer",
    "recommend",
    "team",
    "catalog",
    "own",
  ]) {
    const el = scanEmp.locator(`[data-testid="permission-${perm}"]`);
    if (await el.count()) await el.setChecked(false);
  }
  await scanEmp.locator('[data-testid="permission-clients"]').setChecked(true);
  await scanEmp.locator('[data-testid="permission-scan"]').setChecked(true);
  await scanEmp.locator('[data-control="invite"]').selectOption("valid");
  await scanEmp.waitForTimeout(300);
  await scanEmp.locator('[data-testid="nav-scanner"]').click();
  await scanEmp.waitForSelector('[data-ca-action="standalone:146"]', { timeout: 15000 });
  await scanEmp.locator('[data-ca-action="standalone:146"]').click();
  await scanEmp.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", { timeout: 15000 });
  const frame146 = scanEmp.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame146.locator("#pst-confirm").waitFor({ timeout: 8000 });
  const scanUi = await frame146.locator("html").evaluate(() => {
    const confirm = document.getElementById("pst-confirm");
    const finish = document.getElementById("pst-review-finish");
    const notice = document.querySelector(".pst-notice span");
    return {
      confirmDisabled: confirm?.disabled === true || confirm?.hasAttribute("disabled"),
      confirmHidden: confirm?.hidden || confirm?.hasAttribute("hidden"),
      finishHidden: finish?.hidden || finish?.hasAttribute("hidden"),
      notice: notice?.textContent?.trim() || "",
    };
  });
  assert.ok(scanUi.confirmDisabled && scanUi.confirmHidden, "scan-only employee: pst-confirm disabled and hidden");
  assert.ok(scanUi.finishHidden, "scan-only employee: pst-review-finish hidden");
  assert.match(
    scanUi.notice,
    /Подтверждение продажи недоступно|Просмотр макета|Продажа и начисление/i,
  );
  await scanEmp.close();

  const scrollPage = await browser.newPage();
  await scrollPage.setViewportSize({ width: 1280, height: 720 });
  await scrollPage.goto(`${base}/partner/index.html?role=store`, { waitUntil: "load" });
  await scrollPage.evaluate(() => document.querySelector('[data-testid="view-cabinet"]')?.click());
  await scrollPage.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await scrollPage.evaluate(() =>
    document.querySelector('[data-action="nav:settlements"], [data-action="nav:wallet"]')?.click(),
  );
  await scrollPage.locator("[data-testid='wallet-history-hub-link']").click();
  await scrollPage.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", { timeout: 15000 });
  await scrollPage.evaluate(() => {
    const main = document.querySelector(".shell .content, .shell main.content");
    main?.scrollIntoView({ block: "end" });
    window.scrollBy(0, 320);
  });
  await scrollPage.waitForTimeout(100);
  await scrollPage.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await scrollPage.waitForTimeout(150);
  const aligned = await scrollPage.evaluate(() => {
    const host = document.querySelector("[data-testid='cabinet-standalone-host']");
    const main = document.querySelector(".shell .content, .shell main.content");
    if (!host || host.hidden || !main) return null;
    const ht = host.getBoundingClientRect().top;
    const mt = main.getBoundingClientRect().top;
    return { hostTop: ht, mainTop: mt, delta: Math.abs(ht - mt) };
  });
  assert.ok(aligned && aligned.delta < 12, `portal must track main after document scroll (${JSON.stringify(aligned)})`);
  await scrollPage.close();

  const chainPage = await browser.newPage();
  await chainPage.setViewportSize({ width: 1280, height: 900 });
  await chainPage.goto(`${base}/partner/index.html?role=store`, { waitUntil: "load" });
  await chainPage.evaluate(() => {
    const roleEl = document.querySelector('[data-testid="scenario-role"]');
    if (roleEl) {
      roleEl.value = "store";
      roleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await chainPage.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await chainPage.locator('[data-action="nav:settlements"], [data-action="nav:wallet"]').first().click();
  await chainPage.locator("[data-testid='wallet-history-hub-link']").click();
  await chainPage.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])");
  const badge147 = await chainPage.evaluate(() => window.__protoCabinetEmbeddedPage?.n);
  assert.equal(badge147, 147);
  const frame147c = chainPage.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame147c.locator(".history-tabs [data-view='accruals']").click();
  await frame147c.locator("[data-accrual-row='0']").click();
  await frame147c.locator("[data-testid='wallet-open-receipt-145']").click();
  await chainPage.waitForFunction(
    () => window.__protoCabinetEmbeddedPage?.n === 145,
    null,
    { timeout: 10000 },
  );
  const frame145 = chainPage.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame145.locator("#prr-cert-code", { hasText: "RC-X9Z0WZ" }).waitFor({ timeout: 10000 });
  const hero145 = (await frame145.locator("#prr-hero-label").textContent())?.trim() || "";
  assert.match(hero145, /профклиенту/i, `145 hero label, got: ${hero145}`);
  const calc145 = await frame145.locator("#prr-calc-text").textContent();
  assert.match(calc145 || "", /недоступна/i);
  assert.doesNotMatch(calc145 || "", /115.?000/);
  await frame145.locator("#prr-ok").click();
  await chainPage.waitForFunction(() => window.__protoCabinetEmbeddedPage?.n === 147, null, {
    timeout: 10000,
  });
  const frame147b = chainPage.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame147b.locator("#detail-view:not([hidden])").waitFor({ timeout: 8000 });
  await frame147b.locator("#open-related").click();
  await chainPage.waitForFunction(() => window.__protoCabinetEmbeddedPage?.n === 144, null, {
    timeout: 10000,
  });
  const frame144a = chainPage.frameLocator("[data-testid='cabinet-standalone-frame']");
  const reward144 = (await frame144a.locator(".op-accrual-amount").textContent()) || "";
  assert.doesNotMatch(reward144, /5\s*400/, `144 must not show default reward, got: ${reward144}`);
  assert.ok(await frame144a.locator("#op-breakdown").isHidden(), "144 embed must hide calc breakdown");
  const parts144 = (await frame144a.locator(".op-participants").textContent()) || "";
  assert.doesNotMatch(parts144, /Сергей/i, "144 must not show default executor");
  await frame144a.locator("#op-history").click();
  await chainPage.waitForFunction(() => window.__protoCabinetEmbeddedPage?.n === 147, null, {
    timeout: 10000,
  });
  await frame147b.locator("#detail-view:not([hidden])").waitFor({ timeout: 8000 });

  await frame147b.locator("#open-related").click();
  await chainPage.waitForFunction(() => window.__protoCabinetEmbeddedPage?.n === 144, null, {
    timeout: 10000,
  });
  const frame144b = chainPage.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame144b.locator("#op-document-operations").click();
  await chainPage.waitForFunction(() => window.__protoCabinetEmbeddedPage?.n === 147, null, {
    timeout: 10000,
  });
  const frame147list = chainPage.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame147list.locator("#history-view:not([hidden])").waitFor({ timeout: 8000 });
  const searchVal = await frame147list.locator("#search").inputValue();
  assert.equal(searchVal.trim(), "RC-X9Z0WZ");
  await chainPage.locator('[data-testid="proto-standalone-back"]').click();
  await chainPage.waitForFunction(() => window.__protoCabinetEmbeddedPage?.n === 147, null, {
    timeout: 10000,
  });
  const frame147detail = chainPage.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame147detail.locator("#detail-view:not([hidden])").waitFor({ timeout: 8000 });
  await chainPage.locator('[data-testid="proto-standalone-close"]').click();
  await chainPage.waitForFunction(
    () => document.querySelector("[data-testid='cabinet-standalone-host']")?.hidden,
    null,
    { timeout: 10000 },
  );
  await chainPage.close();

  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 375, height: 812 },
  ]) {
    const dockPage = await browser.newPage();
    await dockPage.setViewportSize(viewport);
    await dockPage.goto(`${base}/partner/index.html?role=store`, { waitUntil: "load" });
    await dockPage.evaluate(() => document.querySelector('[data-testid="view-cabinet"]')?.click());
    await dockPage.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
    await dockPage.locator('[data-action="nav:partners"], [data-action="nav:links"]').first().click();
    await dockPage.waitForSelector("[data-coll-open]", { timeout: 10000 });
    await dockPage.locator("[data-coll-open]").first().click();
    await dockPage.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])");
    const dockZ = await dockPage.evaluate(() => {
      const flow = document.querySelector(".proto-page-flow");
      const host = document.querySelector("[data-testid='cabinet-standalone-host']");
      if (!flow || !host) return null;
      const fz = Number.parseInt(getComputedStyle(flow).zIndex, 10);
      const hz = Number.parseInt(getComputedStyle(host).zIndex, 10);
      return { flowZ: fz, hostZ: hz, hostActive: document.documentElement.classList.contains("proto-cabinet-embed-host-active") };
    });
    assert.ok(dockZ?.hostActive, `embed host class at ${viewport.width}px`);
    assert.ok(dockZ && dockZ.flowZ > dockZ.hostZ, `reviewer dock above portal at ${viewport.width}px`);
    const flowBox = await dockPage.locator(".proto-page-flow").boundingBox();
    const hostBox = await dockPage.locator("[data-testid='cabinet-standalone-host']").boundingBox();
    assert.ok(flowBox && hostBox, `dock and host measurable at ${viewport.width}px`);
    assert.ok(hostBox.y + hostBox.height <= flowBox.y + 2, `embed ends above reviewer dock at ${viewport.width}px`);
    await dockPage.close();
  }

  console.log("prototype-cabinet-integration.browser.mjs: ok");
} finally {
  await browser.close();
  server.close();
}
