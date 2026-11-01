#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const protoAdmin = "/tmp/proto-r1/admin";
const outDir = path.resolve(__dirname, "../artifacts/admin-r1-a14a-moderation/evidence/frozen-r1-reference");

async function main() {
  if (!fs.existsSync(path.join(protoAdmin, "index.html"))) {
    throw new Error(`Missing frozen proto at ${protoAdmin}`);
  }

  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto(`file://${path.join(protoAdmin, "index.html")}`, { waitUntil: "domcontentloaded" });
  await page.selectOption('select[data-change="release"], select[aria-label="Релиз"], select', "1").catch(async () => {
    await page.evaluate(() => {
      const sel = document.querySelector("select");
      if (sel instanceof HTMLSelectElement) {
        sel.value = "1";
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, "frozen-r1-release1-shell-320x600-light.png"), fullPage: true });

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Согласовать"));
    btn?.click();
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "frozen-r1-partner-confirm-dialog-320x600-light.png"), fullPage: true });

  const dialogCss = fs.readFileSync(path.join(protoAdmin, "style.css"), "utf8");
  const footerSnippet = dialogCss.match(/\.dialog-footer\{[^}]+\}/)?.[0] ?? "";
  fs.writeFileSync(
    path.join(outDir, "frozen-r1-dialog-footer-snippet.txt"),
    `release=1 selected via UI\n${footerSnippet}\n`,
  );
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
