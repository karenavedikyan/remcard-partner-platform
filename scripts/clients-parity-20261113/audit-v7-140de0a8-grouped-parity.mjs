#!/usr/bin/env node
/**
 * Independent auditor V7 replay — REMCLIENTS-V7-0729-CASCADE-EXACT-PARITY
 * Pins product fix 140de0a8. Does NOT promote click PASS to full section parity.
 * Auditor pin 65df323e on 0729 must NOT be treated as full visual parity.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = process.env.V7_REPO || path.resolve(__dirname, "../..");
const harnessDir = path.join(repoRoot, "scripts/clients-parity-20261113/observer-list-harness");
const outDir = process.env.V7_OUT || path.join(repoRoot, "audit/clients-parity-20261113/v7-pin-140de0a8");
fs.mkdirSync(outDir, { recursive: true });

const GROUPED_WIDTHS = [375, 360, 320, 768, 1024];
const FLAT_WIDTHS = [375, 360, 320];
const executablePath =
  process.env.WALLET_QA_CHROME || process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

const NAMED_AREA = /\b(status|updated|check|open|edit)\b/i;

async function waitReady(url) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("harness not ready");
}

async function measureGrouped(page, baseUrl, w) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${baseUrl}/?theme=dark`, { waitUntil: "networkidle" });
  await page.getByLabel(/Открыть партнёра:.*Бета/).click();
  await page.getByTestId("ca-observer-partner-page").waitFor({ state: "visible" });
  const row = page.getByTestId("ca-observer-partner-page").getByTestId("ca-observer-client-row").first();
  const openBtn = row.getByRole("button").first();
  const box = await openBtn.boundingBox();
  const geom = await row.evaluate((rowEl) => {
    const status = rowEl.querySelector('[class*="personalStatus"]');
    const updated = rowEl.querySelector('[class*="clientUpdated"]');
    const name = rowEl.querySelector('[class*="personalOpen"]');
    const cs = getComputedStyle(rowEl);
    const s = status?.getBoundingClientRect();
    const u = updated?.getBoundingClientRect();
    const n = name?.getBoundingClientRect();
    const statusCs = status ? getComputedStyle(status) : null;
    const updatedCs = updated ? getComputedStyle(updated) : null;
    return {
      gridTemplateAreas: cs.gridTemplateAreas,
      gridTemplateColumns: cs.gridTemplateColumns,
      statusTop: s?.top ?? null,
      updatedTop: u?.top ?? null,
      topDelta: s && u ? Math.abs(s.top - u.top) : null,
      statusGridRow: statusCs?.gridRow ?? null,
      updatedGridRow: updatedCs?.gridRow ?? null,
      statusGridArea: statusCs?.gridArea ?? null,
      updatedGridArea: updatedCs?.gridArea ?? null,
      nameMinHeight: name ? getComputedStyle(name).minHeight : null,
      nameHeight: n?.height ?? null,
      statusVisible: Boolean(s && s.width > 0 && s.height > 0),
      updatedVisible: Boolean(u && u.width > 0 && u.height > 0),
    };
  });
  let clickPass = false;
  let backPass = false;
  try {
    await openBtn.click({ timeout: 5000 });
    clickPass = await page.getByTestId("ca-observer-client-page").isVisible();
    if (clickPass) {
      for (let i = 0; i < 3; i++) {
        if (await page.getByTestId("ca-observer-partner-page").isVisible().catch(() => false)) break;
        const back = page.getByRole("button", { name: /Назад|Back|←/i }).first();
        if (await back.isVisible().catch(() => false)) await back.click();
        else break;
      }
      backPass = await page.getByTestId("ca-observer-partner-page").isVisible().catch(() => false);
    }
  } catch {
    clickPass = false;
  }
  const areasOk =
    !NAMED_AREA.test(geom.gridTemplateAreas || "") &&
    (geom.gridTemplateAreas === "none" || !geom.gridTemplateAreas);
  const sameRow = geom.topDelta != null && geom.topDelta <= 1;
  const nameOk = (box?.height ?? 0) >= 44 || parseFloat(geom.nameMinHeight || "0") >= 44;
  const namedRowFail =
    /\bstatus\b/i.test(geom.statusGridRow || "") ||
    /\bupdated\b/i.test(geom.updatedGridRow || "") ||
    /\bstatus\b/i.test(geom.statusGridArea || "") ||
    /\bupdated\b/i.test(geom.updatedGridArea || "");
  const pass =
    areasOk &&
    sameRow &&
    nameOk &&
    geom.statusVisible &&
    geom.updatedVisible &&
    !namedRowFail &&
    clickPass &&
    backPass &&
    (box?.width ?? 0) > 0;
  return {
    w,
    ...geom,
    openBox: box,
    clickPass,
    backPass,
    areasOk,
    sameRow,
    nameOk,
    namedRowFail,
    pass,
  };
}

async function measureFlat(page, baseUrl, w) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(`${baseUrl}/?theme=dark`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /Списком/ }).click();
  const row = page.getByTestId("ca-observer-client-row").first();
  const openBtn = row.getByRole("button").first();
  const box = await openBtn.boundingBox();
  const geom = await row.evaluate((rowEl) => {
    const cs = getComputedStyle(rowEl);
    const cols = cs.gridTemplateColumns.trim().split(/\s+/).filter(Boolean);
    return {
      gridTemplateAreas: cs.gridTemplateAreas,
      gridTemplateColumns: cs.gridTemplateColumns,
      colCount: cols.length,
      hasZeroTrack: cols.some((c) => c === "0px"),
      areasNamed: cs.gridTemplateAreas !== "none" && Boolean(cs.gridTemplateAreas?.trim()),
    };
  });
  let clickPass = false;
  let backPass = false;
  try {
    await openBtn.click({ timeout: 5000 });
    clickPass = await page.getByTestId("ca-observer-client-page").isVisible();
    if (clickPass) {
      for (let i = 0; i < 4; i++) {
        if (await page.getByTestId("ca-observer-client-row").first().isVisible().catch(() => false)) break;
        const back = page.getByRole("button", { name: /Назад|Back|←/i }).first();
        if (await back.isVisible().catch(() => false)) await back.click();
        else break;
      }
      backPass =
        (await page.getByTestId("ca-observer-client-row").first().isVisible().catch(() => false)) ||
        (await page.getByRole("button", { name: /Списком/ }).isVisible().catch(() => false));
    }
  } catch {
    clickPass = false;
  }
  const pass =
    !geom.areasNamed &&
    !geom.hasZeroTrack &&
    (box?.width ?? 0) > 0 &&
    (box?.height ?? 0) >= 44 &&
    clickPass &&
    backPass;
  return { w, ...geom, openBox: box, clickPass, backPass, pass };
}

const server = await createServer({
  configFile: path.join(harnessDir, "vite.config.ts"),
  root: harnessDir,
  server: { port: 5388, host: "127.0.0.1", strictPort: false },
});
await server.listen();
const baseUrl = server.resolvedUrls?.local[0] ?? "http://127.0.0.1:5388";
await waitReady(baseUrl);

const browser = await chromium.launch({ executablePath });
const page = await browser.newPage();

const grouped = [];
for (const w of GROUPED_WIDTHS) {
  grouped.push(await measureGrouped(page, baseUrl, w));
}
const flat = [];
for (const w of FLAT_WIDTHS) {
  flat.push(await measureFlat(page, baseUrl, w));
}

await browser.close();
await server.close();

const report = {
  task: "REMCLIENTS-V7-0729-CASCADE-EXACT-PARITY",
  productFixSha: "140de0a83044f324bf455ac2dfb87b17432fb8d1",
  tipAtMeasure: process.env.V7_TIP || null,
  prototypeSha: "3dc31836cd18d9209c20097f18b906dd276f7af6",
  obsoletePin0729: "0729c12f1e321b1aa458d95016eb4cc3f4428f6f",
  auditorPinThatMustNotPromote0729: "65df323e",
  grouped,
  flat,
  groupedAllPass: grouped.every((r) => r.pass),
  flatAllPass: flat.every((r) => r.pass),
  pass: grouped.every((r) => r.pass) && flat.every((r) => r.pass),
  sectionAccepted: false,
  publication: false,
  note: "Click PASS ≠ full visual/section parity. Isolated V7 cascade fix only.",
};
fs.writeFileSync(path.join(outDir, "v7-grouped-parity-report.json"), JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      pass: report.pass,
      groupedAllPass: report.groupedAllPass,
      flatAllPass: report.flatAllPass,
      sample: grouped.map((g) => ({
        w: g.w,
        delta: g.topDelta,
        areas: g.gridTemplateAreas,
        pass: g.pass,
        click: g.clickPass,
      })),
      flatSample: flat.map((f) => ({
        w: f.w,
        pass: f.pass,
        areas: f.gridTemplateAreas,
        zero: f.hasZeroTrack,
      })),
    },
    null,
    2,
  ),
);
process.exit(report.pass ? 0 : 1);
