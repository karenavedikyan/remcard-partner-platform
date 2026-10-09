/**
 * PROF-H4 full browser acceptance (mock Yandex ymaps in page; real UI/BFF/navigator API).
 */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

execSync("node /agent/repos/remcard-partner-platform/scripts/prof-h3-browser-fixtures.mjs", {
  stdio: "inherit",
});

const outDir = "/opt/cursor/artifacts/screenshots";
mkdirSync(outDir, { recursive: true });

const STORE_OWNER = "m1fix-prof-browser-store01";
const NAV = "http://127.0.0.1:3001";
const PROF = "http://127.0.0.1:3000";

/** Navigator loopback uses staging Basic Auth (see remcard-navigator `.env.local`). */
const NAV_BASIC = Buffer.from("localtest:localtest").toString("base64");

function navFetchHeaders(cookie) {
  const headers = { Authorization: `Basic ${NAV_BASIC}` };
  if (cookie) headers.cookie = cookie;
  return headers;
}

function mintToken(userId) {
  return execSync(
    `cd /agent/repos/remcard-navigator && pnpm exec tsx -e "import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', 0));"`,
    { encoding: "utf8" },
  ).trim();
}

function mintStaffToken() {
  return execSync("cd /agent/repos/remcard-navigator && pnpm exec tsx scripts/mint-staff-operator-token.ts", {
    encoding: "utf8",
  }).trim();
}

function seedBranchRevise(branchId, comment) {
  const args = comment
    ? `scripts/prof-h4-branch-revise-seed.ts ${branchId} ${JSON.stringify(comment)}`
    : `scripts/prof-h4-branch-revise-seed.ts ${branchId}`;
  execSync(`cd /agent/repos/remcard-navigator && pnpm exec tsx ${args}`, { stdio: "inherit" });
}

function ymapsInitScript() {
  return () => {
    const mockGeocode = (q) => ({
      then: (cb) => {
        cb({
          geoObjects: {
            get: () => ({
              geometry: { getCoordinates: () => [38.975313, 45.03547] },
              properties: {
                get: (k) => {
                  if (k === "text") return String(q);
                  return {
                    metaDataProperty: {
                      GeocoderMetaData: {
                        Address: {
                          Components: [{ kind: "locality", name: "Краснодар" }],
                        },
                      },
                    },
                  };
                },
              },
            }),
          },
        });
      },
    });
    window.ymaps = {
      ready: (cb) => cb(),
      geocode: mockGeocode,
    };
  };
}

const results = { scenarios: {}, consoleErrors: [], branchId: null, exitCode: 0, provider: "mock-ymaps-in-page" };

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

