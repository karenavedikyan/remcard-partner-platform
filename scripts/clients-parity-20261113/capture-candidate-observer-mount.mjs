#!/usr/bin/env node
/**
 * Synthetic mount of candidate ObserverPartnerCard markup + observer.module.css
 * from impl tip (no product edits). Same fixtures/viewports/themes as prototype baseline.
 * Produces screenshots + numeric computed-style delta vs prototype-baseline.
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CAND = process.env.IMPL_CANDIDATE_SHA || "ffd4aa6130e92af5d95da21cfe5519133228a962";
const PROTO_BASE = path.join(ROOT, "audit/clients-parity-20261113/prototype-baseline");
const OUT = path.join(ROOT, "audit/clients-parity-20261113/candidate-mount");

const VIEWPORTS = [
  { name: "1440x1000", width: 1440, height: 1000 },
  { name: "1024x900", width: 1024, height: 900 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "375x812", width: 375, height: 812 },
  { name: "360x800", width: 360, height: 800 },
  { name: "320x740", width: 320, height: 740 },
];

function gitShow(sha, file) {
  return execFileSync("git", ["show", `${sha}:${file}`], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

/** Convert CSS modules file to flat class selectors used in synthetic HTML. */
function moduleToGlobal(css) {
  // Keep @media and nested rules; rewrite `.foo` top-level to `.cand-foo`? Better: use :global by
  // replacing class names with hashed-looking stable names that match data attributes via a map.
  // Simpler: strip module and inject as literal class names matching TSX styles.xxx → same tokens.
  return css
    .replace(/\[data-theme="dark"\]/g, 'html[data-theme="dark"]')
    .replace(/\.([A-Za-z_][\w-]*)/g, (_, name) => `.${name}`);
}

function fixtureHtml(moduleCss, theme) {
  const css = moduleToGlobal(moduleCss);
  return `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap');
:root {
  --ink:#1d1d1f; --muted:#5a6068; --line:#d7d2cc; --surface:#fff; --offset:#f6f5f3;
  --soft:#fbfaf8; --brand:#b52a2e; --accent:#b52a2e; --tint:#f8ecec; --good:#116f34;
  --bg:#f8fafc; font-family: Manrope, system-ui, sans-serif;
}
[data-theme=dark] {
  --ink:#f3f4f6; --muted:#b8c0ca; --line:#3a3f46; --surface:#1c1f24; --offset:#15181c;
  --soft:#12151a; --tint:#2a1c1d; --bg:#12151a; color-scheme: dark;
}
body { margin:0; background:var(--offset); color:var(--ink); }
.content { max-width:1120px; margin:0 auto; padding:20px; }
${css}
</style>
</head>
<body>
<main class="content section" data-testid="candidate-observer-fixture">
  <h1 class="heading">Мои клиенты у партнёров</h1>
  <p class="intro">Синтетический mount ObserverPartnerCard (${CAND.slice(0, 12)}).</p>
  <div class="personalTools" data-testid="ca-observer-personal-tools">
    <div class="personalTop">
      <div class="personalBuckets" role="group" aria-label="Ваш список">
        <button type="button" class="bucketBtn" aria-pressed="true">Активные <span>3</span></button>
        <button type="button" class="bucketBtn" aria-pressed="false">Архив <span>0</span></button>
        <button type="button" class="bucketBtn" aria-pressed="false">Корзина <span>0</span></button>
      </div>
      <div class="personalLayout" role="group" aria-label="Вид списка">
        <button type="button" class="bucketBtn" aria-pressed="true">По партнёрам</button>
        <button type="button" class="bucketBtn" aria-pressed="false">Списком</button>
      </div>
    </div>
  </div>
  <div class="partnerGrid partnerGridGrouped" data-testid="ca-observer-partners-list">
    <article class="partnerCard" data-testid="ca-observer-partner-card" data-observer-bucket="active">
      <div class="compactTop">
        <div class="partnerGroupHead">
          <label class="personalCheck"><input type="checkbox" data-observer-group="p-alpha" aria-label="Выбрать клиентов: Дом материалов"/></label>
          <button type="button" class="partnerOpenBtn" aria-label="Открыть партнёра: Дом материалов">
            <div class="partnerCardHead">
              <strong>Дом материалов <span class="partnerArrow" aria-hidden="true">→</span></strong>
              <span class="partnerCategory">Напольные покрытия · Москва</span>
            </div>
          </button>
        </div>
        <dl class="stats" aria-label="Показатели видимых клиентов">
          <div><dt>Направлено</dt><dd>3</dd></div>
          <div><dt>В работе</dt><dd>1</dd></div>
          <div><dt>С оплатой</dt><dd>1</dd></div>
          <div><dt>Отказы</dt><dd>1</dd></div>
        </dl>
      </div>
      <details class="disclosure" data-observer-partner-details="p-alpha">
        <summary>
          <span class="meta">
            <span>Конверсия в оплату <strong>33%</strong></span>
            <span>Возвраты <strong>0</strong></span>
            <span>Обновлено <time datetime="2026-11-10T12:00:00Z">10 нояб. 2026 г., 15:00</time></span>
          </span>
          <span class="toggleLabel">Клиенты <b>3</b> Показать</span>
        </summary>
        <div class="expandedClients">
          <div class="personalRow" data-testid="ca-observer-client-row">
            <strong>Анна</strong>
            <span class="intro">Двери · RC-QA-001</span>
          </div>
        </div>
      </details>
    </article>
    <article class="partnerCard" data-testid="ca-observer-partner-card">
      <div class="compactTop">
        <div class="partnerGroupHead">
          <label class="personalCheck"><input type="checkbox"/></label>
          <button type="button" class="partnerOpenBtn">
            <div class="partnerCardHead">
              <strong>Мастер Бета <span class="partnerArrow">→</span></strong>
              <span class="partnerCategory">Установка · Санкт-Петербург</span>
            </div>
          </button>
        </div>
        <dl class="stats" aria-label="Показатели видимых клиентов">
          <div><dt>Направлено</dt><dd>2</dd></div>
          <div><dt>В работе</dt><dd>2</dd></div>
          <div><dt>С оплатой</dt><dd>0</dd></div>
          <div><dt>Отказы</dt><dd>0</dd></div>
        </dl>
      </div>
      <details class="disclosure">
        <summary>
          <span class="meta"><span>Конверсия в оплату <strong>0%</strong></span></span>
          <span class="toggleLabel">Клиенты <b>2</b> Показать</span>
        </summary>
      </details>
    </article>
  </div>
</main>
</body>
</html>`;
}

