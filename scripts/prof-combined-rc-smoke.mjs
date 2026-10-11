#!/usr/bin/env node
/**
 * Combined RC smoke: recommendation-readiness + partnership links + directions contrast.
 * Requires production next start on PROF (3030) + NAV (3031), remcard_prof_test, .env.local JWT.
 */
import { chromium } from "playwright";
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PROF = process.env.PROF_BASE_URL || "http://127.0.0.1:3030";
const NAV = process.env.NAV_BASE_URL || "http://127.0.0.1:3031";
const NAV_ROOT =
  process.env.NAV_RC_ROOT ||
  "/opt/cursor/worktrees/remcard-navigator-rc-prof-recommendation-partnership-contrast";
const PROF_ROOT =
  process.env.PROF_RC_ROOT ||
  "/opt/cursor/worktrees/remcard-partner-platform-rc-prof-recommendation-partnership-contrast";
const OUT = process.env.PROF_RC_ARTIFACT_DIR || "/opt/cursor/artifacts/prof-combined-rc-smoke";

const TESTED_CODE_SHA = {
  navigator: "70464d46a1e83b4dc22e80116ac10e1304467c59",
  platform: "5639943d9032fa34b85bf917acc2c5a53833a40d",
};

mkdirSync(OUT, { recursive: true });

const report = {
  testedCodeSha: { ...TESTED_CODE_SHA },
  toolingBranchTip: { navigator: null, platform: null },
  stack: {},
  scenarios: {},
  notVerified: [],
  assertions: {},
  exitCode: 0,
};

report.toolingBranchTip.navigator = execSync(`git -C ${NAV_ROOT} rev-parse HEAD`, {
  encoding: "utf8",
}).trim();
report.toolingBranchTip.platform = execSync(`git -C ${PROF_ROOT} rev-parse HEAD`, {
  encoding: "utf8",
}).trim();

function assertTestedCodeIsRuntimeBase() {
  for (const [label, root, sha] of [
    ["navigator", NAV_ROOT, TESTED_CODE_SHA.navigator],
    ["platform", PROF_ROOT, TESTED_CODE_SHA.platform],
  ]) {
    execSync(`git -C ${root} merge-base --is-ancestor ${sha} HEAD`, { stdio: "pipe" });
    if (execSync(`git -C ${root} rev-parse HEAD`, { encoding: "utf8" }).trim() === sha) continue;
    const dirty = execSync(`git -C ${root} diff HEAD --name-only`, { encoding: "utf8" }).trim();
    if (dirty) throw new Error(`${label} RC worktree has uncommitted tracked changes: ${dirty}`);
  }
}