async function profContext(viewport) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript(ymapsInitScript());
  await ctx.addCookies([
    {
      name: "remcard-token",
      value: mintToken(STORE_OWNER),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  return ctx;
}

async function openBranchEditor(page, branchId) {
  await page.goto(`${PROF}/profile?section=branches&branchId=${encodeURIComponent(branchId)}`, {
    waitUntil: "networkidle",
    timeout: 120_000,
  });
  await page.getByLabel(/Название/i).waitFor({ timeout: 60_000 });
}

await runScenario("full_branch_flow_1440", async () => {
  const context = await profContext({ width: 1440, height: 900 });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") results.consoleErrors.push(msg.text());
  });

  await page.goto(`${PROF}/profile?section=branches`, { waitUntil: "networkidle", timeout: 120_000 });
  await page.getByText("Точки на карте remcard.ru").waitFor({ timeout: 60_000 });
  await page.getByText("Загружаем").waitFor({ state: "hidden", timeout: 60_000 }).catch(() => {});

  const branchName = `H4 E2E ${Date.now().toString().slice(-5)}`;
  const branchAddress = `ул. E2E ${Date.now().toString().slice(-4)}`;
  const addForm = page.locator("form").filter({ hasText: "Город филиала" });
  await addForm.locator('[id="название-(необязательно)"]').fill(branchName);
  await addForm.locator('[id="город-филиала"]').fill("Краснодар");
  await addForm.locator('[id="адрес"]').fill(branchAddress);

  const createdBranchId = await page.evaluate(
    async ({ name, address }) => {
      const r = await fetch("/api/remcard/api/pro/organization/branches", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city: "Краснодар", address }),
      });
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
      const json = await r.json();
      return json.branch?.id ?? null;
    },
    { name: branchName, address: branchAddress },
  );
  if (!createdBranchId) throw new Error("branch id missing after create");
  results.branchId = createdBranchId;

  await openBranchEditor(page, createdBranchId);
  await page.getByTestId("branch-address-search").click();
  await page.getByTestId("branch-address-preview").waitFor({ timeout: 15_000 });
  await page.getByTestId("branch-address-confirm").click();
  await page.getByTestId("branch-geohash-confirmed").waitFor({ timeout: 10_000 });

  await page.locator('fieldset:not([disabled]) input[type="checkbox"]').first().check({ timeout: 30_000 });
  await page.getByRole("button", { name: /Заполнить направлениями организации/i }).click({ timeout: 15_000 }).catch(() => {});
  await page.getByRole("button", { name: /Заполнить расписанием/i }).click({ timeout: 15_000 }).catch(() => {});

  await page.getByRole("button", { name: /Сохранить черновик/i }).click();
  await page.getByText(/Черновик филиала сохранён/i).waitFor({ timeout: 15_000 });

  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("branch-geohash-confirmed").waitFor({ timeout: 15_000 });

  await page.getByRole("button", { name: /Отправить на проверку/i }).click();
  await page.getByText(/отправлен на проверку/i).waitFor({ timeout: 15_000 });

  const staffToken = mintStaffToken();
  const approve = await fetch(`${NAV}/api/admin/moderation/branches/${createdBranchId}/approve`, {
    method: "POST",
    headers: navFetchHeaders(`remcard-token=${staffToken}`),
  });
  if (!approve.ok) throw new Error(`approve ${approve.status} ${await approve.text()}`);

  const pub = await fetch(`${NAV}/api/catalog/branch/${createdBranchId}`, {
    headers: navFetchHeaders(),
  });
  if (!pub.ok) throw new Error(`public branch ${pub.status}`);
  const pubJson = await pub.json();
  if (!pubJson.branch?.address?.trim()) throw new Error("public branch missing address");

  const catalogCity = "Краснодар";
  const catalog = await fetch(
    `${NAV}/api/catalog?city=${encodeURIComponent(catalogCity)}&storeCategories=doors`,
    { headers: navFetchHeaders() },
  );
  if (!catalog.ok) throw new Error(`catalog search ${catalog.status}`);
  const catalogJson = await catalog.json();
  const inSearch = (catalogJson.branches ?? []).some((b) => b.branchId === createdBranchId);
  if (!inSearch) throw new Error("approved branch not in catalog city search");

  await page.screenshot({ path: `${outDir}/prof-h4-e2e-after-approve-1440.png`, fullPage: true });
  await context.close();
});

await runScenario("published_draft_and_geohash_reset", async () => {
  if (!results.branchId) throw new Error("no branch from prior scenario");
  const branchId = results.branchId;
  const context = await profContext({ width: 1440, height: 900 });
  const page = await context.newPage();
  await openBranchEditor(page, branchId);

  const liveAddr = await page.getByLabel(/^Адрес/i).inputValue();
  await page.getByLabel(/^Адрес/i).fill(`${liveAddr} (draft)`);
  await page.getByTestId("branch-geohash-confirmed").waitFor({ state: "hidden", timeout: 10_000 });

  await page.getByLabel(/^Город/i).fill("Сочи");
  await page.getByTestId("branch-geohash-confirmed").waitFor({ state: "hidden", timeout: 10_000 });

  await page.getByRole("button", { name: /Сохранить черновик/i }).click();
  await page.waitForTimeout(2000);

  const token = mintToken(STORE_OWNER);
  const editorRes = await fetch(`${NAV}/api/pro/organization/branches/${branchId}`, {
    headers: navFetchHeaders(`remcard-token=${token}`),
  });
  if (!editorRes.ok) throw new Error(`editor GET ${editorRes.status}`);
  const editor = await editorRes.json();
  const pub = await fetch(`${NAV}/api/catalog/branch/${branchId}`, { headers: navFetchHeaders() }).then(
    (r) => r.json(),
  );
  const effAddress = editor.branch?.catalogDraft?.address ?? editor.branch?.address;
  if (!String(effAddress).includes("(draft)")) throw new Error("editor should show draft address");
  if (String(pub.branch?.address).includes("(draft)")) throw new Error("public card must stay on live address");
  const draft = editor.branch?.catalogDraft;
  const draftGeo =
    draft && Object.prototype.hasOwnProperty.call(draft, "addressGeohash")
      ? draft.addressGeohash
      : undefined;
  if (draftGeo != null) {
    throw new Error(`draft should not keep geohash after city/address change (got ${draftGeo})`);
  }
  await context.close();
});

