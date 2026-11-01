#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { readFileSync, statSync } from "node:fs";
import { chromium } from "playwright";

const protoRoot = process.env.A16A_PROTO_ROOT || "/workspace/artifacts/admin-r1-parallel/proto/extracted/admin";
const OUT_DIR = process.env.A16A_PROTO_OUT || "/tmp/partner-fe/artifacts/admin-r1-a16a-notifications/reference";

const MATRIX = [
  { tag: "1440-light", w: 1440, h: 900, theme: "light" },
  { tag: "1440-dark", w: 1440, h: 900, theme: "dark" },
  { tag: "375-light", w: 375, h: 812, theme: "light" },
  { tag: "375-dark", w: 375, h: 812, theme: "dark" },
  { tag: "320-light", w: 320, h: 812, theme: "light" },
  { tag: "320-dark", w: 320, h: 812, theme: "dark" },
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

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("remcard-theme", t);
    document.documentElement.dataset.theme = t;
    document.documentElement.setAttribute("data-theme", t);
    if (t === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, theme);
}

async function openNotificationsR1(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const sel = document.querySelector('select[data-change="release"]');
    if (sel instanceof HTMLSelectElement) {
      sel.value = "1";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    location.hash = "notifications";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await page.waitForSelector(".notification-item.unread", { timeout: 30_000 });
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const proto = await startProtoServer(protoRoot);
  const browser = await chromium.launch({ headless: true });
  const metrics = [];

  for (const vp of MATRIX) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
    await openNotificationsR1(page, proto.url);
    await setTheme(page, vp.theme);
    const row = await page.evaluate(() => {
      const unread = document.querySelector(".notification-item.unread");
      const read = document.querySelector(".notification-item:not(.unread)");
      const pick = (el) =>
        el
          ? { bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor }
          : null;
      const releaseSel = document.querySelector('select[data-change="release"]');
      return {
        unread: pick(unread),
        read: pick(read),
        release: releaseSel instanceof HTMLSelectElement ? releaseSel.value : null,
      };
    });
    metrics.push({ viewport: vp.tag, ...row });
    await page.screenshot({ path: path.join(OUT_DIR, `frozen-r1-${vp.tag}.png`), fullPage: true });
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