function readProcCwd(pid) {
  try {
    return execSync(`readlink -f /proc/${pid}/cwd`, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function verifySmokeStack() {
  assertTestedCodeIsRuntimeBase();
  const profPid = execSync("pgrep -f 'next start -p 3030' | head -1", { encoding: "utf8" }).trim();
  const navPid = execSync("pgrep -f 'next start -p 3031' | head -1", { encoding: "utf8" }).trim();
  if (!profPid || !navPid) throw new Error("missing next start on 3030 or 3031");
  const profCwd = readProcCwd(profPid);
  const navCwd = readProcCwd(navPid);
  if (profCwd !== PROF_ROOT) {
    throw new Error(`platform cwd ${profCwd} !== RC ${PROF_ROOT}`);
  }
  if (navCwd !== NAV_ROOT) {
    throw new Error(`navigator cwd ${navCwd} !== RC ${NAV_ROOT}`);
  }
  let buildId = null;
  try {
    buildId = execSync(`cat ${PROF_ROOT}/.next/BUILD_ID`, { encoding: "utf8" }).trim();
  } catch {
    throw new Error("platform .next/BUILD_ID missing — rebuild RC platform before smoke");
  }
  report.stack = { profCwd, navCwd, platformBuildId: buildId, profPid, navPid };
}

function decodeReturnToOnce(raw) {
  if (raw == null || raw === "") return null;
  try {
    return decodeURIComponent(String(raw).replace(/\+/g, " "));
  } catch {
    return null;
  }
}

function isSafeInternalReturnPath(path) {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//") && !path.includes("\\");
}

function expectedPartnersReturnTo(partnershipId) {
  return `/partners?terms=${partnershipId}`;
}

function assertReturnToMatchesPartnership(returnTo, partnershipId) {
  const expected = expectedPartnersReturnTo(partnershipId);
  const parsed = new URL(returnTo, "http://smoke.local");
  const terms = parsed.searchParams.get("terms");
  if (parsed.pathname !== "/partners" || terms !== partnershipId) {
    throw new Error(`returnTo ${returnTo} !== expected ${expected}`);
  }
}

async function extractReturnToFromGatePage(page) {
  const observedUrl = page.url();
  const u = new URL(observedUrl);

  if (u.pathname === "/login") {
    const decoded = decodeReturnToOnce(u.searchParams.get("returnTo"));
    if (!decoded || !isSafeInternalReturnPath(decoded)) {
      throw new Error(`login page missing safe returnTo (observed ${observedUrl})`);
    }
    return { observedUrl, returnTo: decoded, source: "login_url" };
  }

  const loginLink = page.locator('a[href*="/login"]');
  if ((await loginLink.count()) > 0) {
    const href = await loginLink.first().getAttribute("href");
    if (href) {
      const linkUrl = new URL(href, observedUrl);
      if (linkUrl.pathname === "/login") {
        const decoded = decodeReturnToOnce(linkUrl.searchParams.get("returnTo"));
        if (decoded && isSafeInternalReturnPath(decoded)) {
          return { observedUrl, returnTo: decoded, source: "login_link" };
        }
      }
    }
  }

  if (u.pathname === "/partners" && u.searchParams.has("terms")) {
    const terms = u.searchParams.get("terms")?.trim();
    if (!terms) throw new Error(`partners URL lost terms query (${observedUrl})`);
    const returnTo = expectedPartnersReturnTo(terms);
    return { observedUrl, returnTo, source: "partners_deeplink_url" };
  }

  throw new Error(`cannot extract returnTo from gate page (${observedUrl})`);
}

function curlJsonWithStatus(path, token) {
  const out = execFileSync(
    "curl",
    [
      "-s",
      "-w",
      "\n__HTTP__%{http_code}",
      "-H",
      `Cookie: remcard-token=${token}`,
      "-H",
      `Origin: ${PROF}`,
      `${PROF}/api/remcard${path}`,
    ],
    { encoding: "utf8" },
  );
  const match = out.match(/\n__HTTP__(\d+)\s*$/);
  if (!match) {
    throw new Error(`curl response missing HTTP suffix: ${out.slice(0, 200)}`);
  }
  const status = Number.parseInt(match[1], 10);
  const body = out.slice(0, match.index);
  let json = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    json = body;
  }
  return { status, json, body };
}

function jsonContainsForeignPartnership(json, foreignId, foreignStoreName) {
  const text = JSON.stringify(json ?? {});
  return text.includes(foreignId) || text.includes(foreignStoreName);
}

function navTsx(code, extraEnv = {}) {
  return execFileSync("pnpm", ["exec", "tsx", "-e", code], {
    cwd: NAV_ROOT,
    encoding: "utf8",
    env: { ...process.env, NEXT_PUBLIC_PROF_CABINET_URL: PROF, ...extraEnv },
  }).trim();
}

function mint(userId, tokenVersion) {
  return navTsx(
    `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {createToken} from './src/lib/auth'; process.stdout.write(createToken('${userId}', ${tokenVersion}));`,
  );
}

function generatorPartnershipUrl(partnershipId) {
  return navTsx(
    `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {profCabinetPartnershipUrl} from './src/lib/profCabinetUrls'; process.stdout.write(profCabinetPartnershipUrl('${partnershipId}'));`,
    { NEXT_PUBLIC_PROF_CABINET_URL: PROF },
  );
}

function assertCertInPg(certId) {
  const out = navTsx(
    `import dotenv from 'dotenv'; dotenv.config({path:'.env.local'}); import {prisma} from './src/lib/prisma'; prisma.certificate.count({where:{id:'${certId}'}}).then(c=>{process.stdout.write(String(c));}).finally(()=>prisma.$disconnect());`,
  );
  if (out !== "1") throw new Error(`PG certificate missing: ${certId}`);
}

function contrastRatio(fgHex, bgHex) {
  const lum = (hex) => {
    const n = Number.parseInt(hex.replace("#", ""), 16);
    const ch = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * ch((n >> 16) & 255) + 0.7152 * ch((n >> 8) & 255) + 0.0722 * ch(n & 255);
  };
  const l1 = lum(fgHex);
  const l2 = lum(bgHex);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseRgb(css) {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  const hex = (n) => Number(n).toString(16).padStart(2, "0");
  return `#${hex(m[1])}${hex(m[2])}${hex(m[3])}`;
}

async function chipContrastOnProfile(page) {
  const chip = page.locator("ul[aria-label='Выбранные направления'] button").first();
  await chip.waitFor({ state: "visible", timeout: 60_000 });
  const styles = await chip.evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, backgroundColor: s.backgroundColor };
  });
  const fg = parseRgb(styles.color);
  const bg = parseRgb(styles.backgroundColor);
  if (!fg || !bg) throw new Error(`chip colors ${JSON.stringify(styles)}`);
  return { fg, bg, ratio: contrastRatio(fg, bg) };
}

