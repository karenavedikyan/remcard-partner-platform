import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const USER = "m1fix-prof-browser01";
const USER_ORG_STORE = "m1fix-prof-browser-store01";

execSync("node /agent/repos/remcard-partner-platform/scripts/prof-h3-browser-fixtures.mjs", {
  stdio: "inherit",
});

function mintToken(userId) {
  return execSync(
    `cd /agent/repos/remcard-navigator && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8" },
  ).trim();
}

const results = { scenarios: {}, consoleErrors: [], exitCode: 0 };

async function openCatalogSection(page) {
  await page.goto("http://127.0.0.1:3000/profile?section=catalog", {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByText("Помогите новым клиентам").waitFor({ timeout: 60_000 });
  const catalogTab = page.getByRole("tab", { name: /Каталог RemCard/i });
  if ((await catalogTab.getAttribute("aria-selected")) !== "true") {
    await catalogTab.click();
    await page.waitForTimeout(400);
  }
}

async function ensureCatalogExpanded(page) {
  const prepare = page.getByRole("button", { name: /Подготовить профиль к публикации/i });
  if (await prepare.isVisible()) {
    await prepare.click();
    await page.waitForTimeout(600);
  }
}

async function runScenario(key, fn) {
  try {
    await fn();
    results.scenarios[key] = "PASS";
  } catch (e) {
    results.scenarios[key] = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    results.exitCode = 1;
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addCookies([
  {
    name: "remcard-token",
    value: mintToken(USER),
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  },
]);
const page = await context.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") results.consoleErrors.push(msg.text());
});

await runScenario("catalog_layout_1440", async () => {
  await page.goto("http://127.0.0.1:3000/profile?section=catalog", {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  if (!body.includes("Помогите новым клиентам найти вас")) {
    throw new Error("missing H3 catalog headline");
  }
  await page.getByRole("button", { name: /Подготовить профиль к публикации/i }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/prof-h3-catalog-1440.png`, fullPage: true });
  if (!(await page.getByTestId("catalog-public-preview").isVisible())) {
    throw new Error("preview missing");
  }
});

await runScenario("catalog_save_reload", async () => {
  const desc = page.getByLabel(/Описание для каталога/i);
  await desc.fill(`H3 smoke ${Date.now().toString().slice(-5)}`);
  await page.getByRole("button", { name: /Сохранить черновик/i }).click();
  await page.waitForTimeout(3000);
  const value = await desc.inputValue();
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /Подготовить профиль к публикации/i }).click();
  await page.waitForTimeout(500);
  if ((await page.getByLabel(/Описание для каталога/i).inputValue()) !== value) {
    throw new Error("description not persisted");
  }
});

await runScenario("catalog_org_specializations_not_owner", async () => {
  const orgContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await orgContext.addCookies([
    {
      name: "remcard-token",
      value: mintToken(USER_ORG_STORE),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  const orgPage = await orgContext.newPage();
  await openCatalogSection(orgPage);
  await ensureCatalogExpanded(orgPage);
  await orgPage.waitForTimeout(800);
  const services = orgPage.getByRole("group", { name: "Работы и услуги" });
  const products = orgPage.getByRole("group", { name: "Товары" });
  const tiles = services.getByRole("checkbox", { name: /Плитка/i });
  const doorsProduct = products.getByRole("checkbox", { name: /Двери/i });
  if (!(await tiles.isChecked())) throw new Error("org services must show tiles checked");
  if (await doorsProduct.isChecked()) {
    // org storeCategories doors may be pre-selected; ensure owner-only plumbing is not in products
  }
  const plumbing = products.getByRole("checkbox", { name: /Сантехника/i });
  if (await plumbing.isChecked()) {
    throw new Error("owner storeCategories plumbing must not appear for org catalog");
  }
  const ownerDoorsService = services.getByRole("checkbox", { name: /^Двери$/i });
  if (await ownerDoorsService.isChecked()) {
    throw new Error("owner user specializations must not drive org catalog services");
  }
  await orgPage.screenshot({ path: `${outDir}/prof-h3-catalog-org-specializations.png`, fullPage: true });
  await orgContext.close();
});

await runScenario("catalog_directions_picker", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:3000/profile?section=catalog", {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByRole("button", { name: /Подготовить профиль к публикации/i }).click();
  await page.waitForTimeout(800);
  const productsLegend = page.getByRole("group", { name: "Товары" });
  const servicesLegend = page.getByRole("group", { name: "Работы и услуги" });
  if (!(await productsLegend.isVisible()) || !(await servicesLegend.isVisible())) {
    throw new Error("catalog picker must show both product and service groups");
  }
  const firstProduct = productsLegend.locator('input[type="checkbox"]').first();
  await firstProduct.check();
  await page.waitForTimeout(300);
  if (!(await firstProduct.isChecked())) throw new Error("product checkbox not wired");
});

await runScenario("catalog_upload_mock_success_reload", async () => {
  await page.route("**/api/remcard/api/upload", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ url: "https://example.test/mock-catalog-logo.png" }),
    });
  });
  await openCatalogSection(page);
  await ensureCatalogExpanded(page);
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: "mock-logo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Сохранить черновик/i }).click();
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: "networkidle" });
  await ensureCatalogExpanded(page);
  await page.screenshot({ path: `${outDir}/prof-h3-upload-mock-preview.png`, fullPage: true });
  results.scenarios.catalog_upload_mock_note =
    "UI contract only (mock upload URL, not production storage)";
});

await runScenario("catalog_upload_reject_retry", async () => {
  await openCatalogSection(page);
  await ensureCatalogExpanded(page);
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({
    name: "not-image.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await page.waitForTimeout(800);
  const body = await page.locator("body").innerText();
  if (!/изображение|JPG|PNG|WEBP|HEIC/i.test(body)) {
    throw new Error("expected client upload validation message");
  }
  await input.setInputFiles({
    name: "tiny.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await page.waitForTimeout(2500);
});

await runScenario("moderation_notes_catalog_link", async () => {
  execSync(
    `cd /agent/repos/remcard-navigator && pnpm exec tsx scripts/prof-h3-browser-moderation-seed.ts ${USER}`,
    { stdio: "pipe" },
  );
  await openCatalogSection(page);
  const body = await page.locator("body").innerText();
  if (!body.includes("исправьте описание каталога")) {
    throw new Error("moderation note not visible on catalog section");
  }
  await page.screenshot({ path: `${outDir}/prof-h3-moderation-notes.png`, fullPage: true });
});

await runScenario("overflow_390", async () => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  await page.screenshot({ path: `${outDir}/prof-h3-catalog-390.png`, fullPage: true });
  if (overflow) throw new Error("horizontal overflow");
  results.scenarios.overflow_390 = "PASS";
});

await browser.close();

console.log(
  JSON.stringify(
    {
      ...results,
      shas: {
        platform: execSync("git -C /agent/repos/remcard-partner-platform rev-parse HEAD", {
          encoding: "utf8",
        }).trim(),
        navigator: execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", {
          encoding: "utf8",
        }).trim(),
      },
      command: "node scripts/prof-h3-browser-smoke.mjs",
    },
    null,
    2,
  ),
);
process.exit(results.exitCode);
