#!/usr/bin/env node
/**
 * REGISTRATION-01 visual pairs: frozen prototype ref + platform impl.
 * Run AFTER committing capture code (records exact git SHA).
 */
import { execSync, spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "../..");
const OUT = path.join(ROOT, "artifacts/remcard-registration-01/screenshots");
const IMPL_BASE = process.env.REGISTRATION_VISUAL_BASE ?? "http://127.0.0.1:3020";
const NAV_REPO = process.env.REGISTRATION_REF_REPO ?? "/agent/repos/remcard-navigator";
const REF_BRANCH =
  process.env.REGISTRATION_REF_BRANCH ?? "origin/implementation/remcard-reference-20261014";
const PROTO_DIR = process.env.REGISTRATION_PROTO_DIR ?? "/tmp/reg-prototype-20261017";
const PROTO_PORT = Number(process.env.REGISTRATION_PROTO_PORT ?? "3099");
const PROTO_BASE = `http://127.0.0.1:${PROTO_PORT}`;

const CODE_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
const TREE_DIRTY =
  execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" }).trim().length > 0;
const REF_SHA = execSync(`git -C "${NAV_REPO}" rev-parse ${REF_BRANCH}`, {
  encoding: "utf8",
}).trim();

const DEV_OVERLAY_HIDE = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog],
  #webpack-dev-server-client-overlay, .nextjs-toast-errors-parent { display: none !important; }
`;

async function preparePrototypeTree() {
  await mkdir(PROTO_DIR, { recursive: true });
  execSync(
    `git -C "${NAV_REPO}" archive ${REF_BRANCH} docs/reference/registration-20261017 | tar -x -C "${PROTO_DIR}"`,
    { stdio: "pipe" },
  );
  return path.join(PROTO_DIR, "docs/reference/registration-20261017");
}

async function startPrototypeServer(protoRoot) {
  const proc = spawn("python3", ["-m", "http.server", String(PROTO_PORT)], {
    cwd: protoRoot,
    stdio: "ignore",
  });
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${PROTO_BASE}/roles.html`);
      if (res.ok) return proc;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  proc.kill();
  throw new Error("Prototype static server failed to start");
}

async function pngSize(filePath) {
  const buf = await readFile(filePath);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function applyTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
}

async function hideDevChrome(page) {
  await page.addStyleTag({ content: DEV_OVERLAY_HIDE });
}

async function verifyViewport(page, expectedWidth) {
  const inner = await page.evaluate(() => window.innerWidth);
  if (inner !== expectedWidth) {
    throw new Error(`Viewport mismatch: expected ${expectedWidth}, got ${inner}`);
  }
}

async function verifyTypesStep(page) {
  const h1 = await page.locator("h1").first().innerText();
  if (!/Какой тип партнёрства/i.test(h1)) {
    throw new Error(`VERIFY types failed: h1="${h1}"`);
  }
  if ((await page.locator("#embedded-auth-title").count()) > 0) {
    throw new Error("VERIFY types failed: auth step visible");
  }
}

async function captureRecord(page, fileName, expectedWidth, theme, step, kind, verifyFn) {
  await applyTheme(page, theme);
  await verifyViewport(page, expectedWidth);
  const dataTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (kind === "reference" && dataTheme !== theme) {
    throw new Error(`Theme expected ${theme}, got ${dataTheme}`);
  }
  await verifyFn(page);
  const filePath = path.join(OUT, fileName);
  const fullPageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: filePath, fullPage: true });
  const png = await pngSize(filePath);
  if (png.width !== expectedWidth) {
    throw new Error(`PNG width ${png.width} != ${expectedWidth} for ${fileName}`);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 2,
  );
  if (overflow) throw new Error(`Horizontal overflow at ${fileName}`);
  return {
    file: fileName,
    kind,
    step,
    theme,
    url: page.url(),
    codeSha: CODE_SHA,
    viewportWidth: expectedWidth,
    pngWidth: png.width,
    pngHeight: png.height,
    fullPageHeight,
    verify: "passed",
  };
}

async function openImplTypes(page, theme, width) {
  await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
  await applyTheme(page, theme);
  await hideDevChrome(page);
  await page.goto(`${IMPL_BASE}/join`, { waitUntil: "networkidle" });
}