async function run(name, fn) {
  try {
    const detail = await fn();
    report.scenarios[name] = { status: "PASS", ...(detail ? { detail } : {}) };
  } catch (e) {
    report.scenarios[name] = {
      status: "FAIL",
      error: e instanceof Error ? e.message : String(e),
    };
    report.exitCode = 1;
  }
}

async function waitDraftScopeReady(page) {
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="recommendation-draft-scope-error"]'),
    { timeout: 60_000 },
  );
  await page.waitForTimeout(150);
}

async function waitDraftPersisted(page, { validity = "6", minSelectedKeys = 1 } = {}) {
  await page.waitForFunction(
    ({ validity, minSelectedKeys }) => {
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (!key?.startsWith("rc-rec-create-v")) continue;
        try {
          const raw = sessionStorage.getItem(key);
          const d = raw ? JSON.parse(raw) : null;
          if (
            d?.validityPreset === validity &&
            Array.isArray(d.selectedKeys) &&
            d.selectedKeys.length >= minSelectedKeys
          ) {
            return true;
          }
        } catch {
          /* ignore */
        }
      }
      return false;
    },
    { validity, minSelectedKeys },
    { timeout: 30_000 },
  );
}

async function fillPartnerAndTerms(page) {
  await page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Партнёры" }) })
    .getByRole("checkbox")
    .first()
    .check();
  await page.getByTestId("recommendation-validity-preset").selectOption("6");
  await page.waitForFunction(
    () => document.querySelector('[data-testid="recommendation-validity-preset"]')?.value === "6",
  );
  await page.locator('input[type="number"]').first().fill("7");
  await waitDraftPersisted(page);
}