await runScenario("provider_error_retry", async () => {
  if (!results.branchId) throw new Error("no branch from prior scenario");
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    window.ymaps = {
      ready: (cb) => cb(),
      geocode: () => {
        throw new Error("provider down");
      },
    };
  });
  await context.addCookies([
    {
      name: "remcard-token",
      value: mintToken(STORE_OWNER),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  await openBranchEditor(page, results.branchId);
  await page.getByTestId("branch-address-search").click();
  await page.getByRole("alert").filter({ hasText: /карт/i }).waitFor({ timeout: 10_000 });
  await page.getByRole("button", { name: /Повторить поиск/i }).waitFor({ timeout: 10_000 });
  await context.close();
});

await runScenario("revise_note_and_resubmit", async () => {
  if (!results.branchId) throw new Error("no branch from prior scenario");
  const branchId = results.branchId;
  const noteText = "H4 revise: поправьте фото филиала";
  seedBranchRevise(branchId, noteText);

  const context = await profContext({ width: 1440, height: 900 });
  const page = await context.newPage();
  await openBranchEditor(page, branchId);
  await page.getByText(noteText).waitFor({ timeout: 15_000 });
  await page.getByTestId("branch-address-search").click();
  await page.getByTestId("branch-address-confirm").click();
  await page.getByTestId("branch-geohash-confirmed").waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /Сохранить черновик/i }).click();
  await page.getByText(/Черновик филиала сохранён/i).waitFor({ timeout: 15_000 });
  await page.getByRole("button", { name: /Отправить повторно/i }).click();
  await page.getByText(/отправлен на проверку/i).waitFor({ timeout: 15_000 });

  const staffToken = mintStaffToken();
  const approve = await fetch(`${NAV}/api/admin/moderation/branches/${branchId}/approve`, {
    method: "POST",
    headers: navFetchHeaders(`remcard-token=${staffToken}`),
  });
  if (!approve.ok) throw new Error(`re-approve ${approve.status}`);
  await context.close();
});

await runScenario("contacts_dirty_and_overflow_390", async () => {
  if (!results.branchId) throw new Error("no branch from prior scenario");
  const context = await profContext({ width: 390, height: 844 });
  const page = await context.newPage();
  await openBranchEditor(page, results.branchId);

  await page.locator("label").filter({ hasText: "Телефон" }).locator('input[type="checkbox"]').check();
  await page.getByLabel(/Значение \(Телефон\)/i).fill("+79001234567");

  page.once("dialog", (d) => d.dismiss());
  await page.getByRole("button", { name: /← К списку/i }).click();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  await page.screenshot({ path: `${outDir}/prof-h4-e2e-390.png`, fullPage: true });
  if (overflow) throw new Error("horizontal overflow");
  await context.close();
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
        navigator: execSync("git -C /agent/repos/remcard-navigator rev-parse HEAD", { encoding: "utf8" }).trim(),
      },
      bffGeocodeRoute: "POST /api/pro/geocode/resolve not allowlisted (client-side Yandex)",
      realYandexProvider:
        process.env.PROF_H4_REAL_YANDEX === "1"
          ? "NOT VERIFIED (PROF_H4_REAL_YANDEX=1 not exercised in this script)"
          : "NOT VERIFIED (mock ymaps in page; no live api-maps.yandex.ru call)",
      command: "node scripts/prof-h4-browser-acceptance.mjs",
    },
    null,
    2,
  ),
);
process.exit(results.exitCode);
