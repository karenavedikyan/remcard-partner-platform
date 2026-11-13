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
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
  const raw = reqUrl.pathname;
  let rel = raw === "/" ? "/index.html" : raw;
  const filePath = path.join(__dir, decodeURIComponent(rel.replace(/^\//, "")));
  if (!filePath.startsWith(__dir) || !existsSync(filePath)) {
    res.statusCode = 404;
    res.end("not found");
    return;
  }
  res.setHeader("Content-Type", contentType(filePath));
  if (
    filePath.endsWith(".html") &&
    reqUrl.searchParams.has("csp_frame_ancestors_pplx")
  ) {
    res.setHeader(
      "Content-Security-Policy",
      "frame-ancestors https://www.perplexity.ai https://perplexity.ai https://staging.perplexity.ai",
    );
  }
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
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await page.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await page.evaluate((scenarioRole) => {
    const roleEl = document.querySelector('[data-testid="scenario-role"]');
    if (!roleEl) return;
    roleEl.value = scenarioRole;
    roleEl.dispatchEvent(new Event("change", { bubbles: true }));
  }, role);
  await page.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await page.waitForFunction(
    (scenarioRole) => document.querySelector('[data-testid="scenario-role"]')?.value === scenarioRole,
    role,
    { timeout: 10000 },
  );
}

async function enablePrototypeR2(page) {
  await page.evaluate(() => {
    window.rcDemoMemory?.setItem?.("rc_release", "2");
    const el = document.querySelector('[data-testid="prototype-release"]');
    if (el) {
      el.value = "2";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await page.waitForTimeout(300);
}

async function clientsDirectionCycle(page, role, { r2 = false, label = role, skipEnter = false } = {}) {
  if (!skipEnter) {
    if (role === "specialist") {
      await page.goto(`${base}/partner/index.html?role=specialist&open=clients`, { waitUntil: "load" });
      await page.waitForSelector('[data-testid="view-cabinet"][aria-pressed="true"]', { timeout: 20000 });
    } else {
      await enterCabinet(page, role);
      await page.locator('[data-testid="nav-clients"]:visible').first().click();
    }
  } else {
    await page.locator('[data-testid="nav-clients"]:visible').first().click();
  }
  await page.waitForSelector("[data-ca-root]", { timeout: 10000 });
  if (r2) await enablePrototypeR2(page);

  if (role === "agent") {
    await page.waitForSelector('[data-testid="ca-observer-partners-list"]', { timeout: 10000 });
    assert.equal(await page.$('[data-testid="ca-clients-directions"]'), null, `${label}: no direction tabs`);
    assert.equal(await page.$(".ca-row"), null, `${label}: no flat receiving rows`);
    await page.locator('[data-testid="ca-observer-partner-card"]').first().click();
    await page.waitForSelector('[data-testid="ca-observer-client-row"]', { timeout: 8000 });
    await page.locator('[data-testid="ca-observer-client-row"]').first().click();
    await page.waitForSelector('[data-testid="ca-observer-client-page"]', { timeout: 8000 });
    await page.locator('[data-testid="ca-clients-back"]').click();
    await page.waitForSelector('[data-testid="ca-observer-partner-page"]', { timeout: 8000 });
    await page.locator('[data-testid="ca-clients-back"]').click();
    await page.waitForSelector('[data-testid="ca-observer-partners-list"]', { timeout: 8000 });
    return;
  }

  await page.waitForSelector('[data-ca-action="direction:at-partners"]', { timeout: 10000 });
  const incomingTab = page.locator('[data-ca-action="direction:incoming"]');
  const atPartnersTab = page.locator('[data-ca-action="direction:at-partners"]');
  assert.ok(
    (await page.locator('[data-testid="ca-clients-directions"]').count()) > 0,
    `${label}: clients direction tablist present`,
  );
  assert.equal(await incomingTab.getAttribute("aria-selected"), "true", `${label}: default incoming selected`);
  assert.ok(
    (await page.locator('[data-ca-action="nav:scan"]').count()) > 0,
    `${label}: receiving scan/manual surface on incoming`,
  );
  assert.equal(await page.$('[data-testid="ca-observer-partners-list"]'), null, `${label}: observer list hidden on incoming`);

  await atPartnersTab.click();
  await page.waitForSelector('[data-testid="ca-observer-partners-list"]', { timeout: 8000 });
  assert.equal(await atPartnersTab.getAttribute("aria-selected"), "true", `${label}: at-partners tab selected`);
  assert.equal(await incomingTab.getAttribute("aria-selected"), "false", `${label}: incoming deselected`);
  assert.equal(await page.$('[data-ca-action="nav:scan"]'), null, `${label}: scan hidden on at-partners`);

  await page.locator('[data-testid="ca-observer-partner-card"]').first().click();
  await page.waitForSelector('[data-testid="ca-observer-partner-page"]', { timeout: 8000 });
  await page.locator('[data-testid="ca-observer-client-row"]').first().click();
  await page.waitForSelector('[data-testid="ca-observer-client-page"]', { timeout: 8000 });
  await page.locator('[data-testid="ca-clients-back"]').click();
  await page.waitForSelector('[data-testid="ca-observer-partner-page"]', { timeout: 8000 });
  await page.locator('[data-testid="ca-clients-back"]').click();
  await page.waitForSelector('[data-testid="ca-observer-partners-list"]', { timeout: 8000 });

  await incomingTab.click();
  await page.waitForSelector('[data-ca-action="nav:scan"]', { timeout: 8000 });
  assert.equal(await incomingTab.getAttribute("aria-selected"), "true", `${label}: receiving restored after cycle`);
}

async function enterEmployeeClientsCabinet(page) {
  await page.goto(`${base}/partner/index.html?role=employee`, { waitUntil: "load" });
  await page.evaluate(() => {
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await page.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await page.evaluate(() => {
    const roleEl = document.querySelector('[data-testid="scenario-role"]');
    if (!roleEl) return;
    roleEl.value = "employee";
    roleEl.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await page.evaluate(() => {
    const review = document.querySelector("#review");
    if (review && !review.open) review.open = true;
  });
  await page.waitForSelector('[data-testid="permission-clients"]', { timeout: 10000 });
  if (await page.locator('[data-control="invite"]').count()) {
    await page.locator('[data-control="invite"]').selectOption("valid");
  }
  await page.locator('[data-testid="permission-clients"]').setChecked(true);
  await page.waitForFunction(
    () => document.querySelector('[data-testid="nav-clients"]')?.offsetParent !== null,
    null,
    { timeout: 10000 },
  );
}

try {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 375, height: 812 },
  ]) {
    const page = await browser.newPage();
    await page.setViewportSize(viewport);
    await enterCabinet(page, "store");
    await page.locator('[data-testid="nav-partners"]:visible, [data-testid="nav-links"]:visible').first().click();
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
      const htmlObscured = await page.evaluate(() => {
        const children = [...document.querySelectorAll(".shell main.content > *, .shell .content.main > *")];
        return (
          document.documentElement.classList.contains("proto-cabinet-embed-host-active") &&
          children.length > 0 &&
          children.every((el) => getComputedStyle(el).visibility === "hidden")
        );
      });
      assert.ok(htmlObscured, "html embed class hides stale main at desktop");
      for (let i = 0; i < 2; i++) {
        const themeNow = await page.evaluate(() => document.documentElement.dataset.theme);
        if (themeNow === "dark") break;
        await page.locator('[data-action="theme"]').click();
      }
      await page.waitForFunction(() => document.documentElement.dataset.theme === "dark", null, {
        timeout: 5000,
      });
      const hostTheme = await page
        .locator("[data-testid='cabinet-standalone-host']")
        .getAttribute("data-embed-host-theme");
      assert.equal(hostTheme, "dark", "portal host tracks dark theme");
      const afterTheme = await page.evaluate(() => {
        const children = [...document.querySelectorAll(".shell main.content > *, .shell .content.main > *")];
        return {
          htmlActive: document.documentElement.classList.contains("proto-cabinet-embed-host-active"),
          hidden: children.filter((el) => getComputedStyle(el).visibility === "hidden").length,
          total: children.length,
        };
      });
      assert.ok(afterTheme.htmlActive, "embed host html class survives R()");
      assert.equal(afterTheme.hidden, afterTheme.total, "stale main hidden after theme cycle");
      const barChrome = await page
        .locator("[data-testid='cabinet-standalone-host']")
        .evaluate((host) => {
          const back = host.querySelector('[data-testid="proto-standalone-back"]');
          const title = host.querySelector("[data-standalone-title]");
          const pick = (el) => (el ? getComputedStyle(el).color : "");
          return {
            hostTheme: host.dataset.embedHostTheme,
            back: pick(back),
            title: pick(title),
            inkVar: getComputedStyle(host).getPropertyValue("--embed-host-ink").trim(),
          };
        });
      assert.equal(barChrome.hostTheme, "dark");
      assert.equal(barChrome.inkVar.toLowerCase(), "#f1f0eb", "portal exposes dark ink token on host");
      assert.match(barChrome.title, /^rgb\(24[01],\s*24[01]/, `host title readable in dark, got ${barChrome.title}`);
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
      hasSrc:
        !!iframe?.getAttribute("src") ||
        !!iframe?.getAttribute("srcdoc") ||
        !!iframe?.dataset?.embedUrl,
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
    iframeSrc:
      document.querySelector("[data-testid='cabinet-standalone-frame']")?.dataset?.embedUrl ||
      document.querySelector("[data-testid='cabinet-standalone-frame']")?.getAttribute("src") ||
      "",
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
  const agentWorkspaceName = (
    await agentWallet.locator(".sidebar .workspace strong").textContent()
  )?.trim();
  const agentWalletRibbon = (
    await agentWallet.locator('[data-testid="wallet-receivable-ribbon"]').textContent()
  )?.trim();
  assert.match(agentWorkspaceName || "", /Мария/, "agent demo workspace must use seeded actor");
  assert.equal(
    agentWalletRibbon,
    agentWorkspaceName,
    "wallet card ribbon must match selected workspace actor, not unrelated fixture",
  );
  const hubLinkStyles = await agentWallet.evaluate(() => {
    const el = document.querySelector('[data-testid="wallet-history-hub-link"]');
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      fontSize: cs.fontSize,
      color: cs.color,
      minHeight: cs.minHeight,
      lineHeight: cs.lineHeight,
    };
  });
  assert.equal(hubLinkStyles?.tag, "A", "history hub must be anchor like production Link");
  assert.match(hubLinkStyles?.fontSize || "", /^13px$/, "history hub font-size 0.8125rem");
  assert.match(hubLinkStyles?.lineHeight || "", /^17\.(5|55)px$/, "history hub line-height 1.35 at 0.8125rem");
  assert.match(hubLinkStyles?.color || "", /rgb\(10,\s*107,\s*96\)/, "history hub teal color");
  assert.equal(hubLinkStyles?.minHeight, "0px", "history hub must not inherit global button min-height");
  assert.equal(
    await agentWallet.locator("[data-wallet-accruals][data-agent-wallet='true']").count(),
    1,
    "agent wallet uses production shell layout marker",
  );
  assert.equal(
    await agentWallet.locator(".wallet-accruals-editions").count(),
    0,
    "agent wallet must not show edition picker",
  );
  assert.equal(
    await agentWallet.locator('[data-testid="wallet-receivable-demo-number"]').count(),
    0,
    "agent wallet must omit PAN like production without cardIdentifier",
  );
  const hubOverlapsEyebrow = await agentWallet.evaluate(() => {
    const hub = document.querySelector('[data-testid="wallet-history-hub-link"]');
    const eyebrow = document.querySelector(".wallet-accruals-history__eyebrow");
    if (!hub || !eyebrow) return true;
    const a = hub.getBoundingClientRect();
    const b = eyebrow.getBoundingClientRect();
    return a.bottom > b.top + 1 && a.top < b.bottom - 1 && !(a.right < b.left || a.left > b.right);
  });
  assert.equal(hubOverlapsEyebrow, false, "history hub link must not overlap История eyebrow at 1280");
  await agentWallet.setViewportSize({ width: 375, height: 812 });
  await agentWallet.waitForTimeout(300);
  const hubOverlapsEyebrowMobile = await agentWallet.evaluate(() => {
    const hub = document.querySelector('[data-testid="wallet-history-hub-link"]');
    const eyebrow = document.querySelector(".wallet-accruals-history__eyebrow");
    if (!hub || !eyebrow) return true;
    const a = hub.getBoundingClientRect();
    const b = eyebrow.getBoundingClientRect();
    return a.bottom > b.top + 1 && a.top < b.bottom - 1 && !(a.right < b.left || a.left > b.right);
  });
  assert.equal(hubOverlapsEyebrowMobile, false, "history hub link must not overlap История eyebrow at 375");
  await agentWallet.evaluate(() => {
    document.querySelector('[data-action="theme"]')?.click();
  });
  await agentWallet.waitForTimeout(200);
  const hubColorDark = await agentWallet.evaluate(() =>
    getComputedStyle(document.querySelector('[data-testid="wallet-history-hub-link"]')).color,
  );
  assert.match(hubColorDark || "", /rgb\(127,\s*216,\s*201\)/, "dark theme history hub link teal");
  await agentWallet.setViewportSize({ width: 1280, height: 900 });
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
  const agentAccrualRow = (
    await frame147.locator("[data-accrual-row='0'] .operation-main strong").textContent()
  )?.trim();
  assert.match(agentAccrualRow || "", /Заработанное вознаграждение/);
  const filterPe = await frame147.locator("#filter-button").evaluate((el) => getComputedStyle(el).pointerEvents);
  assert.notEqual(filterPe, "none", "agent read-only wallet must keep filter control clickable");
  await frame147.locator("#filter-button").click();
  await frame147.locator("#filters:not([hidden])").waitFor({ timeout: 5000 });
  assert.equal(await frame147.locator("#filter-button").getAttribute("aria-expanded"), "true");
  await frame147.locator("#status").selectOption("active");
  await frame147.locator("#result-count").waitFor({ timeout: 3000 });
  const embedHref = await agentWallet
    .locator("[data-testid='cabinet-standalone-frame']")
    .evaluate((el) => el?.dataset?.embedUrl || el?.getAttribute("src") || "");
  assert.ok(embedHref.includes("embed_role=agent"), "147 iframe must carry embed_role");
  await frame147.locator('.history-tabs [data-view="purchases"]').click();
  await frame147.locator("[data-purchase-embed='1']").waitFor({ timeout: 10000 });
  await frame147.locator("[data-purchase-embed='1']").click();
  await agentWallet.waitForFunction(() => window.__protoCabinetEmbeddedPage?.n === 144, null, {
    timeout: 10000,
  });
  const frame144second = agentWallet.frameLocator("[data-testid='cabinet-standalone-frame']");
  const payableSecond = (await frame144second.locator(".op-payable").textContent()) || "";
  assert.match(payableSecond.replace(/\u00a0/g, " "), /103\s*500/, "second purchase row must open 144 with ctx amount");
  assert.doesNotMatch(payableSecond, /162\s*000/, "second row must not show first-purchase fixture");
  const modalOpen = await frame144second.locator("#purchase-dialog[open]").count();
  assert.equal(modalOpen, 0, "second purchase must not open legacy hardcoded modal");
  await agentWallet.locator('[data-testid="proto-standalone-back"]').click();
  await agentWallet.waitForFunction(() => window.__protoCabinetEmbeddedPage?.n === 147, null, {
    timeout: 10000,
  });
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
  await frame146.locator("#pst-confirm").waitFor({ state: "attached", timeout: 8000 });
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
  await frame146.locator("#pst-amt-doors").fill("1000");
  await frame146.locator("#pst-confirm").click({ timeout: 2000, force: true }).catch(() => {});
  const scanAfterCalc = await frame146.locator("html").evaluate(() => {
    const confirm = document.getElementById("pst-confirm");
    const overlay = document.getElementById("pst-overlay-review");
    return {
      confirmHidden: confirm?.hasAttribute("hidden") && confirm?.hasAttribute("data-embed-sale-locked"),
      confirmDisplay: confirm ? getComputedStyle(confirm).display : "",
      reviewOpen: overlay ? !overlay.hidden : false,
      blockReason: document.getElementById("pst-block-reason")?.textContent?.trim() || "",
    };
  });
  assert.equal(scanAfterCalc.confirmDisplay, "none", "scan-only: confirm stays hidden after calculator");
  assert.ok(scanAfterCalc.confirmHidden, "scan-only: confirm stays sale-locked after edits");
  assert.ok(!scanAfterCalc.reviewOpen, "scan-only: fill 1000 must not open review dialog");
  await scanEmp.close();

  const saleStore = await browser.newPage();
  await saleStore.setViewportSize({ width: 1280, height: 900 });
  await saleStore.goto(`${base}/partner/index.html?role=store&open=clients&proto_standalone=146`, {
    waitUntil: "load",
  });
  await saleStore.waitForSelector("[data-testid='cabinet-standalone-frame']", { timeout: 20000 });
  const frame146Sale = saleStore.frameLocator("[data-testid='cabinet-standalone-frame']");
  await frame146Sale.locator("#pst-amt-doors").fill("1000");
  await frame146Sale.locator("#pst-confirm:not([disabled])").click({ timeout: 8000 });
  await frame146Sale.locator("#pst-overlay-review:not([hidden])").waitFor({ timeout: 5000 });
  await frame146Sale.locator("#pst-review-finish").click();
  await frame146Sale.locator("#pst-complete:not([hidden])").waitFor({ timeout: 5000 });
  await saleStore.close();

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
  await frame145.locator("#prr-amount", { hasText: /\+\s*0/ }).waitFor({ timeout: 8000 });
  const hero145 = (await frame145.locator("#prr-hero-label").textContent())?.trim() || "";
  assert.match(hero145, /профклиенту/i, `145 hero label, got: ${hero145}`);
  const amt145 = (await frame145.locator("#prr-amount").textContent()) || "";
  assert.match(amt145.replace(/\u00a0/g, " "), /\+\s*0\s*₽/, `147→145 must show saved zero, got: ${amt145}`);
  assert.doesNotMatch(amt145, /3\s*450/, `145 must not show template default, got: ${amt145}`);
  const calc145 = await frame145.locator("#prr-calc-text").textContent();
  assert.match(calc145 || "", /недоступна/i);
  assert.doesNotMatch(calc145 || "", /115.?000/);
  const quickOk = await chainPage.evaluate(() => {
    const frame = document.querySelector("[data-testid='cabinet-standalone-frame']");
    if (!frame?.contentDocument) return { clicked: false };
    const win = frame.contentWindow;
    const ok = frame.contentDocument.getElementById("prr-ok");
    if (!ok || ok.closest("#prr-overlay")?.hidden) return { clicked: false };
    ok.click();
    return { clicked: true, bound: !!win?.__protoReceiptEmbedDismissBound };
  });
  assert.ok(quickOk.clicked && quickOk.bound, "145 embed dismiss capture must be live before deferred native");
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

  const resizeThemePage = await browser.newPage();
  await resizeThemePage.setViewportSize({ width: 1280, height: 900 });
  await enterCabinet(resizeThemePage, "store");
  await resizeThemePage.locator('[data-action="nav:partners"], [data-action="nav:links"]').first().click();
  await resizeThemePage.waitForSelector("[data-coll-open]", { timeout: 10000 });
  const partnerOpenCard = resizeThemePage.locator("[data-testid^='partner-open-card-']").first();
  await partnerOpenCard.waitFor({ timeout: 10000 });
  await partnerOpenCard.click();
  await resizeThemePage.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])");
  await resizeThemePage.setViewportSize({ width: 375, height: 812 });
  await resizeThemePage.waitForTimeout(200);
  const mobileObscured = await resizeThemePage.evaluate(() => {
    const children = [...document.querySelectorAll(".shell main.content > *, .shell .content.main > *")];
    return {
      htmlActive: document.documentElement.classList.contains("proto-cabinet-embed-host-active"),
      hidden: children.filter((el) => getComputedStyle(el).visibility === "hidden").length,
      total: children.length,
    };
  });
  assert.ok(mobileObscured.htmlActive, "html embed class after desktop→mobile resize");
  assert.equal(mobileObscured.hidden, mobileObscured.total, "no stale table under dock on mobile");
  await resizeThemePage.locator('[data-testid="proto-standalone-close"]').click();
  await resizeThemePage.waitForFunction(
    () => document.querySelector("[data-testid='cabinet-standalone-host']")?.hidden,
    null,
    { timeout: 10000 },
  );
  const restored = await resizeThemePage.evaluate(() => {
    const children = [...document.querySelectorAll(".shell main.content > *, .shell .content.main > *")];
    return children.every((el) => getComputedStyle(el).visibility !== "hidden");
  });
  assert.ok(restored, "main visibility restored after embed close");
  await resizeThemePage.close();

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
    const hostBox = await dockPage.locator("[data-testid='cabinet-standalone-host']").boundingBox();
    const viewportH = viewport.height;
    assert.ok(hostBox, `embed host measurable at ${viewport.width}px`);
    assert.ok(hostBox.height > viewport.width > 600 ? 400 : 260, `embed host uses viewport (${hostBox.height}px at ${viewport.width}px)`);
    assert.ok(hostBox.y + hostBox.height <= viewportH + 4, "embed host stays within viewport");
    await dockPage.close();
  }

  for (const spec of [
    { role: "store", r2: false, label: "store" },
    { role: "store", r2: true, label: "store R2" },
    { role: "company", r2: false, label: "company" },
    { role: "specialist", r2: false, label: "specialist" },
    { role: "specialist", r2: true, label: "specialist R2" },
  ]) {
    const cyclePage = await browser.newPage();
    await cyclePage.setViewportSize({ width: 1280, height: 900 });
    await clientsDirectionCycle(cyclePage, spec.role, { r2: spec.r2, label: spec.label });
    await cyclePage.close();
  }

  const agentPage = await browser.newPage();
  await agentPage.setViewportSize({ width: 1280, height: 900 });
  await clientsDirectionCycle(agentPage, "agent", { label: "agent observer-only" });
  const agentLegacy = await agentPage.$('[data-testid="ca-clients-preview-toggle"]');
  assert.equal(agentLegacy, null, "agent has no legacy preview opt-in");
  const agentR1RepairCta = await agentPage.$('[data-ca-action="standalone:142"]');
  assert.equal(agentR1RepairCta, null, "R1 agent observer client hides 142 CTA entirely");
  await agentPage.close();

  const empClientsPage = await browser.newPage();
  await empClientsPage.setViewportSize({ width: 1280, height: 900 });
  await enterEmployeeClientsCabinet(empClientsPage);
  await clientsDirectionCycle(empClientsPage, "employee", { label: "employee clients scope", skipEnter: true });
  await empClientsPage.close();

  const r2Page = await browser.newPage();
  await r2Page.setViewportSize({ width: 1280, height: 900 });
  await enterCabinet(r2Page, "store");
  await r2Page.evaluate(() => {
    window.rcDemoMemory?.setItem?.("rc_release", "2");
    const el = document.querySelector('[data-testid="prototype-release"]');
    if (el) {
      el.value = "2";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await r2Page.waitForTimeout(300);
  await r2Page.locator('[data-action="nav:clients"]').click();
  await r2Page.waitForSelector('[data-testid="ca-r2-repair-entry"]', { timeout: 10000 });
  await r2Page.locator('[data-ca-action="nav:repair-objects"]').click();
  await r2Page.waitForSelector('[data-testid="ca-r2-repair-page"]');
  await r2Page.locator('[data-testid="ca-r2-object-r2-obj-krd-aurora"]').click();
  await r2Page.locator('[data-testid="ca-r2-open-142"]').click();
  await r2Page.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", { timeout: 10000 });
  await r2Page.waitForFunction(
    () => {
      const frame = document.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        frame?.dataset?.embedContentReady === "1" &&
        frame?.dataset?.embedGuestMarker === "r2-obj-krd-aurora"
      );
    },
    null,
    { timeout: 20000 },
  );
  await r2Page.locator('[data-testid="proto-standalone-back"]').click();
  await r2Page.waitForSelector('[data-testid="ca-r2-object-detail"]', { timeout: 10000 });
  await r2Page.locator('[data-testid="ca-r2-open-141"]').click();
  await r2Page.waitForFunction(
    () => {
      const frame = document.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        frame?.dataset?.embedContentReady === "1" &&
        frame?.dataset?.embedGuestMarker === "r2-obj-krd-aurora"
      );
    },
    null,
    { timeout: 20000 },
  );
  await r2Page.locator('[data-testid="proto-standalone-back"]').click();
  await r2Page.waitForSelector('[data-testid="ca-r2-object-detail"]', { timeout: 10000 });
  const afterBack = await r2Page.evaluate(() => ({
    view: document.querySelector('[data-testid="ca-r2-repair-page"]') != null,
    selected: document.querySelector('[data-testid="ca-r2-object-r2-obj-krd-aurora"]')?.classList.contains("is-selected"),
  }));
  assert.ok(afterBack.view && afterBack.selected, "back restores R2 repair object context");
  await r2Page.locator('[data-testid="ca-r2-object-r2-obj-spb-loft"]').click();
  await r2Page.locator('[data-testid="ca-r2-open-142"]').click();
  await r2Page.waitForFunction(
    () => {
      const frame = document.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        frame?.dataset?.embedContentReady === "1" &&
        frame?.dataset?.embedGuestMarker === "r2-obj-spb-loft"
      );
    },
    null,
    { timeout: 20000 },
  );
  await r2Page.locator('[data-testid="proto-standalone-back"]').click();
  await r2Page.waitForSelector('[data-testid="ca-r2-object-detail"]', { timeout: 10000 });
  await r2Page.locator('[data-testid="ca-r2-object-r2-obj-ekb-draft"]').click();
  const asgDisabled = await r2Page.locator('[data-testid="ca-r2-open-141"]').isDisabled();
  assert.ok(asgDisabled, "no assignment fixture keeps 141 disabled");
  await r2Page.evaluate(() => {
    window.rcDemoMemory?.setItem?.("rc_release", "1");
    const el = document.querySelector('[data-testid="prototype-release"]');
    if (el) {
      el.value = "1";
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await r2Page.waitForFunction(
    () => document.querySelector("[data-testid='cabinet-standalone-host']")?.hidden !== false,
    null,
    { timeout: 5000 },
  );
  const r1Entry = await r2Page.$('[data-testid="ca-r2-repair-entry"]');
  assert.equal(r1Entry, null, "R1 hides repair objects entry");
  await r2Page.close();

  const tocPage = await browser.newPage();
  await tocPage.setViewportSize({ width: 1280, height: 900 });
  await tocPage.goto(`${base}/partner/index.html?role=agent`, { waitUntil: "load" });
  await tocPage.evaluate(() => {
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await tocPage.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await tocPage.locator(".proto-page-toc-btn").click();
  await tocPage.locator('a[data-page-n="147"]').click();
  await tocPage.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", {
    timeout: 15000,
  });
  const toc147Src = await tocPage.locator("[data-testid='cabinet-standalone-frame']").evaluate(
    (el) => el?.dataset?.embedUrl || el?.getAttribute("src") || "",
  );
  assert.ok(toc147Src.includes("cabinet_embed=1"), "TOC 147 opens cabinet embed, not orphan HTML");
  await tocPage.locator('[data-testid="proto-standalone-close"]').click();
  await tocPage.locator(".proto-page-toc-btn").click();
  await tocPage.locator('a[data-page-n="143"]').click();
  await tocPage.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", {
    timeout: 15000,
  });
  const toc143Src = await tocPage.locator("[data-testid='cabinet-standalone-frame']").evaluate(
    (el) => el?.dataset?.embedUrl || el?.getAttribute("src") || "",
  );
  assert.ok(toc143Src.includes("cabinet_embed=1"), "TOC 143 opens cabinet embed");
  assert.ok(toc143Src.includes("embed_role=agent"), "TOC 143 preserves agent embed role");
  await tocPage.close();

  const toc140Nest = await browser.newPage();
  await toc140Nest.setViewportSize({ width: 1280, height: 900 });
  const toc140Errors = [];
  toc140Nest.on("pageerror", (err) => toc140Errors.push(String(err)));
  await toc140Nest.goto(`${base}/prototype-preview-nest-fixture.html`, { waitUntil: "load" });
  await toc140Nest.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector('[data-testid="view-cabinet"]'),
    null,
    { timeout: 25000 },
  );
  await toc140Nest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const roleEl = doc?.querySelector('[data-testid="scenario-role"]');
    if (roleEl) {
      roleEl.value = "store";
      roleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    doc?.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  const cabFrame140 = toc140Nest.frameLocator("#cabinet");
  await cabFrame140.locator(".shell aside.sidebar").waitFor({ timeout: 25000 });
  await toc140Nest.evaluate(() => {
    const win = document.querySelector("#cabinet")?.contentWindow;
    if (typeof win?.__protoCabinetTocStandalone !== "function") {
      throw new Error("protoCabinetTocStandalone missing on cabinet frame");
    }
    win.__protoCabinetTocStandalone(140);
  });
  await toc140Nest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      const marker = frame?.dataset?.embedGuestMarker || "";
      return (
        frame?.dataset?.embedMount === "srcdoc" &&
        frame?.dataset?.embedContentReady === "1" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 140 &&
        /rec140-qr-raster-ok/.test(marker)
      );
    },
    null,
    { timeout: 35000 },
  );
  assert.equal(toc140Errors.length, 0, `TOC 140 opaque embed must not throw: ${toc140Errors.join(" | ")}`);
  const rec140Frame = cabFrame140.frameLocator('[data-testid="cabinet-standalone-frame"]');
  await rec140Frame.getByText(/Дизайн-макет публичной рекомендации/i).waitFor({ timeout: 15000 });
  await rec140Frame.getByText(/DEMO-PROF-1/).waitFor({ timeout: 10000 });
  const rec140QrProbe = await rec140Frame.locator("[data-recommendation-qr]").evaluate((img) => ({
    src: img.getAttribute("src") || "",
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
  }));
  assert.match(rec140QrProbe.src, /^data:image\/(?:png|jpeg|jpg);/i, "TOC 140 hydrates recommendation QR raster");
  assert.ok(rec140QrProbe.naturalWidth > 40 && rec140QrProbe.naturalHeight > 40, "TOC 140 QR decodes");
  await rec140Frame.locator('[data-rec-client-action="code"]').click();
  const toc140Src = await cabFrame140.locator("[data-testid='cabinet-standalone-frame']").evaluate(
    (el) => el?.dataset?.embedUrl || "",
  );
  assert.ok(toc140Src.includes("recommendation.html"), toc140Src);
  assert.ok(toc140Src.includes("cabinet_embed=1"), "TOC 140 opens cabinet embed, not orphan recommendation.html");
  await toc140Nest.close();

  const hubToc = await browser.newPage();
  await hubToc.goto(`${base}/index.html`, { waitUntil: "load" });
  await hubToc.locator(".proto-page-toc-btn").click();
  const href147 = await hubToc.locator('a[data-page-n="147"]').getAttribute("href");
  assert.match(href147 || "", /proto_standalone=147/, "hub TOC 147 links into partner cabinet");
  assert.doesNotMatch(href147 || "", /partner-wallet-history\.html/, "hub TOC must not open orphan 147 HTML");
  const href140 = await hubToc.locator('a[data-page-n="140"]').getAttribute("href");
  assert.match(href140 || "", /proto_standalone=140/, "hub TOC 140 links into partner cabinet");
  assert.doesNotMatch(href140 || "", /recommendation\.html/, "hub TOC must not open orphan 140 HTML");
  const tocOpenBeforeLaunch = await hubToc.evaluate(() => {
    const panel = document.querySelector(".proto-page-panel");
    if (panel?.getAttribute("data-open") !== "true") {
      document.querySelector(".proto-page-toc-btn")?.click();
    }
    return panel?.getAttribute("data-open") === "true";
  });
  assert.ok(tocOpenBeforeLaunch, "hub TOC panel is open before book launch");
  await hubToc.locator('a[data-page-n="140"]').click();
  await hubToc.waitForURL(/partner\/index\.html.*proto_standalone=140/, { timeout: 15000 });
  await hubToc.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", { timeout: 25000 });
  await hubToc.waitForFunction(
    () => window.__protoCabinetEmbeddedPage?.n === 140 && document.querySelector("[data-testid='cabinet-standalone-frame']")?.dataset?.embedContentReady === "1",
    null,
    { timeout: 30000 },
  );
  const hub140Layout = await hubToc.evaluate(() => {
    const host = document.querySelector("[data-testid='cabinet-standalone-host']");
    const panel = document.querySelector(".proto-page-panel");
    const frame = document.querySelector("[data-testid='cabinet-standalone-frame']");
    return {
      panelOpen: panel?.getAttribute("data-open") === "true",
      hostHeight: host?.getBoundingClientRect().height || 0,
      frameHeight: frame?.getBoundingClientRect().height || 0,
    };
  });
  assert.equal(hub140Layout.panelOpen, false, "book TOC must close after launching a page");
  assert.ok(hub140Layout.hostHeight > 320, `embed host height must use viewport (${hub140Layout.hostHeight})`);
  assert.ok(hub140Layout.frameHeight > 240, `embed iframe height (${hub140Layout.frameHeight})`);
  const hub140Frame = hubToc.frameLocator('[data-testid="cabinet-standalone-frame"]');
  await hub140Frame.getByText(/Дизайн-макет публичной рекомендации/i).waitFor({ timeout: 15000 });
  const hub140Qr = await hub140Frame.locator("[data-recommendation-qr]").evaluate((img) => ({
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    srcLen: (img.getAttribute("src") || "").length,
    mime: (img.getAttribute("src") || "").slice(0, 24),
  }));
  assert.ok(hub140Qr.naturalWidth > 40, `hub TOC 140 QR width ${hub140Qr.naturalWidth}`);
  assert.match(hub140Qr.mime, /^data:image\/(?:png|jpeg)/i);
  await hubToc.goto(`${base}/index.html`, { waitUntil: "load" });
  await hubToc.locator(".proto-page-toc-btn").click();
  await hubToc.locator('a[data-page-n="143"]').click();
  await hubToc.waitForURL(/partner\/index\.html.*proto_standalone=143/, { timeout: 15000 });
  await hubToc.waitForSelector("[data-testid='cabinet-standalone-host']:not([hidden])", { timeout: 25000 });
  await hubToc.waitForFunction(
    () => window.__protoCabinetEmbeddedPage?.n === 143,
    null,
    { timeout: 25000 },
  );
  await hubToc.close();

  const previewNest = await browser.newPage();
  await previewNest.setViewportSize({ width: 1280, height: 900 });
  await previewNest.goto(`${base}/prototype-preview-nest-fixture.html`, { waitUntil: "load" });
  await previewNest.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector('[data-testid="view-cabinet"]'),
    null,
    { timeout: 25000 },
  );
  await previewNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await previewNest.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector(".shell aside.sidebar"),
    null,
    { timeout: 25000 },
  );
  await previewNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const nav = doc?.querySelector('[data-action="nav:partners"], [data-action="nav:links"]');
    nav?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await previewNest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const iframe = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        iframe?.dataset?.embedMount === "srcdoc" &&
        iframe?.dataset?.embedContentReady === "1" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 143
      );
    },
    null,
    { timeout: 25000 },
  );
  const nest143 = await previewNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
    return {
      mount: frame?.dataset?.embedMount || "",
      url: frame?.dataset?.embedUrl || "",
      badge: doc?.defaultView?.__protoCabinetEmbeddedPage?.n,
      hasSrcdoc: Boolean(frame?.getAttribute("srcdoc")),
      contentReady: frame?.dataset?.embedContentReady || "",
      sandbox: frame?.getAttribute("sandbox") || "",
    };
  });
  assert.equal(nest143.badge, 143);
  assert.equal(nest143.mount, "srcdoc");
  assert.equal(nest143.contentReady, "1");
  assert.match(nest143.sandbox, /allow-scripts/);
  assert.doesNotMatch(nest143.sandbox, /allow-same-origin/, "standalone embed iframe is opaque in preview srcdoc");
  assert.ok(nest143.hasSrcdoc, "nested preview must mount embed via fetched srcdoc");
  assert.ok(nest143.url.includes("partner-cooperation-detail"), nest143.url);
  await previewNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="proto-standalone-close"]')?.click();
    doc
      ?.querySelector('[data-action="nav:settlements"], [data-action="nav:wallet"]')
      ?.click();
    doc?.querySelector("[data-testid='wallet-history-hub-link']")?.click();
  });
  await previewNest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 147 &&
        frame?.dataset?.embedMount === "srcdoc" &&
        frame?.dataset?.embedContentReady === "1"
      );
    },
    null,
    { timeout: 25000 },
  );
  const nest147 = await previewNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
    return {
      mount: frame?.dataset?.embedMount || "",
      url: frame?.dataset?.embedUrl || "",
      contentReady: frame?.dataset?.embedContentReady || "",
      badge: doc?.defaultView?.__protoCabinetEmbeddedPage?.n,
    };
  });
  assert.equal(nest147.mount, "srcdoc");
  assert.equal(nest147.contentReady, "1");
  assert.equal(nest147.badge, 147);
  await previewNest.close();

  const staleRacePage = await browser.newPage();
  await staleRacePage.setViewportSize({ width: 1280, height: 900 });
  const staleRaceErrors = [];
  staleRacePage.on("pageerror", (err) => staleRaceErrors.push(String(err)));
  await staleRacePage.goto(`${base}/prototype-preview-nest-fixture.html`, { waitUntil: "load" });
  let releaseDelayed143 = null;
  const holdDelayed143 = new Promise((resolve) => {
    releaseDelayed143 = resolve;
  });
  await staleRacePage.route(/partner-cooperation-detail\.html/i, async (route) => {
    await holdDelayed143;
    await route.continue();
  });
  await staleRacePage.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector('[data-testid="view-cabinet"]'),
    null,
    { timeout: 25000 },
  );
  await staleRacePage.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const roleEl = doc?.querySelector('[data-testid="scenario-role"]');
    if (roleEl) {
      roleEl.value = "store";
      roleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    doc?.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await staleRacePage.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector(".shell aside.sidebar"),
    null,
    { timeout: 25000 },
  );
  await staleRacePage.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-action="nav:partners"]')?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await staleRacePage.waitForSelector("#cabinet", { timeout: 5000 });
  await staleRacePage.waitForTimeout(300);
  await staleRacePage.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="proto-standalone-close"]')?.click();
    doc?.querySelector('[data-action="nav:settlements"], [data-action="nav:wallet"]')?.click();
    doc?.querySelector("[data-testid='wallet-history-hub-link']")?.click();
  });
  await staleRacePage.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const host = doc?.querySelector("[data-testid='cabinet-standalone-host']");
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      const title = doc?.querySelector("[data-standalone-title]")?.textContent?.trim() || "";
      return (
        host &&
        !host.hidden &&
        frame?.dataset?.embedContentReady === "1" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 147 &&
        title.includes("История покупок")
      );
    },
    null,
    { timeout: 30000 },
  );
  releaseDelayed143?.();
  await staleRacePage.waitForTimeout(800);
  const afterStale = await staleRacePage.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
    return {
      title: doc?.querySelector("[data-standalone-title]")?.textContent?.trim() || "",
      url: frame?.dataset?.embedUrl || "",
      badge: doc?.defaultView?.__protoCabinetEmbeddedPage?.n,
      contentReady: frame?.dataset?.embedContentReady || "",
    };
  });
  assert.equal(afterStale.badge, 147, "delayed 143 response must not replace history badge");
  assert.ok(afterStale.url.includes("partner-wallet-history"), `embed url must stay on 147, got ${afterStale.url}`);
  assert.doesNotMatch(afterStale.url, /partner-cooperation-detail/, "stale 143 fetch must not rewrite embed url");
  assert.match(afterStale.title, /История покупок/, "host title must remain history after stale 143 load");
  assert.equal(afterStale.contentReady, "1", "history embed stays content-ready after stale response");

  await staleRacePage.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="proto-standalone-close"]')?.click();
  });
  await staleRacePage.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector("[data-testid='cabinet-standalone-host']")?.hidden,
    null,
    { timeout: 10000 },
  );
  let releaseSecond143 = null;
  const holdSecond143 = new Promise((resolve) => {
    releaseSecond143 = resolve;
  });
  await staleRacePage.unroute(/partner-cooperation-detail\.html/i);
  await staleRacePage.route(/partner-cooperation-detail\.html/i, async (route) => {
    await holdSecond143;
    await route.continue();
  });
  await staleRacePage.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-action="nav:partners"]')?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await staleRacePage.waitForTimeout(200);
  await staleRacePage.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="proto-standalone-close"]')?.click();
    doc?.querySelector('[data-action="nav:partners"]')?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await staleRacePage.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      return doc?.querySelector("[data-testid='cabinet-standalone-host']") && !doc.querySelector("[data-testid='cabinet-standalone-host']").hidden;
    },
    null,
    { timeout: 15000 },
  );
  releaseSecond143?.();
  await staleRacePage.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      return (
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 143 &&
        doc?.querySelector("[data-testid='cabinet-standalone-frame']")?.dataset?.embedContentReady === "1"
      );
    },
    null,
    { timeout: 25000 },
  );
  await staleRacePage.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const roleEl = doc?.querySelector('[data-testid="scenario-role"]');
    if (roleEl) {
      roleEl.value = "agent";
      roleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  await staleRacePage.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector("[data-testid='cabinet-standalone-host']")?.hidden,
    null,
    { timeout: 15000 },
  );
  assert.equal(
    staleRaceErrors.filter((m) => !/embed-content-ready aborted/i.test(m)).length,
    0,
    `stale srcdoc close/reopen must not throw: ${staleRaceErrors.join(" | ")}`,
  );
  assert.equal(
    staleRaceErrors.filter((m) => /embed-content-ready aborted/i.test(m)).length,
    0,
    "aborted embed readiness must be observed, not an unhandled pageerror",
  );
  await staleRacePage.close();

  const cert139Nest = await browser.newPage();
  await cert139Nest.setViewportSize({ width: 1280, height: 900 });
  const certPageErrors = [];
  cert139Nest.on("pageerror", (err) => certPageErrors.push(String(err)));
  await cert139Nest.goto(`${base}/prototype-preview-nest-fixture.html`, { waitUntil: "load" });
  await cert139Nest.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector('[data-testid="view-cabinet"]'),
    null,
    { timeout: 25000 },
  );
  await cert139Nest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const roleEl = doc?.querySelector('[data-testid="scenario-role"]');
    if (roleEl) {
      roleEl.value = "store";
      roleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    doc?.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  const cabFrame = cert139Nest.frameLocator("#cabinet");
  await cabFrame.locator(".shell aside.sidebar").waitFor({ timeout: 25000 });
  await cabFrame.locator('[data-testid="nav-recommendations"]').click();
  const demoList = cabFrame.locator(".collection-demo");
  if (await demoList.count()) await demoList.evaluate((el) => { el.open = true; });
  await cabFrame.locator('[data-coll-action="seed"]').click();
  const cert80Row = cabFrame.locator("[data-coll-open]", { hasText: /сертификат\s*80/i });
  await cert80Row.first().waitFor({ timeout: 15000 });
  await cert80Row.first().click();
  const publicView = cabFrame.locator('[data-testid="certificate-public-view"]');
  await publicView.waitFor({ timeout: 15000 });
  const certCodeBeforeOpen =
    (await cabFrame.locator('[data-testid="certificate-code"]').textContent().catch(() => null))?.trim() || "";
  await publicView.click();
  await cert139Nest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      const marker = frame?.dataset?.embedGuestMarker || "";
      return (
        frame?.dataset?.embedMount === "srcdoc" &&
        frame?.dataset?.embedContentReady === "1" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 139 &&
        /cert139-qr-raster-ok/.test(marker)
      );
    },
    null,
    { timeout: 30000 },
  );
  const cert139Snap = await cert139Nest.evaluate((expectedDetail) => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
    const srcdoc = frame?.getAttribute("srcdoc") || "";
    return {
      title: doc?.querySelector("[data-standalone-title]")?.textContent?.trim() || "",
      url: frame?.dataset?.embedUrl || "",
      srcdoc,
      srcdocLen: srcdoc.length,
      contentReady: frame?.dataset?.embedContentReady || "",
      hasGuestBoot: srcdoc.includes("__protoCabinetEmbedSessionToken"),
      hasCertRoot: srcdoc.includes("certificate-root"),
      certErrorShell: /<main class="cert-error"/.test(srcdoc),
      sessionToken: frame?.dataset?.embedSessionToken || "",
      expectedDetail,
    };
  }, certCodeBeforeOpen);
  assert.equal(certPageErrors.length, 0, `opaque 139 must not throw: ${certPageErrors.join(" | ")}`);
  assert.equal(cert139Snap.contentReady, "1", "139 embed signals content-ready");
  assert.ok(cert139Snap.srcdocLen > 800, "139 srcdoc must contain injected guest page");
  assert.ok(cert139Snap.hasCertRoot, "139 srcdoc mounts certificate-root");
  assert.ok(cert139Snap.hasGuestBoot, "139 srcdoc carries embed session boot");
  assert.equal(cert139Snap.certErrorShell, false, "139 srcdoc must not ship pre-rendered error shell");
  assert.ok(cert139Snap.url.includes("certificate.html"), cert139Snap.url);
  assert.ok(cert139Snap.sessionToken.length > 4, "139 embed session token set");
  if (certCodeBeforeOpen) {
    assert.ok(
      cert139Snap.srcdoc.includes(certCodeBeforeOpen) || cert139Snap.url.includes("cert_ref"),
      "139 embed should reference opened certificate identity",
    );
  }
  assert.match(cert139Snap.title, /сертификат/i);
  const cert139GuestMarker =
    (await cabFrame.locator("[data-testid='cabinet-standalone-frame']").getAttribute("data-embed-guest-marker")) || "";
  assert.match(cert139GuestMarker, /cert139-qr-raster-ok/, cert139GuestMarker);

  const cert139GuestFrame = cabFrame.frameLocator('[data-testid="cabinet-standalone-frame"]');
  await cert139GuestFrame.locator(".cert-guest").waitFor({ timeout: 15000 });
  const qrProbe = await cert139GuestFrame.locator("[data-cert-qr]").evaluate((img) => ({
    src: img.getAttribute("src") || "",
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    complete: img.complete,
  }));
  assert.match(qrProbe.src, /^data:image\/(?:png|jpeg|jpg);/i, `139 QR must be raster (${cert139GuestMarker})`);
  assert.ok(qrProbe.src.length >= 512, "139 QR payload must be a real encoded image");
  assert.ok(qrProbe.naturalWidth > 40 && qrProbe.naturalHeight > 40, "139 QR must decode to non-zero dimensions");
  assert.equal(qrProbe.complete, true, "139 QR image should finish loading");
  const openedCertCode = (
    (await cert139GuestFrame.locator(".cert-code").first().textContent()) || ""
  ).trim();
  assert.ok(openedCertCode.length > 2, "guest cert should show code from opened record");
  if (certCodeBeforeOpen) {
    assert.ok(
      openedCertCode.includes(certCodeBeforeOpen) || certCodeBeforeOpen.includes(openedCertCode),
      `guest code ${openedCertCode} should match list detail ${certCodeBeforeOpen}`,
    );
  }

  const certQrBtn = cert139GuestFrame.locator('[data-client-action="qr"]');
  await certQrBtn.click();
  await certQrBtn.click();
  const afterQrProbe = await cert139GuestFrame.locator("[data-cert-qr]").evaluate((img) => img.naturalWidth);
  assert.ok(afterQrProbe > 40, "139 QR must stay populated after repeat show");

  await cert139GuestFrame.locator('a[href*="partner=0"]').first().click();
  await cert139GuestFrame.locator(".pc-page").waitFor({ timeout: 10000 });
  await cert139Nest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const host = doc?.querySelector("[data-testid='cabinet-standalone-host']");
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        host && !host.hidden &&
        frame?.dataset?.embedMount === "srcdoc" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 139
      );
    },
    null,
    { timeout: 10000 },
  );
  assert.equal(await cert139GuestFrame.locator(".cert-guest").count(), 0, "partner profile must replace guest cert main");
  const partnerTitle = await cert139GuestFrame.locator("h1").first().textContent();
  assert.match(String(partnerTitle || ""), /материал/i);
  await cert139GuestFrame.locator(".pc-page").getByText(openedCertCode, { exact: false }).first().waitFor({
    timeout: 10000,
  });
  await cert139GuestFrame.getByRole("link", { name: /вернуться к сертификату/i }).first().click();
  await cert139GuestFrame.locator(".cert-guest").waitFor({ timeout: 10000 });
  await cert139Nest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const host = doc?.querySelector("[data-testid='cabinet-standalone-host']");
      return host && !host.hidden;
    },
    null,
    { timeout: 10000 },
  );
  const backQrWidth = await cert139GuestFrame.locator("[data-cert-qr]").evaluate((img) => img.naturalWidth);
  assert.ok(backQrWidth > 40, "guest cert QR remains after profile back");

  await cert139GuestFrame.locator('[data-client-action="register"]').click();
  const clientPanel = cert139GuestFrame.locator("[data-client-area]");
  await clientPanel.getByText(/Сертификат будет в вашем кабинете/i).waitFor({ timeout: 10000 });
  assert.ok(
    (await cert139GuestFrame.locator('[data-client-action="complete"]').count()) > 0,
    "139 embed opens demo login/register panel",
  );

  await cert139Nest.close();

  const r2Nest142 = await browser.newPage();
  await r2Nest142.setViewportSize({ width: 1280, height: 900 });
  const r2NestErrors = [];
  r2Nest142.on("pageerror", (err) => r2NestErrors.push(String(err)));
  const delayAdapterMs = 150;
  await r2Nest142.route("**/observer-cabinet-embed.js*", async (route) => {
    await new Promise((r) => setTimeout(r, delayAdapterMs));
    await route.continue();
  });
  await r2Nest142.route("**/assignment-cabinet-embed.js*", async (route) => {
    await new Promise((r) => setTimeout(r, delayAdapterMs));
    await route.continue();
  });
  await r2Nest142.goto(`${base}/prototype-preview-nest-fixture.html`, { waitUntil: "load" });
  await r2Nest142.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector('[data-testid="view-cabinet"]'),
    null,
    { timeout: 25000 },
  );
  await r2Nest142.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const win = doc?.defaultView;
    win?.rcDemoMemory?.setItem?.("rc_release", "2");
    const roleEl = doc?.querySelector('[data-testid="scenario-role"]');
    if (roleEl) {
      roleEl.value = "store";
      roleEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const rel = doc?.querySelector('[data-testid="prototype-release"]');
    if (rel) {
      rel.value = "2";
      rel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    doc?.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  const r2Cab = r2Nest142.frameLocator("#cabinet");
  await r2Cab.locator(".shell aside.sidebar").waitFor({ timeout: 25000 });
  await r2Cab.locator('[data-action="nav:clients"]').click();
  await r2Cab.locator('[data-ca-action="nav:repair-objects"]').click();
  await r2Cab.locator('[data-testid="ca-r2-object-r2-obj-spb-loft"]').click();
  await r2Cab.locator('[data-testid="ca-r2-open-142"]').click();
  await r2Nest142.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        frame?.dataset?.embedMount === "srcdoc" &&
        frame?.dataset?.embedContentReady === "1" &&
        frame?.dataset?.embedGuestMarker === "r2-obj-spb-loft" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 142
      );
    },
    null,
    { timeout: 30000 },
  );
  const r2LoftSnap = await r2Nest142.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
    return {
      marker: frame?.dataset?.embedGuestMarker || "",
      url: frame?.dataset?.embedUrl || "",
      title: doc?.querySelector("[data-standalone-title]")?.textContent?.trim() || "",
    };
  });
  assert.equal(r2NestErrors.length, 0, `opaque 142 nest: ${r2NestErrors.join(" | ")}`);
  assert.equal(r2LoftSnap.marker, "r2-obj-spb-loft");
  assert.match(r2LoftSnap.title, /наблюдени/i);
  assert.ok(r2LoftSnap.url.includes("observer.html"), r2LoftSnap.url);
  await r2Cab.locator('[data-testid="proto-standalone-back"]').click();
  await r2Cab.locator('[data-testid="ca-r2-object-r2-obj-krd-aurora"]').click();
  await r2Cab.locator('[data-testid="ca-r2-open-141"]').click();
  await r2Nest142.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        frame?.dataset?.embedMount === "srcdoc" &&
        frame?.dataset?.embedContentReady === "1" &&
        frame?.dataset?.embedGuestMarker === "r2-obj-krd-aurora" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 141
      );
    },
    null,
    { timeout: 30000 },
  );
  await r2Nest142.close();

  const previewToc = await browser.newPage();
  await previewToc.setViewportSize({ width: 1280, height: 900 });
  await previewToc.goto(`${base}/prototype-preview-nest-fixture.html`, { waitUntil: "load" });
  await previewToc.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector('[data-testid="view-cabinet"]'),
    null,
    { timeout: 25000 },
  );
  await previewToc.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await previewToc.waitForFunction(
    () => document.querySelector("#cabinet")?.contentDocument?.querySelector(".shell aside.sidebar"),
    null,
    { timeout: 25000 },
  );
  await previewToc.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector(".proto-page-toc-btn")?.click();
    doc?.querySelector('a[data-page-n="143"]')?.click();
  });
  await previewToc.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        frame?.dataset?.embedMount === "srcdoc" &&
        frame?.dataset?.embedContentReady === "1" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 143
      );
    },
    null,
    { timeout: 25000 },
  );
  await previewToc.close();

  const cspFixture = await browser.newPage();
  await cspFixture.goto(`${base}/prototype-preview-csp-src-blocked-fixture.html`, { waitUntil: "load" });
  await cspFixture.waitForTimeout(500);
  const cspBlocked = await cspFixture.evaluate(() => {
    const blocked = document.querySelector("#csp-blocked");
    let title = null;
    try {
      title = blocked?.contentDocument?.querySelector("#partner-title")?.textContent?.trim() || null;
    } catch {
      title = null;
    }
    return { hasTitle: Boolean(title) };
  });
  assert.equal(cspBlocked.hasTitle, false, "standalone iframe.src blocked when frame-ancestors omits preview parent");
  await cspFixture.close();

  const opaqueCtx = await browser.newContext();
  await opaqueCtx.addInitScript(() => {
    if (typeof crypto === "undefined") return;
    try {
      delete crypto.randomUUID;
    } catch {
      try {
        Object.defineProperty(crypto, "randomUUID", {
          value: undefined,
          configurable: true,
          writable: true,
        });
      } catch {
        // ignore
      }
    }
  });
  const opaquePage = await opaqueCtx.newPage();
  await opaquePage.setViewportSize({ width: 1280, height: 900 });
  const opaqueErrors = [];
  opaquePage.on("pageerror", (err) => opaqueErrors.push(String(err)));
  await opaquePage.goto(`${base}/partner/index.html?role=store`, { waitUntil: "load" });
  await opaquePage.waitForFunction(
    () => document.querySelector('[data-testid="view-cabinet"]'),
    null,
    { timeout: 20000 },
  );
  await opaquePage.evaluate(() => {
    document.querySelector('[data-testid="view-cabinet"]')?.click();
  });
  await opaquePage.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  await opaquePage.evaluate(() => {
    const roleEl = document.querySelector('[data-testid="scenario-role"]');
    if (!roleEl) return;
    roleEl.value = "agent";
    roleEl.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await opaquePage.waitForFunction(
    () => document.querySelector('[data-testid="scenario-role"]')?.value === "agent",
    null,
    { timeout: 10000 },
  );
  await opaquePage.waitForSelector(".shell aside.sidebar", { timeout: 20000 });
  assert.equal(
    opaqueErrors.some((line) => /randomUUID/i.test(line)),
    false,
    `scenario-role agent switch must not throw randomUUID: ${opaqueErrors.join(" | ")}`,
  );
  await opaqueCtx.close();

  async function enterNestStoreCabinet(page) {
    await page.goto(`${base}/prototype-preview-nest-fixture.html`, { waitUntil: "load" });
    await page.waitForFunction(
      () => document.querySelector("#cabinet")?.contentDocument?.querySelector('[data-testid="view-cabinet"]'),
      null,
      { timeout: 25000 },
    );
    await page.evaluate(() => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const roleEl = doc?.querySelector('[data-testid="scenario-role"]');
      if (roleEl) {
        roleEl.value = "store";
        roleEl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      doc?.documentElement?.setAttribute("data-theme", "dark");
      doc?.querySelector('[data-testid="view-cabinet"]')?.click();
    });
    await page.waitForFunction(
      () => document.querySelector("#cabinet")?.contentDocument?.querySelector(".shell aside.sidebar"),
      null,
      { timeout: 25000 },
    );
  }

  const mobileDarkDirect = await browser.newPage();
  await mobileDarkDirect.setViewportSize({ width: 654, height: 763 });
  await mobileDarkDirect.emulateMedia({ colorScheme: "dark" });
  await enterNestStoreCabinet(mobileDarkDirect);
  await mobileDarkDirect.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-action="nav:partners"], [data-action="nav:links"]')?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await mobileDarkDirect.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const host = doc?.querySelector("[data-testid='cabinet-standalone-host']");
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        host &&
        !host.hidden &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 143 &&
        frame?.dataset?.embedContentReady === "1" &&
        host.dataset.embedLoadState !== "stalled"
      );
    },
    null,
    { timeout: 35000 },
  );
  await mobileDarkDirect.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="proto-standalone-close"]')?.click();
    doc?.querySelector('[data-action="nav:settlements"], [data-action="nav:wallet"]')?.click();
    doc?.querySelector("[data-testid='wallet-history-hub-link']")?.click();
  });
  await mobileDarkDirect.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return (
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 147 &&
        frame?.dataset?.embedContentReady === "1"
      );
    },
    null,
    { timeout: 35000 },
  );
  await mobileDarkDirect.close();

  const slowReadyNest = await browser.newPage();
  await slowReadyNest.setViewportSize({ width: 375, height: 812 });
  let releaseSlow143 = null;
  const holdSlow143 = new Promise((resolve) => {
    releaseSlow143 = resolve;
  });
  await slowReadyNest.route(/partner-cooperation-detail\.html/i, async (route) => {
    await holdSlow143;
    await route.continue();
  });
  await enterNestStoreCabinet(slowReadyNest);
  await slowReadyNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-action="nav:partners"]')?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await slowReadyNest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const load = doc?.querySelector("[data-testid='proto-embed-load-state']");
      return load && !load.hidden;
    },
    null,
    { timeout: 15000 },
  );
  const badgeBeforeSlow = await slowReadyNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    return doc?.defaultView?.__protoCabinetEmbeddedPage?.n ?? null;
  });
  assert.equal(badgeBeforeSlow, null, "reviewer badge must stay on parent page until content-ready");
  releaseSlow143?.();
  await slowReadyNest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return frame?.dataset?.embedContentReady === "1" && doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 143;
    },
    null,
    { timeout: 35000 },
  );
  await slowReadyNest.unroute(/partner-cooperation-detail\.html/i);
  await slowReadyNest.close();

  const retryFailNest = await browser.newPage();
  await retryFailNest.setViewportSize({ width: 1280, height: 900 });
  let fail143Once = true;
  await retryFailNest.route(/partner-cooperation-detail\.html/i, async (route) => {
    if (fail143Once) {
      fail143Once = false;
      await route.abort("failed");
      return;
    }
    await route.continue();
  });
  await enterNestStoreCabinet(retryFailNest);
  await retryFailNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-action="nav:partners"]')?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await retryFailNest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      return doc?.querySelector("[data-testid='cabinet-standalone-host']")?.dataset?.embedLoadState === "stalled";
    },
    null,
    { timeout: 35000 },
  );
  const cabRetry = retryFailNest.frameLocator("#cabinet");
  await cabRetry.locator("[data-testid='proto-embed-retry']").click();
  await retryFailNest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return frame?.dataset?.embedContentReady === "1" && doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 143;
    },
    null,
    { timeout: 35000 },
  );
  await retryFailNest.unroute(/partner-cooperation-detail\.html/i);
  await retryFailNest.close();

  const hangHtmlSession = await browser.newPage();
  await hangHtmlSession.setViewportSize({ width: 1280, height: 900 });
  let releaseHangHtml = null;
  const holdHangHtml = new Promise((resolve) => {
    releaseHangHtml = resolve;
  });
  await hangHtmlSession.route(/partner-cooperation-detail\.html/i, async (route) => {
    await holdHangHtml;
    await route.continue();
  });
  await enterNestStoreCabinet(hangHtmlSession);
  const sessionDeadlineStart = Date.now();
  await hangHtmlSession.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-action="nav:partners"]')?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await hangHtmlSession.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const host = doc?.querySelector("[data-testid='cabinet-standalone-host']");
      return host?.dataset?.embedLoadState === "stalled" && host?.hidden === false;
    },
    null,
    { timeout: 35000 },
  );
  const sessionDeadlineMs = Date.now() - sessionDeadlineStart;
  assert.ok(
    sessionDeadlineMs >= 20000 && sessionDeadlineMs < 32000,
    `stalled HTML must hit whole-session deadline (${sessionDeadlineMs}ms)`,
  );
  releaseHangHtml?.();
  const cabHangHtml = hangHtmlSession.frameLocator("#cabinet");
  await cabHangHtml.locator("[data-testid='proto-embed-retry']").click();
  await hangHtmlSession.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return frame?.dataset?.embedContentReady === "1" && doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 143;
    },
    null,
    { timeout: 35000 },
  );
  await hangHtmlSession.unroute(/partner-cooperation-detail\.html/i);
  let releaseHang147 = null;
  const holdHang147 = new Promise((resolve) => {
    releaseHang147 = resolve;
  });
  await hangHtmlSession.route(/partner-wallet-history\.html/i, async (route) => {
    await holdHang147;
    await route.continue();
  });
  const hang147Start = Date.now();
  await hangHtmlSession.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="proto-standalone-close"]')?.click();
    doc?.querySelector('[data-action="nav:settlements"], [data-action="nav:wallet"]')?.click();
    doc?.querySelector("[data-testid='wallet-history-hub-link']")?.click();
  });
  await hangHtmlSession.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const host = doc?.querySelector("[data-testid='cabinet-standalone-host']");
      return host?.dataset?.embedLoadState === "stalled";
    },
    null,
    { timeout: 35000 },
  );
  const hang147Ms = Date.now() - hang147Start;
  assert.ok(hang147Ms >= 20000 && hang147Ms < 32000, `147 stalled HTML session (${hang147Ms}ms)`);
  releaseHang147?.();
  await cabHangHtml.locator("[data-testid='proto-embed-retry']").click();
  await hangHtmlSession.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      return doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 147 && doc?.querySelector("[data-testid='cabinet-standalone-frame']")?.dataset?.embedContentReady === "1";
    },
    null,
    { timeout: 35000 },
  );
  await hangHtmlSession.unroute(/partner-wallet-history\.html/i);
  await hangHtmlSession.close();

  const hungFontsNest = await browser.newPage();
  await hungFontsNest.setViewportSize({ width: 654, height: 763 });
  let releaseHungFonts = null;
  const holdHungFonts = new Promise((resolve) => {
    releaseHungFonts = resolve;
  });
  const hangGoogleFonts = async (route) => {
    await holdHungFonts;
    await route.continue();
  };
  await enterNestStoreCabinet(hungFontsNest);
  await hungFontsNest.route(/:\/\/fonts\.googleapis\.com\//, hangGoogleFonts);
  await hungFontsNest.route(/:\/\/fonts\.gstatic\.com\//, hangGoogleFonts);
  await hungFontsNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-action="nav:partners"]')?.click();
    doc?.querySelector("[data-coll-open]")?.click();
  });
  await hungFontsNest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      const host = doc?.querySelector("[data-testid='cabinet-standalone-host']");
      return (
        frame?.dataset?.embedContentReady === "1" &&
        doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 143 &&
        host?.dataset?.embedLoadState !== "stalled"
      );
    },
    null,
    { timeout: 35000 },
  );
  const beforeFontRelease = await hungFontsNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
    return {
      badge: doc?.defaultView?.__protoCabinetEmbeddedPage?.n,
      ready: frame?.dataset?.embedContentReady,
      token: frame?.dataset?.embedSessionToken || "",
    };
  });
  assert.equal(beforeFontRelease.badge, 143);
  assert.equal(beforeFontRelease.ready, "1");
  releaseHungFonts?.();
  await hungFontsNest.waitForTimeout(1200);
  const afterFontRelease = await hungFontsNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
    return {
      badge: doc?.defaultView?.__protoCabinetEmbeddedPage?.n,
      ready: frame?.dataset?.embedContentReady,
      token: frame?.dataset?.embedSessionToken || "",
    };
  });
  assert.equal(afterFontRelease.badge, 143, "releasing font CDN must not reset embed badge");
  assert.equal(afterFontRelease.ready, "1", "embed stays content-ready after font CDN unlock");
  assert.equal(afterFontRelease.token, beforeFontRelease.token, "embed session token stable after font release");
  await hungFontsNest.evaluate(() => {
    const doc = document.querySelector("#cabinet")?.contentDocument;
    doc?.querySelector('[data-testid="proto-standalone-close"]')?.click();
    doc?.querySelector('[data-action="nav:settlements"], [data-action="nav:wallet"]')?.click();
    doc?.querySelector("[data-testid='wallet-history-hub-link']")?.click();
  });
  await hungFontsNest.waitForFunction(
    () => {
      const doc = document.querySelector("#cabinet")?.contentDocument;
      const frame = doc?.querySelector("[data-testid='cabinet-standalone-frame']");
      return frame?.dataset?.embedContentReady === "1" && doc?.defaultView?.__protoCabinetEmbeddedPage?.n === 147;
    },
    null,
    { timeout: 35000 },
  );
  await hungFontsNest.unroute(/:\/\/fonts\.googleapis\.com\//);
  await hungFontsNest.unroute(/:\/\/fonts\.gstatic\.com\//);
  await hungFontsNest.close();

  console.log("prototype-cabinet-integration.browser.mjs: ok");
} finally {
  await browser.close();
  server.close();
}
