#!/usr/bin/env node
/**
 * A14a: paired metrics + screenshots for moderation preview footer (harness = compiled components).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outDir = process.argv[2] || path.join(repoRoot, "artifacts/admin-r1-a14a-moderation/evidence/preview-footer");
const baseUrl = "http://127.0.0.1:5198";

const SCENES = [
  { id: "org-preview-list", hash: "#/moderation/org-preview" },
  { id: "partner-preview-list", hash: "#/moderation/partner-preview" },
];

const VIEWPORTS = [
  { w: 320, h: 600, tag: "320x600" },
  { w: 375, h: 812, tag: "375x812" },
  { w: 1440, h: 900, tag: "1440x900" },
];

async function startHarness() {
  const server = await createServer({
    configFile: path.join(repoRoot, "scripts/admin-mobile-visual-harness/vite.config.ts"),
  });
  await server.listen(5198, "127.0.0.1");
  return server;
}

async function waitForServer(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(`Harness did not start: ${url}`);
}

async function measureFooter(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector(
      "dialog[data-org-moderation-preview], dialog[data-partner-moderation-preview]",
    );
    const footer = dialog?.children[2] ?? null;
    const btn = footer?.querySelector("button");
    if (!dialog || !footer || !btn) {
      return { ok: false, reason: "missing dialog/footer/button" };
    }
    const fb = footer.getBoundingClientRect();
    const bb = btn.getBoundingClientRect();
    const fcs = getComputedStyle(footer);
    const bcs = getComputedStyle(btn);
    const body = dialog.children[1] ?? null;
    const bodyRect = body?.getBoundingClientRect();
    return {
      ok: true,
      dialogHeight: dialog.getBoundingClientRect().height,
      footerTop: fb.top,
      footerBottom: fb.bottom,
      footerVisibleInViewport: fb.bottom <= window.innerHeight + 0.5 && fb.top >= 0,
      buttonWidthPx: Math.round(bb.width),
      footerWidthPx: Math.round(fb.width),
      buttonWidthPctOfFooter: fb.width ? Math.round((bb.width / fb.width) * 1000) / 10 : null,
      footerBackground: fcs.backgroundColor,
      footerFlexDirection: fcs.flexDirection,
      buttonWidthStyle: bcs.width,
      bodyScrollHeight: body?.scrollHeight ?? null,
      viewport: { w: window.innerWidth, h: window.innerHeight },
    };
  });
}

async function capture(page, scene, vp, theme, phase) {
  await page.setViewportSize({ width: vp.w, height: vp.h });
  await page.addInitScript((t) => {
    document.documentElement.dataset.theme = t;
    localStorage.setItem("remcard-theme", t);
  }, theme);
  await page.goto(`${baseUrl}${scene.hash}`, { waitUntil: "networkidle" });
  await page.locator('[data-org-moderation-preview="true"], [data-partner-moderation-preview="true"]').waitFor({
    timeout: 20_000,
  });
  await page.evaluate(() => {
    const d = document.querySelector("dialog[data-org-moderation-preview], dialog[data-partner-moderation-preview]");
    if (d instanceof HTMLDialogElement && !d.open) d.showModal();
  });
  const metrics = await measureFooter(page);
  const file = `${phase}-${scene.id}-${vp.tag}-${theme}.png`;
  await page.screenshot({ path: path.join(outDir, file) });
  return { scene: scene.id, viewport: vp.tag, theme, phase, file, metrics };
}

async function main() {
  const phase = process.env.A14A_PHASE || "compiled";
  fs.mkdirSync(outDir, { recursive: true });
  const server = await startHarness();
  try {
    await waitForServer(baseUrl);
    const browser = await chromium.launch();
    const rows = [];
    for (const scene of SCENES) {
      for (const vp of VIEWPORTS) {
        for (const theme of ["light", "dark"]) {
          if (vp.tag === "1440x900" && theme === "dark" && scene.id.startsWith("partner")) continue;
          const page = await browser.newPage();
          rows.push(await capture(page, scene, vp, theme, phase));
          await page.close();
        }
      }
    }
    await browser.close();
    const jsonPath = path.join(outDir, `${phase}-footer-metrics.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ capturedAt: new Date().toISOString(), rows }, null, 2));
    console.log(`Wrote ${rows.length} captures → ${outDir}`);
  } finally {
    await server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