function parseGridCols(value) {
  if (!value) return 0;
  // e.g. "107px 107px 107px 107px" or "repeat(4, …)" already resolved by browser
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function diffPng(aPath, bPath, outPath) {
  if (!existsSync(aPath) || !existsSync(bPath)) {
    return { ok: false, reason: "missing_png", aPath, bPath };
  }
  const imgA = PNG.sync.read(readFileSync(aPath));
  const imgB = PNG.sync.read(readFileSync(bPath));
  const width = Math.min(imgA.width, imgB.width);
  const height = Math.min(imgA.height, imgB.height);
  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    // Crop to common region for numeric delta
  }
  const diff = new PNG({ width, height });
  const mismatched = pixelmatch(
    crop(imgA, width, height).data,
    crop(imgB, width, height).data,
    diff.data,
    width,
    height,
    { threshold: 0.1 },
  );
  writeFileSync(outPath, PNG.sync.write(diff));
  const total = width * height;
  return {
    ok: true,
    width,
    height,
    mismatched,
    ratio: mismatched / total,
    aSize: { w: imgA.width, h: imgA.height },
    bSize: { w: imgB.width, h: imgB.height },
  };
}

function crop(img, w, h) {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = (img.width * y + x) << 2;
      const di = (w * y + x) << 2;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync(path.join(OUT, "diff"), { recursive: true });
  const moduleCss = gitShow(
    CAND,
    "src/components/clients/observer/observer.module.css",
  );
  writeFileSync(path.join(OUT, "observer.module.css"), moduleCss);

  const protoReport = JSON.parse(
    readFileSync(path.join(PROTO_BASE, "computed-style-baseline.json"), "utf8"),
  );
  const protoByKey = new Map(
    protoReport.measurements.map((m) => [`${m.theme}|${m.viewport.name}`, m]),
  );

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.WALLET_QA_CHROME || process.env.CHROME_BIN || undefined,
  });

  const measurements = [];
  const visualDiffs = [];
  const errors = [];

  try {
    for (const theme of ["light", "dark"]) {
      const htmlPath = path.join(OUT, `fixture-${theme}.html`);
      writeFileSync(htmlPath, fixtureHtml(moduleCss, theme));
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1,
        });
        await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle" });
        await page.evaluate(async () => {
          if (document.fonts?.ready) await document.fonts.ready;
        });
        const card = page.locator('[data-testid="ca-observer-partner-card"]').first();
        const box = await card.boundingBox();
        const styles = await card.evaluate((el) => {
          const cs = getComputedStyle(el);
          const strong = el.querySelector(".partnerCardHead strong");
          const scs = strong ? getComputedStyle(strong) : null;
          const stats = el.querySelector(".stats");
          const statsCs = stats ? getComputedStyle(stats) : null;
          return {
            card: {
              width: cs.width,
              height: cs.height,
              padding: cs.padding,
              borderRadius: cs.borderRadius,
              fontFamily: cs.fontFamily,
            },
            title: scs
              ? {
                  fontSize: scs.fontSize,
                  fontWeight: scs.fontWeight,
                  lineHeight: scs.lineHeight,
                }
              : null,
            statsGrid: statsCs ? statsCs.gridTemplateColumns : null,
            statsColCount: statsCs
              ? getComputedStyle(stats).gridTemplateColumns.split(/\s+/).length
              : 0,
          };
        });
        // Fix col count: browser returns pixel tracks
        styles.statsColCount = parseGridCols(styles.statsGrid);

        const shotName = `observer-compact-${theme}-${vp.name}.png`;
        await page.screenshot({ path: path.join(OUT, shotName), fullPage: true });

        const proto = protoByKey.get(`${theme}|${vp.name}`);
        const heightDelta = proto?.cardBoundingBox
          ? Math.round((box?.height || 0) - (proto.cardBoundingBox.height || 0))
          : null;
        const protoCols = parseGridCols(proto?.computed?.statsGrid);
        const colMismatch = protoCols > 0 && styles.statsColCount !== protoCols;

        const protoShot = path.join(PROTO_BASE, shotName);
        const diffShot = path.join(OUT, "diff", shotName);
        let pixel = null;
        try {
          pixel = diffPng(protoShot, path.join(OUT, shotName), diffShot);
        } catch (e) {
          pixel = { ok: false, reason: String(e) };
        }

        const row = {
          theme,
          viewport: vp,
          cardBoundingBox: box,
          computed: styles,
          screenshot: shotName,
          vsPrototype: {
            heightDeltaPx: heightDelta,
            protoStatsCols: protoCols,
            candStatsCols: styles.statsColCount,
            statsColMismatch: colMismatch,
            titleFontSizeProto: proto?.computed?.title?.fontSize ?? null,
            titleFontSizeCand: styles.title?.fontSize ?? null,
            pixelDiff: pixel,
          },
        };
        measurements.push(row);
        visualDiffs.push({
          key: `${theme}|${vp.name}`,
          statsColMismatch: colMismatch,
          heightDeltaPx: heightDelta,
          pixelRatio: pixel?.ratio ?? null,
          visualPass:
            !colMismatch &&
            heightDelta !== null &&
            Math.abs(heightDelta) <= 4 &&
            pixel?.ok === true &&
            (pixel.ratio ?? 1) < 0.02,
        });
        await page.close();
      }
    }
  } catch (e) {
    errors.push(String(e));
  } finally {
    await browser.close();
  }

  const anyVisualPass = visualDiffs.some((v) => v.visualPass);
  const allVisualPass = visualDiffs.length > 0 && visualDiffs.every((v) => v.visualPass);

  const report = {
    implCandidateSha: CAND,
    mountMethod:
      "Synthetic HTML + git-show observer.module.css (CSS modules class tokens as global). Not Next.js RSC mount.",
    note:
      "No data/wrap masking. Same Manrope font import as prototype baseline. Overlay diffs in candidate-mount/diff/.",
    measurements,
    visualDiffs,
    summary: {
      shots: measurements.length,
      visualPassCount: visualDiffs.filter((v) => v.visualPass).length,
      visualFailCount: visualDiffs.filter((v) => !v.visualPass).length,
      anyVisualPass,
      allVisualPass,
      functionalVisualVerdict: allVisualPass ? "PASS" : "FAIL",
    },
    errors,
    ok: errors.length === 0 && measurements.length === VIEWPORTS.length * 2,
  };
  writeFileSync(path.join(OUT, "computed-style-candidate.json"), JSON.stringify(report, null, 2));
  writeFileSync(
    path.join(OUT, "visual-diff-summary.json"),
    JSON.stringify({ implCandidateSha: CAND, ...report.summary, visualDiffs }, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        shots: measurements.length,
        visualPass: report.summary.visualPassCount,
        visualFail: report.summary.visualFailCount,
        verdict: report.summary.functionalVisualVerdict,
        errors,
      },
      null,
      2,
    ),
  );
  if (!report.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
