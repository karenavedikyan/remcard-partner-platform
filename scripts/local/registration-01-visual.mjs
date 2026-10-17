#!/usr/bin/env node
/**
 * REGISTRATION-01 visual pairs: verify step/theme/viewport before capture.
 */
import { execSync } from "node:child_process";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "artifacts/remcard-registration-01/screenshots");
const BASE = process.env.REGISTRATION_VISUAL_BASE ?? "http://127.0.0.1:3000";
const NAV_REPO = process.env.REGISTRATION_REF_REPO ?? "/agent/repos/remcard-navigator";
const REF_SHA =
  process.env.REGISTRATION_REF_SHA ?? "origin/implementation/remcard-reference-20261014";
const CODE_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();

const REG_KEYS = [
  "remcard.registration.draft.v1:agent",
  "remcard.registration.owner.v1",
  "remcard.registration.wizard.v1",
];

async function pngSize(filePath) {
  const buf = await readFile(filePath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function assertCtaContrast(page, selector) {
  const colors = await page.$eval(selector, (el) => {
    const s = getComputedStyle(el);
    return { color: s.color, background: s.backgroundColor };
  });
  const parse = (c) => c.match(/\d+/g)?.map(Number) ?? [0, 0, 0];
  const [fr, fg, fb] = parse(colors.color);
  const [br, bg, bb] = parse(colors.background);
  const lum = (r, g, b) => {
    const a = [r, g, b].map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };
  const l1 = lum(fr, fg, fb);
  const l2 = lum(br, bg, bb);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  if (ratio < 3) {
    throw new Error(`CTA contrast too low (${ratio.toFixed(2)}): ${JSON.stringify(colors)}`);
  }
}

async function applyTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

async function clearRegistrationDraft(page) {
  try {
    await page.evaluate((keys) => {
      for (const k of keys) sessionStorage.removeItem(k);
    }, REG_KEYS);
  } catch {
    /* fresh browser context already has empty storage */
  }
}

async function verifyViewport(page, expectedWidth) {
  const inner = await page.evaluate(() => window.innerWidth);
  if (inner !== expectedWidth) {
    throw new Error(`Viewport mismatch: expected ${expectedWidth}, got ${inner}`);
  }
}

async function verifyTypesStep(page) {
  const h1 = await page.locator("h1").first().innerText();
  if (!/Выберите тип партнёра/i.test(h1)) {
    throw new Error(`VERIFY types step failed: h1="${h1}"`);
  }
  if ((await page.locator("#login-title").count()) > 0) {
    throw new Error("VERIFY types step failed: auth login title visible");
  }
  const progress = await page.locator('[aria-label="Этапы регистрации"]').innerText();
  if (!progress.includes("Тип партнёра")) {
    throw new Error(`VERIFY progress labels: ${progress}`);
  }
}

async function verifyAuthStep(page) {
  const embedded = page.locator("#embedded-auth-title");
  if ((await embedded.count()) === 0) {
    throw new Error("VERIFY auth step failed: #embedded-auth-title missing");
  }
  const title = await embedded.innerText();
  if (!/Подтвердите вход/i.test(title)) {
    throw new Error(`VERIFY auth step failed: title="${title}"`);
  }
  if ((await page.getByRole("heading", { name: /Выберите тип партнёра/i }).count()) > 0) {
    throw new Error("VERIFY auth step failed: still on type picker");
  }
}

async function verifyDataStep(page) {
  const h1 = await page.locator("h1").first().innerText();
  if (!/Ваши данные/i.test(h1)) {
    throw new Error(`VERIFY data step failed: h1="${h1}"`);
  }
}

async function captureEntry(page, fileName, expectedWidth, theme, step, verifyFn) {
  await verifyViewport(page, expectedWidth);
  const dataTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (dataTheme !== theme) {
    throw new Error(`Theme mismatch: expected ${theme}, got ${dataTheme}`);
  }
  await verifyFn(page);
  const url = page.url();
  const fullPageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const filePath = path.join(OUT, fileName);
  await page.screenshot({ path: filePath, fullPage: true });
  const png = await pngSize(filePath);
  if (png.width !== expectedWidth) {
    throw new Error(`PNG width ${png.width} != viewport ${expectedWidth} for ${fileName}`);
  }
  return {
    file: fileName,
    step,
    theme,
    url,
    codeSha: CODE_SHA,
    viewportWidth: expectedWidth,
    pngWidth: png.width,
    pngHeight: png.height,
    fullPageHeight,
    verify: "passed",
  };
}

async function openTypes(page, theme, width) {
  await page.setViewportSize({ width, height: width >= 1440 ? 900 : 812 });
  await applyTheme(page, theme);
  await page.goto(`${BASE}/join`, { waitUntil: "networkidle" });
  await clearRegistrationDraft(page);
}

async function openDataStep(page, theme, width) {
  await openTypes(page, theme, width);
  await page.locator('label:has(input[value="agent"])').click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByLabel("Имя").fill("QA Visual");
}

async function openAuthStep(page, theme, width) {
  await openDataStep(page, theme, width);
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.getByLabel("Город").fill("Москва");
  await page.getByRole("button", { name: "Продолжить" }).click();
  await page.waitForSelector("#embedded-auth-title", { timeout: 20_000 });
  await page.waitForLoadState("networkidle");
}

async function extractRef(refGitPath, outName) {
  const outPath = path.join(OUT, outName);
  try {
    const buf = execSync(`git -C "${NAV_REPO}" show "${REF_SHA}:${refGitPath}"`, {
      encoding: "buffer",
      maxBuffer: 20 * 1024 * 1024,
    });
    await writeFile(outPath, buf);
    const png = await pngSize(outPath);
    return { file: outName, refSha: REF_SHA, refPath: refGitPath, pngWidth: png.width, pngHeight: png.height };
  } catch (e) {
    return { file: outName, error: String(e.message ?? e), skipped: true };
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const captures = [];
  const refs = [];

  refs.push(
    await extractRef(
      "docs/reference/registration-20261017/review-01/registration-review-ref-types-375.png",
      "ref-types-375-light.png",
    ),
  );
  refs.push(
    await extractRef(
      "docs/reference/registration-20261017/review-011/reg011-types-375-dark.png",
      "ref-types-375-dark.png",
    ),
  );

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await applyTheme(page, "light");
    await assertCtaContrast(page, 'a[class*="primaryBtn"]');
    captures.push(
      await captureEntry(page, "reg013-welcome-1440-light.png", 1440, "light", "welcome", async () => {}),
    );

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await applyTheme(page, "light");
    await assertCtaContrast(page, 'a[class*="primaryBtn"]');
    captures.push(
      await captureEntry(page, "reg013-welcome-375-light.png", 375, "light", "welcome", async () => {}),
    );

    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await applyTheme(page, "dark");
    await assertCtaContrast(page, 'a[class*="primaryBtn"]');
    captures.push(
      await captureEntry(page, "reg013-welcome-375-dark.png", 375, "dark", "welcome", async () => {}),
    );

    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await applyTheme(page, "dark");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2,
    );
    if (overflow) throw new Error("320px welcome horizontal overflow");
    const buttonsClip = await page.evaluate(() => {
      const btn = document.querySelector('a[class*="primaryBtn"]');
      if (!btn) return false;
      const r = btn.getBoundingClientRect();
      return r.right > window.innerWidth + 2;
    });
    if (buttonsClip) throw new Error("320px welcome CTA clipped");
    captures.push(
      await captureEntry(page, "reg013-welcome-320-dark.png", 320, "dark", "welcome", async () => {}),
    );

    await context.close();
  }

  for (const { theme, width, suffix } of [
    { theme: "light", width: 1440, suffix: "1440-light" },
    { theme: "dark", width: 1440, suffix: "1440-dark" },
    { theme: "light", width: 375, suffix: "375-light" },
    { theme: "dark", width: 375, suffix: "375-dark" },
  ]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openTypes(page, theme, width);
    captures.push(
      await captureEntry(
        page,
        `reg013-types-${suffix}.png`,
        width,
        theme,
        "types",
        verifyTypesStep,
      ),
    );
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openDataStep(page, "dark", 375);
    captures.push(
      await captureEntry(
        page,
        "reg013-data-375-dark.png",
        375,
        "dark",
        "data",
        verifyDataStep,
      ),
    );
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await openAuthStep(page, "dark", 375);
    captures.push(
      await captureEntry(
        page,
        "reg013-auth-375-dark.png",
        375,
        "dark",
        "auth",
        verifyAuthStep,
      ),
    );
    await context.close();
  }

  await browser.close();

  const report = {
    base: BASE,
    codeSha: CODE_SHA,
    refSha: REF_SHA,
    capturedAt: new Date().toISOString(),
    superseded: [
      "reg012-welcome-1440-light.png",
      "reg012-welcome-375-light.png",
      "reg012-welcome-375-dark.png",
      "reg012-welcome-320-dark.png",
      "reg012-types-375-dark.png",
      "reg012-types-1440-light.png",
      "reg012-data-375-dark.png",
      "reg012-auth-375-dark.png",
    ],
    captures,
    refs,
    remainingVisualGaps: [
      "Frozen reference ships type picker PNG only at 375px (light ref + dark review-011); no 1440 type/ref pair in repo.",
      "Progress step pixel parity not scored; labels/layout aligned in code only.",
      "Welcome hero illustration differs from static reference export (accepted in 01.1).",
    ],
    assertions: ["cta_contrast_light", "cta_contrast_dark", "no_320_overflow", "step_verify_before_capture"],
  };
  await writeFile(
    path.join(ROOT, "artifacts/remcard-registration-01/visual-capture.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
