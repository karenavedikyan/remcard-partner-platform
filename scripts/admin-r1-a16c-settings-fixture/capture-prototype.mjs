#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { readFileSync, statSync } from "node:fs";
import { chromium } from "playwright";

const protoRoot = process.env.A16C_PROTO_ROOT || "/workspace/artifacts/admin-r1-parallel/proto/extracted/admin";
const OUT_DIR =
  process.env.A16C_PROTO_OUT || path.join(process.cwd(), "artifacts/admin-r1-a16c-settings/reference");

const MATRIX = [
  { tag: "1440-light", w: 1440, h: 900, theme: "light" },
  { tag: "1440-dark", w: 1440, h: 900, theme: "dark" },
  { tag: "375-light", w: 375, h: 812, theme: "light" },
  { tag: "375-dark", w: 375, h: 812, theme: "dark" },
  { tag: "320-light", w: 320, h: 812, theme: "light" },
  { tag: "320-dark", w: 320, h: 812, theme: "dark" },
  { tag: "320x600-dark", w: 320, h: 600, theme: "dark" },
];

function startProtoServer(root) {
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = req.url?.split("?")[0] || "/";
      if (p === "/") p = "/index.html";
      const file = path.join(root, p.replace(/^\//, ""));
      try {
        statSync(file);
        res.setHeader("Content-Type", mime[path.extname(file)] || "application/octet-stream");
        res.end(readFileSync(file));
      } catch {
        res.statusCode = 404;
        res.end("404");
      }
    });
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${port}/index.html` });
    });
  });
}

async function openSettingsDialog(page, protoUrl) {
  await page.goto(protoUrl, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const sel = document.querySelector('select[data-change="release"]');
    if (sel instanceof HTMLSelectElement) {
      sel.value = "1";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    location.hash = "notifications";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await page.waitForSelector('[data-action="notification-settings"]', { timeout: 30_000 });
  await page.locator('[data-action="notification-settings"]').click();
  await page.waitForSelector("dialog[open]", { timeout: 15_000 });
}

async function measureSettings(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const dialog = document.querySelector("dialog[open]");
    const offenders = [];
    if (dialog) {
      for (const el of dialog.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width < 1) continue;
        if (r.right > vw + 1) {
          offenders.push({
            tag: el.tagName,
            className: typeof el.className === "string" ? el.className.slice(0, 80) : "",
            overflowPx: Math.round(r.right - vw),
          });
        }
      }
    }
    const head = dialog?.querySelector(".dialog-head h2, .dialog-head h2");
    const saveBtn = dialog?.querySelector('button[type="submit"], .dialog-footer button, form button.button.primary');
    const footer = dialog?.querySelector(".dialog-footer");
    const style = (el) => (el ? getComputedStyle(el) : null);
    return {
      doc: {
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        innerHeight: window.innerHeight,
      },
      dialogPresent: Boolean(dialog),
      dialogTitle: head?.textContent?.trim() ?? null,
      dialogWidth: style(dialog)?.width ?? null,
      footerVisible: footer
        ? footer.getBoundingClientRect().bottom <= window.innerHeight + 1
        : saveBtn
          ? saveBtn.getBoundingClientRect().bottom <= window.innerHeight + 1
          : null,
      offenders: offenders.slice(0, 8),
    };
  });
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const proto = await startProtoServer(protoRoot);
  const browser = await chromium.launch({ headless: true });
  const metrics = [];

  for (const vp of MATRIX) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
    }, vp.theme);
    await openSettingsDialog(page, proto.url);
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
    }, vp.theme);
    const row = await measureSettings(page);
    metrics.push({ viewport: vp.tag, ...row });
    await page.screenshot({ path: path.join(OUT_DIR, `frozen-r1-settings-${vp.tag}.png`), fullPage: false });
    await page.close();
  }

  await browser.close();
  proto.server.close();
  await writeFile(path.join(OUT_DIR, "reference-metrics.json"), JSON.stringify({ release: "1", metrics }, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
