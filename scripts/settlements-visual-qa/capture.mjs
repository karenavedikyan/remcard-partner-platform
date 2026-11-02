#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const OUT = path.resolve(process.cwd(), "artifacts/partner-wallet-20261103/wallet-settlements/screenshots");
const BASE = process.env.SETTLEMENTS_QA_URL ?? "http://127.0.0.1:5211";

const scenes = [
  { id: "hub-overview", scene: "hub-overview" },
  { id: "specialist-overview", scene: "specialist-overview" },
  { id: "agent-overview", scene: "agent-overview" },
];

const viewports = [
  { tag: "1280-light", width: 1280, height: 900, theme: "light" },
  { tag: "1280-dark", width: 1280, height: 900, theme: "dark" },
  { tag: "375-light", width: 375, height: 812, theme: "light" },
  { tag: "375-dark", width: 375, height: 812, theme: "dark" },
];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_BIN,
  });
  const page = await browser.newPage();
  const manifest = [];

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const { id, scene } of scenes) {
      const url = `${BASE}/?scene=${scene}&theme=${vp.theme}`;
      await page.goto(url, { waitUntil: "networkidle" });
      const file = `${id}-${vp.tag}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: true });
      manifest.push(file);
    }
  }

  await browser.close();
  await writeFile(path.join(OUT, "manifest.txt"), manifest.join("\n"));
  console.log(`Saved ${manifest.length} screenshots to ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