async function openPrototypeTypes(page, theme, width) {
  await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
  await page.goto(`${PROTO_BASE}/roles.html`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForFunction(
    () => !document.getElementById("load-message")?.textContent?.includes("Загружаем"),
    { timeout: 60_000 },
  );
  const registerBtn = page.locator('[data-entry="register"]').first();
  if (await registerBtn.count()) {
    await registerBtn.click();
  } else {
    await page.locator('[data-action="register"]').first().click();
  }
  await page.waitForSelector("h1", { timeout: 30_000 });
  await page.evaluate(() => {
    document.querySelector(".demo-top")?.remove();
    document.querySelector(".review-toolbar")?.remove();
    document.querySelector(".entry-disclaimer")?.remove();
    document.querySelector("details.review-details")?.remove();
  });
  await applyTheme(page, theme);
  const h1 = await page.locator(".intro h1, h1").first().innerText();
  if (!/Какой тип партнёрства/i.test(h1)) {
    throw new Error(`Prototype choose screen not ready: "${h1}"`);
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const protoRoot = await preparePrototypeTree();
  const protoProc = await startPrototypeServer(protoRoot);

  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const captures = [];
  const pairs = [];

  const typeMatrix = [
    { theme: "light", width: 1440, suffix: "1440-light" },
    { theme: "dark", width: 1440, suffix: "1440-dark" },
    { theme: "light", width: 375, suffix: "375-light" },
    { theme: "dark", width: 375, suffix: "375-dark" },
    { theme: "dark", width: 320, suffix: "320-dark" },
  ];

  for (const { theme, width, suffix } of typeMatrix) {
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openPrototypeTypes(page, theme, width);
      captures.push(
        await captureRecord(
          page,
          `ref-types-${suffix}.png`,
          width,
          theme,
          "types",
          "reference",
          verifyTypesStep,
        ),
      );
      await context.close();
    }
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openImplTypes(page, theme, width);
      captures.push(
        await captureRecord(
          page,
          `impl-types-${suffix}.png`,
          width,
          theme,
          "types",
          "implementation",
          verifyTypesStep,
        ),
      );
      pairs.push({ pair: `types-${suffix}`, ref: `ref-types-${suffix}.png`, impl: `impl-types-${suffix}.png` });
      await context.close();
    }
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await applyTheme(page, "dark");
    await hideDevChrome(page);
    await page.goto(`${IMPL_BASE}/join`, { waitUntil: "networkidle" });
    await page.locator('label:has(input[value="agent"])').click({ position: { x: 8, y: 8 } });
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByLabel("Имя").fill("QA Visual");
    captures.push(
      await captureRecord(page, "impl-data-375-dark.png", 375, "dark", "data", "implementation", async (p) => {
        const h1 = await p.locator("h1").first().innerText();
        if (!/Ваши данные/i.test(h1)) throw new Error(`data step h1=${h1}`);
      }),
    );
    await context.close();
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await applyTheme(page, "dark");
    await hideDevChrome(page);
    await page.goto(`${IMPL_BASE}/join`, { waitUntil: "networkidle" });
    await page.locator('label:has(input[value="agent"])').click({ position: { x: 8, y: 8 } });
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByLabel("Имя").fill("QA Visual");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.getByLabel("Город").fill("Москва");
    await page.getByRole("button", { name: /Продолжить/ }).click();
    await page.waitForSelector("#embedded-auth-title", { timeout: 20_000 });
    captures.push(
      await captureRecord(page, "impl-auth-375-dark.png", 375, "dark", "auth", "implementation", async (p) => {
        if ((await p.locator("#embedded-auth-title").count()) === 0) {
          throw new Error("auth step missing embedded title");
        }
      }),
    );
    await context.close();
  }

  await browser.close();
  protoProc.kill();

  const invalidRefs = ["ref-types-375-dark.png (review-011 implementation snapshot)"];
  const report = {
    implBase: IMPL_BASE,
    protoBase: PROTO_BASE,
    codeSha: CODE_SHA,
    treeDirty: TREE_DIRTY,
    referenceSha: REF_SHA,
    referenceBranch: REF_BRANCH,
    capturedAt: new Date().toISOString(),
    captureCount: captures.length,
    pairs,
    captures,
    invalidSupersededRefs: invalidRefs,
    supersededImpl: ["reg012-*", "reg013-*", "ref-types-375-light.png (review-01 extract)"],
    remainingVisualGaps: [
      "CAPTURED ≠ pixel PASS; pairs are for human/review diff only.",
      "Prototype ref hides demo-top/review-toolbar/disclaimer only; product copy unchanged.",
      "Welcome hero not in this types-focused capture set.",
    ],
    assertions: ["step_verify", "viewport_verify", "theme_verify", "no_horizontal_overflow"],
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