async function waitCreateFormReady(page) {
  await page.goto(`${PROF}/recommendations/new`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByTestId("recommendation-validity-preset").waitFor({ state: "visible", timeout: 60_000 });
  await waitDraftScopeReady(page);
}

async function gotoProfileFocus(page, focus) {
  const href = `/profile?returnTo=${encodeURIComponent("/recommendations/new")}&section=basics&focus=${focus}`;
  await page.goto(`${PROF}${href}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.getByRole("tab", { name: /Основные данные/i }).waitFor({ timeout: 30_000 });
}

async function ensureDirectionChip(page, token) {
  const service = fetchFirstService(token);
  await page.goto(`${PROF}/profile?section=basics`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const chipVisible = await page
    .locator("ul[aria-label='Выбранные направления'] button")
    .first()
    .isVisible()
    .catch(() => false);
  if (!chipVisible) {
    const services = page.getByRole("group", { name: "Работы и услуги" });
    const box = services.getByRole("checkbox", { name: service.label });
    if (!(await box.isChecked())) await box.check();
    const patchWait = page.waitForResponse(
      (r) => r.url().includes("/api/pro/profile") && r.request().method() === "PATCH",
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: "Сохранить основные данные" }).click();
    const patchRes = await patchWait;
    if (patchRes.status() !== 200) throw new Error(`basics PATCH ${patchRes.status()}`);
  }
}

function fetchFirstService(token) {
  const out = execFileSync(
    "curl",
    ["-s", "-H", `Cookie: remcard-token=${token}`, "-H", `Origin: ${PROF}`, `${PROF}/api/remcard/api/pro/partner-taxonomy`],
    { encoding: "utf8" },
  );
  const data = JSON.parse(out);
  const service = data.services?.find((s) => s?.id && s?.label);
  if (!service) throw new Error("no services in taxonomy");
  return service;
}

async function profileSnapshot(token) {
  const out = execFileSync(
    "curl",
    ["-s", "-H", `Cookie: remcard-token=${token}`, "-H", `Origin: ${PROF}`, `${PROF}/api/remcard/api/pro/profile`],
    { encoding: "utf8" },
  );
  return JSON.parse(out);
}

let fixtures = null;
let cleanupError = null;

try {
  verifySmokeStack();

  fixtures = JSON.parse(
    execSync(`cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-recommendation-browser-fixtures.ts seed`, {
      encoding: "utf8",
    }).trim(),
  );

  const browser = await chromium.launch({ headless: true });

  await run("notification_generator_url", async () => {
    const url = generatorPartnershipUrl(fixtures.partnershipSpecId);
    const expected = `${PROF}/partners?terms=${encodeURIComponent(fixtures.partnershipSpecId)}`;
    if (url !== expected) throw new Error(`generator ${url} !== ${expected}`);
    report.assertions.notificationGeneratorUrl = url;
    return { url };
  });

  await run("partnership_terms_authenticated", async () => {
    const url = generatorPartnershipUrl(fixtures.partnershipSpecId);
    const ctx = await browser.newContext({ extraHTTPHeaders: { Origin: PROF } });
    const token = mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    await page.getByText(fixtures.storeName).waitFor({ timeout: 30_000 });
    await page.getByText("Действующие условия").waitFor();
    await page.getByRole("cell", { name: "10%" }).waitFor();
    await page.screenshot({ path: path.join(OUT, "partnership-terms-auth.png"), fullPage: true });
    await ctx.close();
  });

  await run("partnership_login_gate_and_synthetic_return", async () => {
    const expectedReturnTo = expectedPartnersReturnTo(fixtures.partnershipSpecId);
    const url = generatorPartnershipUrl(fixtures.partnershipSpecId);
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 120_000 });
    const loginVisible = await page.getByRole("heading", { name: /Вход|войти/i }).count();
    const authFlow = await page.getByText(/код|Telegram|MAX/i).count();
    if (loginVisible + authFlow === 0) throw new Error("expected login gate UI");

    const extracted = await extractReturnToFromGatePage(page);
    assertReturnToMatchesPartnership(extracted.returnTo, fixtures.partnershipSpecId);
    if (extracted.returnTo !== expectedReturnTo) {
      throw new Error(`returnTo ${extracted.returnTo} !== expected ${expectedReturnTo}`);
    }

    report.assertions.loginGate = {
      observedUrl: extracted.observedUrl,
      expectedReturnTo,
      extractedReturnTo: extracted.returnTo,
      extractSource: extracted.source,
    };
    report.notVerified.push(
      "external_MAX_Telegram_OTP: NOT VERIFIED — synthetic JWT after gate is not login E2E",
    );

    const token = mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    await page.goto(`${PROF}${extracted.returnTo}`, { waitUntil: "networkidle" });
    await page.getByText(fixtures.storeName).waitFor({ timeout: 30_000 });
    await page.getByText("Действующие условия").waitFor();
    await page.getByRole("cell", { name: `${fixtures.ownTermsPercent}%` }).waitFor();
    await page.screenshot({ path: path.join(OUT, "partnership-after-synthetic-auth.png"), fullPage: true });
    await ctx.close();
    return report.assertions.loginGate;
  });

  await run("partnership_foreign_id_no_leak", async () => {
    const ownId = fixtures.partnershipSpecId;
    const foreignId = fixtures.partnershipForeignId;
    const bogus = "00000000-0000-4000-8000-000000000099";
    const token = mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion);
    const evidence = {
      ownPartnershipId: ownId,
      foreignPartnershipId: foreignId,
      bogusPartnershipId: bogus,
      foreignStoreName: fixtures.foreignStoreName,
      foreignTermsMarker: `${fixtures.foreignTermsPercent}%`,
    };

    const listOwn = curlJsonWithStatus("/api/partnership/list", token);
    evidence.listStatus = listOwn.status;
    if (listOwn.status !== 200) throw new Error(`list API ${listOwn.status}`);
    const ownRow = (listOwn.json?.partnerships ?? []).find((p) => p.id === ownId);
    if (!ownRow) throw new Error("own partnership missing from list API");
    if (jsonContainsForeignPartnership(listOwn.json, foreignId, fixtures.foreignStoreName)) {
      throw new Error("list API leaked foreign partnership");
    }

    const termOwn = curlJsonWithStatus(`/api/partnerships/${ownId}/term-change`, token);
    evidence.ownTermChangeStatus = termOwn.status;

    const ctx = await browser.newContext({ extraHTTPHeaders: { Origin: PROF } });
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    const page = await ctx.newPage();

    await page.goto(`${PROF}/partners?terms=${encodeURIComponent(ownId)}`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: fixtures.storeName, level: 3 }).waitFor({ timeout: 30_000 });
    await page.getByRole("cell", { name: `${fixtures.ownTermsPercent}%` }).waitFor();
    evidence.ownDomTermsVisible = true;

    const termForeign = curlJsonWithStatus(`/api/partnerships/${foreignId}/term-change`, token);
    evidence.foreignTermChangeStatus = termForeign.status;
    if (termForeign.status === 200 && jsonContainsForeignPartnership(termForeign.json, foreignId, fixtures.foreignStoreName)) {
      const termsText = JSON.stringify(termForeign.json);
      if (termsText.includes(String(fixtures.foreignTermsPercent))) {
        throw new Error("foreign term-change API returned foreign conditions");
      }
    }
    if (jsonContainsForeignPartnership(termForeign.json, foreignId, fixtures.foreignStoreName) && termForeign.status === 200) {
      throw new Error("foreign term-change API body references foreign partnership data");
    }

    await page.goto(`${PROF}/partners?terms=${encodeURIComponent(foreignId)}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const foreignHeading = page.getByRole("heading", { name: fixtures.foreignStoreName, level: 3 });
    const foreignPercent = page.getByRole("cell", { name: `${fixtures.foreignTermsPercent}%` });
    const foreignLabel = page.getByRole("cell", { name: fixtures.foreignTermsLabel });
    evidence.foreignDomStoreHeadings = await foreignHeading.count();
    evidence.foreignDomPercentCells = await foreignPercent.count();
    evidence.foreignDomLabelCells = await foreignLabel.count();
    if (evidence.foreignDomStoreHeadings > 0 || evidence.foreignDomPercentCells > 0) {
      throw new Error("foreign partnership conditions visible in DOM");
    }
    const pageText = await page.locator("body").innerText();
    if (pageText.includes(fixtures.foreignStoreName) && pageText.includes(`${fixtures.foreignTermsPercent}%`)) {
      throw new Error("foreign store marker and percent leaked in page text");
    }

    await page.goto(`${PROF}/partners?terms=${encodeURIComponent(bogus)}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const termBogus = curlJsonWithStatus(`/api/partnerships/${bogus}/term-change`, token);
    evidence.bogusTermChangeStatus = termBogus.status;
    if (termBogus.status === 200) {
      throw new Error("bogus partnership term-change returned 200");
    }
    if (jsonContainsForeignPartnership(termBogus.json, foreignId, fixtures.foreignStoreName)) {
      throw new Error("bogus id response leaked foreign partnership");
    }
    const bogusForeignHeading = await page.getByRole("heading", { name: fixtures.foreignStoreName, level: 3 }).count();
    const bogusForeignPct = await page.getByRole("cell", { name: `${fixtures.foreignTermsPercent}%` }).count();
    evidence.bogusDomForeignHeadings = bogusForeignHeading;
    evidence.bogusDomForeignPercent = bogusForeignPct;
    if (bogusForeignHeading > 0 || bogusForeignPct > 0) {
      throw new Error("bogus terms query showed foreign conditions");
    }

    await ctx.close();
    report.assertions.partnershipForeignIdNoLeak = evidence;
    return evidence;
  });

  await run("specialization_master_390_dark", async () => {
    const service = fetchFirstService(mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion));
    const before = await profileSnapshot(mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion));
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      extraHTTPHeaders: { Origin: PROF },
    });
    const token = mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    const page = await ctx.newPage();
    await waitCreateFormReady(page);
    await fillPartnerAndTerms(page);
    await page.getByTestId("recommendation-issuer-readiness").waitFor({ timeout: 30_000 });
    await gotoProfileFocus(page, "directions");
    const dir = page.locator('[data-profile-focus="directions"]');
    const services = dir.getByRole("group", { name: "Работы и услуги" });
    await services.getByRole("checkbox", { name: service.label }).check();
    const patchWait = page.waitForResponse(
      (r) => r.url().includes("/api/pro/profile") && r.request().method() === "PATCH",
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: "Сохранить основные данные" }).click();
    const patchRes = await patchWait;
    const body = patchRes.request().postDataJSON();
    if (!body?.serviceSpecializationIds?.includes(service.id)) {
      throw new Error("PATCH missing service specialization");
    }
    if (body?.productCategoryIds?.length) throw new Error("unexpected products in PATCH");
    if (body?.partnerActivities?.includes("AGENT")) throw new Error("AGENT must stay off");
    await page.goto(`${PROF}/recommendations/new`, { waitUntil: "domcontentloaded" });
    await waitCreateFormReady(page);
    if ((await page.getByTestId("recommendation-validity-preset").inputValue()) !== "6") {
      throw new Error("draft validity lost");
    }
    const postWait = page.waitForResponse(
      (r) => r.url().includes("/api/store/certificate") && r.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: "Создать рекомендацию" }).click();
    const postRes = await postWait;
    if (postRes.status() !== 201) throw new Error(`POST ${postRes.status()}`);
    const cert = await postRes.json();
    if (!cert.id) throw new Error("missing cert id");
    await page.getByTestId("recommendation-create-success").waitFor();
    assertCertInPg(cert.id);
    const after = await profileSnapshot(token);
    if (after.user?.catalogStatus !== before.user?.catalogStatus) {
      throw new Error("catalogStatus changed");
    }
    if (after.user?.isPublic !== before.user?.isPublic) {
      throw new Error("isPublic changed");
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    if (overflow) throw new Error("overflow on recommendation form");
    await page.screenshot({ path: path.join(OUT, "recommendation-spec-success-390-dark.png"), fullPage: true });
    report.assertions.specCertificateId = cert.id;
    await ctx.close();
  });

  await run("agent_activity_path", async () => {
    const before = await profileSnapshot(mint(fixtures.issuerId, fixtures.issuerTokenVersion));
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { Origin: PROF } });
    const token = mint(fixtures.issuerId, fixtures.issuerTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    const page = await ctx.newPage();
    await waitCreateFormReady(page);
    await fillPartnerAndTerms(page);
    await gotoProfileFocus(page, "agentActivity");
    await page.getByTestId("profile-agent-activity").check();
    const agentPatch = page.waitForResponse(
      (r) => r.url().includes("/api/pro/profile") && r.request().method() === "PATCH",
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: "Сохранить основные данные" }).click();
    const agentPatchRes = await agentPatch;
    if (agentPatchRes.status() !== 200) throw new Error(`agent profile PATCH ${agentPatchRes.status()}`);
    await page.goto(`${PROF}/recommendations/new`, { waitUntil: "domcontentloaded" });
    await waitCreateFormReady(page);
    const postWait = page.waitForResponse(
      (r) => r.url().includes("/api/store/certificate") && r.request().method() === "POST",
      { timeout: 60_000 },
    );
    await page.getByRole("button", { name: "Создать рекомендацию" }).click();
    const postRes = await postWait;
    if (postRes.status() !== 201) throw new Error(`agent POST ${postRes.status()}`);
    const cert = await postRes.json();
    assertCertInPg(cert.id);
    await page.getByTestId("recommendation-create-success").waitFor();
    const after = await profileSnapshot(token);
    if (after.user?.catalogStatus !== before.user?.catalogStatus) throw new Error("catalogStatus changed");
    report.assertions.agentCertificateId = cert.id;
    await ctx.close();
  });

  await run("directions_contrast_basics_390_dark", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      extraHTTPHeaders: { Origin: PROF },
    });
    const token = mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    const page = await ctx.newPage();
    await ensureDirectionChip(page, token);
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    const chip = await chipContrastOnProfile(page);
    if (chip.ratio < 4.5) throw new Error(`chip contrast ${chip.ratio}`);
    const lead = page.getByText(/Выберите товары, которые продаёте/i);
    const leadStyles = await lead.evaluate((el) => {
      const s = getComputedStyle(el);
      return { color: s.color, backgroundColor: getComputedStyle(el.parentElement).backgroundColor };
    });
    const lfg = parseRgb(leadStyles.color);
    const lbg = parseRgb(leadStyles.backgroundColor);
    const leadRatio = contrastRatio(lfg, lbg);
    if (leadRatio < 4.5) throw new Error(`lead contrast ${leadRatio}`);
    await page.getByRole("button", { name: /Убрать/i }).first().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, "directions-basics-390-dark.png"), fullPage: true });
    await ctx.close();
    return { chip, leadRatio };
  });

  await run("directions_contrast_basics_1440_light_toggle", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      extraHTTPHeaders: { Origin: PROF },
    });
    const token = mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    const page = await ctx.newPage();
    await ensureDirectionChip(page, token);
    let chip = await chipContrastOnProfile(page);
    if (chip.ratio < 4.5) throw new Error(`light chip ${chip.ratio}`);
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    chip = await chipContrastOnProfile(page);
    if (chip.ratio < 4.5) throw new Error(`toggled dark chip ${chip.ratio}`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    if (overflow) throw new Error("profile basics overflow");
    await page.screenshot({ path: path.join(OUT, "directions-basics-1440-light-dark-toggle.png"), fullPage: true });
    await ctx.close();
  });

  await run("directions_catalog_moderation_dark", async () => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      colorScheme: "dark",
      extraHTTPHeaders: { Origin: PROF },
    });
    const token = mint(fixtures.issuerSpecId, fixtures.issuerSpecTokenVersion);
    await ctx.addCookies([{ name: "remcard-token", value: token, url: PROF }]);
    const page = await ctx.newPage();
    await ensureDirectionChip(page, token);
    await page.goto(`${PROF}/profile?section=catalog&moderation=1`, { waitUntil: "domcontentloaded" });
    const prep = page.getByRole("button", { name: /Подготовить профиль к публикации/i });
    if (await prep.isVisible().catch(() => false)) await prep.click();
    const copy = page.getByRole("button", { name: /Перенести направления/i });
    if (await copy.isVisible().catch(() => false)) await copy.click();
    const chip = await chipContrastOnProfile(page);
    if (chip.ratio < 4.5) throw new Error(`catalog chip ${chip.ratio}`);
    await page.screenshot({ path: path.join(OUT, "directions-catalog-390-dark.png"), fullPage: true });
    await ctx.close();
  });

  await browser.close();
} catch (e) {
  report.scenarios.bootstrap = { status: "FAIL", error: String(e) };
  report.exitCode = 1;
} finally {
  if (fixtures?.tag) {
    try {
      execSync(
        `cd ${NAV_ROOT} && pnpm exec tsx scripts/prof-recommendation-browser-fixtures.ts cleanup ${fixtures.tag}`,
        { stdio: "pipe" },
      );
    } catch (e) {
      cleanupError = e instanceof Error ? e.message : String(e);
      report.exitCode = 1;
    }
  }
  if (cleanupError) report.cleanupError = cleanupError;
  writeFileSync(path.join(OUT, "prof-combined-rc-smoke.json"), JSON.stringify(report, null, 2));
}

process.exit(report.exitCode);
