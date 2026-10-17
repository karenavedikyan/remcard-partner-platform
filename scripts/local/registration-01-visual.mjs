#!/usr/bin/env node
/**
 * REGISTRATION-01 visual pairs: frozen prototype ref + platform impl.
 * Run AFTER committing capture code (records exact git SHA).
 *
 * Welcome on `/` is SSR-gated: start platform dev with
 *   REGISTRATION_SSR_WELCOME=1
 * (see capabilities-server.ts). Playwright route mocks do not affect SSR.
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
const REFERENCE_SHA_IMMUTABLE =
  process.env.REGISTRATION_REF_SHA ?? "771cc658a415a5d05b964f29f675d32db449198b";
const VISUAL_01_5 = process.env.REGISTRATION_VISUAL_01_5 === "1";

const CODE_SHA = execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();
const RUNNER_SHA = CODE_SHA;
const TREE_DIRTY =
  execSync("git status --porcelain", { cwd: ROOT, encoding: "utf8" }).trim().length > 0;
const REF_SHA = execSync(`git -C "${NAV_REPO}" rev-parse ${REF_BRANCH}`, {
  encoding: "utf8",
}).trim();

const DEV_OVERLAY_HIDE = `
  nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog],
  #webpack-dev-server-client-overlay, .nextjs-toast-errors-parent { display: none !important; }
`;

const PROTO_DEMO_HIDE = `
  .demo-top, .mobile-demo-settings, .review-toolbar, .entry-disclaimer,
  details.review-details, #review, .review-details {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    max-height: 0 !important;
    overflow: hidden !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
  }
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
    document.documentElement.dataset.theme = t;
  }, theme);
}

async function applyPrototypeTheme(page, theme) {
  await page.emulateMedia({ colorScheme: theme });
  for (let attempt = 0; attempt < 4; attempt++) {
    const current = await page.evaluate(
      () => document.documentElement.getAttribute("data-theme") || "light",
    );
    if (current === theme) break;
    const toggle = page.locator('[data-action="theme"]');
    if (await toggle.count()) {
      await toggle.click();
      await page.waitForTimeout(theme === "dark" ? 350 : 150);
    } else break;
  }
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.dataset.theme = t;
  }, theme);
}

async function mockAuthGuest(page) {
  await page.route("**/api/remcard/api/auth/me**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ user: null }),
    });
  });
}

async function mockRegistrationCapabilities(page) {
  await page.route("**/api/remcard/api/pro/registration/capabilities**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        contractVersion: "2026-10-17.registration-01",
        welcomeEnabled: true,
        agentRegistrationPathEnabled: true,
        legacyLoginPathEnabled: true,
      }),
    });
  });
}

async function hideDevChrome(page) {
  await page.addStyleTag({ content: DEV_OVERLAY_HIDE });
  await page.evaluate(() => {
    const hideHost = (host) => {
      if (!host?.shadowRoot) return;
      const style = document.createElement("style");
      style.textContent =
        "nextjs-portal, [data-nextjs-toast], [data-nextjs-dialog] { display: none !important; }";
      host.shadowRoot.appendChild(style);
    };
    hideHost(document.querySelector("nextjs-portal"));
    document.querySelectorAll("nextjs-portal").forEach(hideHost);
  });
}

async function assertDevChromeHidden(page) {
  const visible = await page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    if (!portal) return false;
    const rect = portal.getBoundingClientRect();
    const style = getComputedStyle(portal);
    return rect.width > 0 && rect.height > 0 && style.display !== "none";
  });
  if (visible) throw new Error("Next dev overlay still visible before capture");
}

async function waitForCaptureStabilization(page, theme, kind, step) {
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(theme === "dark" ? 450 : 200);
  if (step !== "types") return;
  const cardSelector =
    kind === "reference" ? ".role-card" : '[data-testid="registration-types-grid"] label';
  await page.waitForSelector(cardSelector, { timeout: 30_000 });
  await page.waitForFunction(
    ({ sel, isDark }) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      const bg = getComputedStyle(el).backgroundColor;
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!m) return !isDark;
      const [r, g, b] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (!isDark) return true;
      // Reject transient unreadable pale cards; accept settled dark surfaces.
      if (r > 190 && g > 190 && b > 190) return false;
      return r <= 80 && g <= 80 && b <= 80;
    },
    { sel: cardSelector, isDark: theme === "dark" },
    { timeout: 20_000 },
  );
}

async function measureProgressRow(page, kind) {
  return page.evaluate((sourceKind) => {
    const list =
      document.querySelector('ol[aria-label="Этапы регистрации"]') ??
      document.querySelector(".entry-progress");
    if (!list) return null;
    const items = [...list.querySelectorAll("li")];
    const stageTops = items.map((li) => {
      const marker = li.querySelector("span");
      const box = (marker ?? li).getBoundingClientRect();
      return Math.round(box.top * 1000) / 1000;
    });
    const listStyle = getComputedStyle(list);
    return {
      display: listStyle.display,
      gridTemplateColumns: listStyle.gridTemplateColumns,
      stageTops,
      stageTopSpread:
        stageTops.length > 0 ? Math.max(...stageTops) - Math.min(...stageTops) : null,
    };
  }, kind);
}

async function measureTypesLayout(page, kind) {
  return page.evaluate((sourceKind) => {
    const grid =
      sourceKind === "reference"
        ? document.querySelector(".role-grid")
        : document.querySelector('[data-testid="registration-types-grid"]');
    const h1 = document.querySelector(".intro h1, .typesIntro h1, h1");
    const card =
      sourceKind === "reference"
        ? document.querySelector(".role-card")
        : document.querySelector('[data-testid="registration-types-grid"] label');
    const gridBox = grid?.getBoundingClientRect();
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const gridStyle = grid ? getComputedStyle(grid) : null;
    const cardStyle = card ? getComputedStyle(card) : null;
    const cols = gridStyle?.gridTemplateColumns?.split(/\s+/).filter(Boolean) ?? [];
    return {
      grid: gridBox
        ? {
            x: Math.round(gridBox.x * 100) / 100,
            width: Math.round(gridBox.width * 100) / 100,
            columnCount: cols.length,
            columnWidthsPx: cols.map((c) => Math.round(parseFloat(c) || 0)),
            gridTemplateColumns: gridStyle?.gridTemplateColumns ?? null,
          }
        : null,
      h1: h1Style
        ? {
            fontSizePx: Math.round(parseFloat(h1Style.fontSize) * 100) / 100,
            lineHeight: h1Style.lineHeight,
          }
        : null,
      card: cardStyle
        ? {
            backgroundColor: cardStyle.backgroundColor,
            color: cardStyle.color,
            display: cardStyle.display,
            flexDirection: cardStyle.flexDirection,
            minHeight: cardStyle.minHeight,
          }
        : null,
    };
  }, kind);
}

function assertMobileGridParity(refMeasure, implMeasure, width) {
  if (![375, 320].includes(width) || !refMeasure?.grid || !implMeasure?.grid) return [];
  const failures = [];
  const tol = 1;
  for (const [label, refVal, implVal] of [
    ["grid.x", refMeasure.grid.x, implMeasure.grid.x],
    ["grid.width", refMeasure.grid.width, implMeasure.grid.width],
  ]) {
    if (Math.abs(refVal - implVal) > tol) {
      failures.push(`${width}:${label}: ref=${refVal} impl=${implVal} (tol ${tol}px)`);
    }
  }
  return failures;
}

function parseRgbTriplet(cssColor) {
  const m = cssColor?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function rgbClose(a, b, tol = 2) {
  if (!a || !b) return false;
  return a.every((v, i) => Math.abs(v - b[i]) <= tol);
}

async function resetPointerFromButtons(page) {
  await page.mouse.move(8, 8);
  await page.waitForTimeout(220);
}

async function measurePrimaryProviderButton(page, kind = "implementation") {
  const btn =
    kind === "reference"
      ? page.locator(".entry-providers .btn.primary, .entry-providers .btn").first()
      : page.locator('[data-testid="registration-entry-auth-providers"]').getByRole("button").first();
  if ((await btn.count()) === 0) return null;
  const normal = await btn.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, fg: s.color };
  });
  await btn.hover();
  await page.waitForTimeout(120);
  const hoverBg = await btn.evaluate((el) => getComputedStyle(el).backgroundColor);
  await resetPointerFromButtons(page);
  return { ...normal, hoverBg };
}

async function measureDataFormGeometry(page, kind) {
  return page.evaluate((sourceKind) => {
    const round = (n) => Math.round(n * 100) / 100;
    const boxOf = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: round(r.x), y: round(r.y), width: round(r.width), height: round(r.height) };
    };
    let shell = null;
    let grid = null;
    if (sourceKind === "reference") {
      shell = document.querySelector("main.registration.entry-page, main.registration");
      grid = document.querySelector(".form-layout");
    } else {
      shell =
        document.querySelector('[data-testid="registration-entry-data"]')?.parentElement ??
        document.querySelector('[data-testid="registration-entry-auth-providers"]')?.closest("div");
      grid = document.querySelector('[data-testid="registration-entry-data"]')?.children[1] ?? null;
    }
    const gridChildren = grid ? [...grid.children] : [];
    const mainPanel = gridChildren[0] ?? null;
    const asidePanel = gridChildren[1] ?? null;
    const gridStyle = grid ? getComputedStyle(grid) : null;
    const colParts =
      gridStyle?.gridTemplateColumns?.split(/\s+/).map((c) => parseFloat(c)).filter((n) => n > 0) ??
      [];
    return {
      shell: boxOf(shell),
      grid: boxOf(grid),
      mainPanel: boxOf(mainPanel),
      asidePanel: boxOf(asidePanel),
      gridGapPx: gridStyle ? round(parseFloat(gridStyle.gap) || 0) : null,
      columnRatio:
        colParts.length === 2 ? round((colParts[0] / colParts[1]) * 1000) / 1000 : null,
      gridTemplateColumns: gridStyle?.gridTemplateColumns ?? null,
    };
  }, kind);
}

async function measureAuthProvidersTitle(page, kind) {
  return page.evaluate((sourceKind) => {
    const h1 =
      sourceKind === "reference"
        ? document.querySelector(".entry-single h1, main h1")
        : document.querySelector("#reg-auth-title");
    if (!h1) return null;
    const style = getComputedStyle(h1);
    const lh = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    return {
      fontSizePx: Math.round(parseFloat(style.fontSize) * 100) / 100,
      lineHeightPx: Math.round(lh * 100) / 100,
      lines: Math.round(h1.getBoundingClientRect().height / lh),
      widthPx: Math.round(h1.getBoundingClientRect().width),
    };
  }, kind);
}

async function measureMobileEntryCard(page, kind) {
  return page.evaluate((sourceKind) => {
    const panel =
      sourceKind === "reference"
        ? document.querySelector(".form-layout > section, .entry-single")
        : document.querySelector(
            '[data-testid="registration-entry-data"] section, [data-testid="registration-entry-auth-providers"]',
          );
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return {
      x: Math.round(r.x * 100) / 100,
      width: Math.round(r.width * 100) / 100,
      viewportWidth: window.innerWidth,
    };
  }, kind);
}

async function measureProgressTextLayout(page, kind) {
  return page.evaluate(() => {
    const list =
      document.querySelector('ol[aria-label="Этапы регистрации"]') ??
      document.querySelector(".entry-progress");
    if (!list) return null;
    const vw = window.innerWidth;
    const items = [...list.querySelectorAll("li")].map((li, index) => {
      const span = li.querySelector("span");
      const style = getComputedStyle(li);
      let labelBox = null;
      if (span) {
        const range = document.createRange();
        range.selectNodeContents(li);
        range.setStartAfter(span);
        const rect = range.getBoundingClientRect();
        labelBox = {
          x: Math.round(rect.x * 100) / 100,
          y: Math.round(rect.y * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
          right: Math.round(rect.right * 100) / 100,
          bottom: Math.round(rect.bottom * 100) / 100,
        };
      }
      const lh = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
      return {
        index,
        fontSizePx: Math.round(parseFloat(style.fontSize) * 100) / 100,
        lineHeightPx: Math.round(lh * 100) / 100,
        labelBox,
      };
    });
    const overlaps = [];
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i].labelBox;
        const b = items[j].labelBox;
        if (!a || !b) continue;
        const separated =
          a.right <= b.x + 0.5 ||
          b.right <= a.x + 0.5 ||
          a.bottom <= b.y + 0.5 ||
          b.bottom <= a.y + 0.5;
        if (!separated) overlaps.push([i, j]);
      }
    }
    const outOfViewport = items
      .filter((it) => it.labelBox && (it.labelBox.x < -0.5 || it.labelBox.right > vw + 0.5))
      .map((it) => it.index);
    const listBox = list.getBoundingClientRect();
    const containerRight = Math.round(listBox.right * 100) / 100;
    const containerLeft = Math.round(listBox.left * 100) / 100;
    const horizontalGaps = [];
    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i].labelBox;
      const b = items[i + 1].labelBox;
      if (a && b) {
        horizontalGaps.push(Math.round((b.x - a.right) * 100) / 100);
      }
    }
    const lastLabel = items[items.length - 1]?.labelBox;
    const lastLabelOverflowPx = lastLabel
      ? Math.round((lastLabel.right - containerRight) * 100) / 100
      : null;
    const firstLabel = items[0]?.labelBox;
    const firstLabelUnderflowPx = firstLabel
      ? Math.round((containerLeft - firstLabel.x) * 100) / 100
      : null;
    return {
      items,
      overlaps,
      outOfViewport,
      containerRight,
      containerLeft,
      horizontalGaps,
      lastLabelOverflowPx,
      firstLabelUnderflowPx,
    };
  }, kind);
}

async function measureFormFooterRow(page) {
  return page.evaluate(() => {
    const footer = document.querySelector('[class*="formFooter"]');
    if (!footer) return null;
    const buttons = [...footer.querySelectorAll("button")];
    const tops = buttons.map((b) => Math.round(b.getBoundingClientRect().top));
    return {
      tops,
      singleRow:
        tops.length <= 1 || Math.max(...tops) - Math.min(...tops) <= 1,
    };
  });
}

async function measureQuestionTitleTypography(page, kind) {
  return page.evaluate((sourceKind) => {
    const h1 =
      sourceKind === "reference"
        ? document.querySelector(".form-layout h1")
        : document.querySelector('[data-testid="registration-entry-data"] h1');
    if (!h1) return null;
    const style = getComputedStyle(h1);
    return {
      fontSizePx: Math.round(parseFloat(style.fontSize) * 100) / 100,
      lineHeight: style.lineHeight,
      fontWeight: style.fontWeight,
    };
  }, kind);
}

async function measureProgressLabelLines(page, kind) {
  return page.evaluate(() => {
    const list =
      document.querySelector('ol[aria-label="Этапы регистрации"]') ??
      document.querySelector(".entry-progress");
    if (!list) return null;
    return [...list.querySelectorAll("li")].map((li) => {
      const marker = li.querySelector("span");
      const style = getComputedStyle(li);
      const fontSize = parseFloat(style.fontSize) || 12;
      const lh = parseFloat(style.lineHeight) || fontSize * 1.2;
      let labelHeight = 0;
      if (marker) {
        const range = document.createRange();
        range.selectNodeContents(li);
        range.setStartAfter(marker);
        labelHeight = range.getBoundingClientRect().height;
      }
      const lines = Math.max(1, Math.round(labelHeight / lh));
      return { lines, labelHeightPx: Math.round(labelHeight) };
    });
  }, kind);
}

async function measureDataPanelHeader(page) {
  return page.evaluate(() => {
    const hint = document.querySelector('[class*="stepHint"]');
    const row = hint?.closest('[class*="panelHeaderRow"]');
    if (!hint || !row) return null;
    const hintBox = hint.getBoundingClientRect();
    const rowBox = row.getBoundingClientRect();
    const eyebrow = row.querySelector('[class*="eyebrow"]');
    const eyebrowBox = eyebrow?.getBoundingClientRect();
    return {
      hintLeft: Math.round(hintBox.left),
      rowLeft: Math.round(rowBox.left),
      hintBelowEyebrow: eyebrowBox ? hintBox.top > eyebrowBox.bottom - 1 : null,
      hintMarginLeftAuto: hint ? getComputedStyle(hint).marginLeft === "auto" : null,
    };
  });
}

async function measureProgressMarkers(page) {
  return page.evaluate(() => {
    const list =
      document.querySelector('ol[aria-label="Этапы регистрации"]') ??
      document.querySelector(".entry-progress");
    if (!list) return null;
    return [...list.querySelectorAll("li > span")].map((el) => el.textContent?.trim() ?? "");
  });
}

async function measureCityFieldFocus(page) {
  return page.evaluate(() => {
    const input =
      document.querySelector('[data-testid="registration-entry-data"] input') ??
      document.querySelector("#entry-data-input");
    if (!input) return null;
    const style = getComputedStyle(input);
    const value = input.value ?? "";
    const shadow = style.boxShadow;
    const hasFocusRing = document.activeElement === input && shadow && shadow !== "none";
    return { value, hasFocusRing, activeIsInput: document.activeElement === input };
  });
}

function assertBoxParity(label, refBox, implBox, tol = 4) {
  if (!refBox || !implBox) return [`${label}: missing geometry`];
  const failures = [];
  for (const key of ["x", "y", "width", "height"]) {
    const d = Math.abs(refBox[key] - implBox[key]);
    if (d > tol) failures.push(`${label}.${key}: ref=${refBox[key]} impl=${implBox[key]} (tol ${tol}px)`);
  }
  return failures;
}

function assertRegistrationCssGates({ step, theme, width, refMetrics, implMetrics }) {
  const failures = [];
  if (!implMetrics) return failures;

  if (step === "auth-providers" && theme === "dark" && refMetrics?.providerBtn && implMetrics?.providerBtn) {
    for (const key of ["bg", "fg"]) {
      const refRgb = parseRgbTriplet(refMetrics.providerBtn[key]);
      const implRgb = parseRgbTriplet(implMetrics.providerBtn[key]);
      if (!rgbClose(refRgb, implRgb, 3)) {
        failures.push(
          `${width}:provider-btn-${key}: ref=${refMetrics.providerBtn[key]} impl=${implMetrics.providerBtn[key]}`,
        );
      }
    }
  }

  if (step === "data-name" && width === 1440 && refMetrics?.formGeometry && implMetrics?.formGeometry) {
    const refShell = refMetrics.formGeometry.shell;
    const implShell = implMetrics.formGeometry.shell;
    if (refShell && implShell) {
      for (const key of ["x", "width"]) {
        if (Math.abs(refShell[key] - implShell[key]) > 8) {
          failures.push(`shell.${key}: ref=${refShell[key]} impl=${implShell[key]} (tol 8px)`);
        }
      }
    }
    const refGrid = refMetrics.formGeometry.grid;
    const implGrid = implMetrics.formGeometry.grid;
    if (refGrid && implGrid && refShell && implShell) {
      const refRelY = refGrid.y - refShell.y;
      const implRelY = implGrid.y - implShell.y;
      if (Math.abs(refRelY - implRelY) > 10) {
        failures.push(`grid.relY: ref=${refRelY} impl=${implRelY} (tol 10px)`);
      }
      if (Math.abs(refGrid.width - implGrid.width) > 10) {
        failures.push(`grid.width: ref=${refGrid.width} impl=${implGrid.width}`);
      }
    }
    for (const panelKey of ["mainPanel", "asidePanel"]) {
      const r = refMetrics.formGeometry[panelKey];
      const i = implMetrics.formGeometry[panelKey];
      if (!r || !i) continue;
      if (Math.abs(r.width - i.width) > 14) {
        failures.push(`${panelKey}.width: ref=${r.width} impl=${i.width}`);
      }
      if (Math.abs(r.height - i.height) > 24) {
        if (VISUAL_01_5 && panelKey === "asidePanel") {
          /* Desktop aside rhythm not in 01.5 progress regression scope; see documentedExceptions. */
        } else {
          failures.push(`${panelKey}.height: ref=${r.height} impl=${i.height}`);
        }
      }
    }
    if (refMetrics.questionTitle && implMetrics.questionTitle) {
      if (
        Math.abs(refMetrics.questionTitle.fontSizePx - implMetrics.questionTitle.fontSizePx) > 1.5
      ) {
        failures.push(
          `1440:questionTitle-font: ref=${refMetrics.questionTitle.fontSizePx}px impl=${implMetrics.questionTitle.fontSizePx}px`,
        );
      }
    }
    const refRatio = refMetrics.formGeometry.columnRatio;
    const implRatio = implMetrics.formGeometry.columnRatio;
    if (refRatio != null && implRatio != null && Math.abs(refRatio - implRatio) > 0.06) {
      failures.push(`1440:formGrid ratio: ref=${refRatio} impl=${implRatio}`);
    }
    const refGap = refMetrics.formGeometry.gridGapPx;
    const implGap = implMetrics.formGeometry.gridGapPx;
    if (refGap != null && implGap != null && Math.abs(refGap - implGap) > 2) {
      failures.push(`1440:formGrid gap: ref=${refGap} impl=${implGap}`);
    }
  }

  if (step.startsWith("data") && [375, 320].includes(width) && implMetrics.progressMarkers) {
    if (!implMetrics.progressMarkers.some((t) => t === "✓")) {
      failures.push(`${width}:${step}:progress missing completed checkmark`);
    }
  }

  if (step.startsWith("data") && [375, 320].includes(width) && implMetrics.progressRow) {
    const spread = implMetrics.progressRow.stageTopSpread ?? 0;
    if (spread > 1) {
      failures.push(`${width}:${step}:progress stageTopSpread=${spread}`);
    }
  }

  if (
    step.startsWith("data") &&
    refMetrics?.progressLabels &&
    implMetrics?.progressLabels
  ) {
    for (let i = 0; i < refMetrics.progressLabels.length; i++) {
      const refL = refMetrics.progressLabels[i]?.lines ?? 1;
      const implL = implMetrics.progressLabels[i]?.lines ?? 1;
      if (refL !== implL) {
        failures.push(`${width}:${step}:progress label[${i}] lines ref=${refL} impl=${implL}`);
      }
    }
  }

  const progressLayout = implMetrics?.progressTextLayout;
  const refProgressLayout = refMetrics?.progressTextLayout;
  if ([375, 320].includes(width) && progressLayout) {
    if (progressLayout.overlaps?.length) {
      failures.push(`${width}:${step}:progress label overlaps ${JSON.stringify(progressLayout.overlaps)}`);
    }
    if (progressLayout.outOfViewport?.length) {
      failures.push(`${width}:${step}:progress label outOfViewport ${progressLayout.outOfViewport.join(",")}`);
    }
  }
  if ([375, 320].includes(width) && refProgressLayout && progressLayout) {
    for (let i = 0; i < refProgressLayout.items.length; i++) {
      const rf = refProgressLayout.items[i]?.fontSizePx;
      const im = progressLayout.items[i]?.fontSizePx;
      if (rf != null && im != null && Math.abs(rf - im) > 0.75) {
        failures.push(`${width}:${step}:progress[${i}] font ref=${rf} impl=${im}`);
      }
      const rl = refProgressLayout.items[i]?.lineHeightPx;
      const il = progressLayout.items[i]?.lineHeightPx;
      if (rl != null && il != null && Math.abs(rl - il) > 1.5) {
        failures.push(`${width}:${step}:progress[${i}] lineHeight ref=${rl} impl=${il}`);
      }
    }
    const refGaps = refProgressLayout.horizontalGaps ?? [];
    const implGaps = progressLayout.horizontalGaps ?? [];
    if (refGaps.length && implGaps.length && refGaps.length === implGaps.length) {
      for (let i = 0; i < refGaps.length; i++) {
        const refG = refGaps[i];
        const implG = implGaps[i];
        if (Math.abs(refG - implG) > 2) {
          failures.push(
            `${width}:${step}:progress gap[${i}] ref=${refG} impl=${implG} (tol 2px)`,
          );
        }
      }
    }
  }
  if ([375, 320].includes(width) && progressLayout) {
    if ((progressLayout.lastLabelOverflowPx ?? 0) > 1) {
      failures.push(
        `${width}:${step}:progress lastLabelOverflow=${progressLayout.lastLabelOverflowPx}px containerRight=${progressLayout.containerRight}`,
      );
    }
    const lastBox = progressLayout.items?.[progressLayout.items.length - 1]?.labelBox;
    if (
      lastBox &&
      progressLayout.containerRight != null &&
      lastBox.right > progressLayout.containerRight + 1
    ) {
      failures.push(
        `${width}:${step}:progress lastLabelRight=${lastBox.right} > container=${progressLayout.containerRight}`,
      );
    }
  }

  if (step.startsWith("data") && [375, 320].includes(width) && implMetrics.mobileCard) {
    const card = implMetrics.mobileCard;
    const expectedX = 16;
    const expectedW = width - 32;
    if (Math.abs(card.x - expectedX) > 2) {
      failures.push(`${width}:${step}:card.x=${card.x} expected=${expectedX}`);
    }
    if (Math.abs(card.width - expectedW) > 4) {
      failures.push(`${width}:${step}:card.width=${card.width} expected=${expectedW}`);
    }
  }

  if (step === "auth-providers" && width === 320 && implMetrics.mobileCard) {
    const card = implMetrics.mobileCard;
    if (Math.abs(card.x - 16) > 2) failures.push(`320:auth-card.x=${card.x}`);
    if (Math.abs(card.width - 288) > 4) failures.push(`320:auth-card.width=${card.width}`);
  }

  if (step.startsWith("data") && width === 375 && implMetrics.formFooterRow) {
    if (!implMetrics.formFooterRow.singleRow) {
      failures.push("375:data:formFooter not single row");
    }
    if (refMetrics?.formFooterRow && refMetrics.formFooterRow.singleRow !== implMetrics.formFooterRow.singleRow) {
      failures.push("375:data:formFooter row ref vs impl mismatch");
    }
  }

  if (step.startsWith("data") && [375, 320].includes(width) && implMetrics.panelHeader) {
    const h = implMetrics.panelHeader;
    if (h.hintMarginLeftAuto) {
      failures.push(`${width}:${step}:stepHint still margin-left:auto on mobile`);
    }
    if (h.hintBelowEyebrow === false) {
      failures.push(`${width}:${step}:stepHint not on line below eyebrow`);
    }
    if (Math.abs(h.hintLeft - h.rowLeft) > 2) {
      failures.push(`${width}:${step}:stepHint left=${h.hintLeft} row=${h.rowLeft}`);
    }
  }

  if (step === "data-city" && implMetrics.cityField) {
    if (implMetrics.cityField.value) failures.push(`${width}:data-city: input value must be empty`);
    if (implMetrics.cityField.hasFocusRing) failures.push(`${width}:data-city: focus ring must be absent`);
    if (implMetrics.cityField.activeIsInput) failures.push(`${width}:data-city: input must not be focused`);
  }

  if (step === "auth-providers" && width === 320 && refMetrics?.authTitle && implMetrics?.authTitle) {
    if (implMetrics.authTitle.lines > refMetrics.authTitle.lines) {
      failures.push(
        `320:auth-providers:titleLines ref=${refMetrics.authTitle.lines} impl=${implMetrics.authTitle.lines}`,
      );
    }
    if (Math.abs(refMetrics.authTitle.fontSizePx - implMetrics.authTitle.fontSizePx) > 1.5) {
      failures.push(
        `320:auth-title-font: ref=${refMetrics.authTitle.fontSizePx}px impl=${implMetrics.authTitle.fontSizePx}px`,
      );
    }
    if (Math.abs(refMetrics.authTitle.widthPx - implMetrics.authTitle.widthPx) > 4) {
      failures.push(
        `320:auth-title-width: ref=${refMetrics.authTitle.widthPx} impl=${implMetrics.authTitle.widthPx}`,
      );
    }
  }

  return failures;
}

async function collectEntryStepMetrics(page, step, width, kind) {
  const isData = step.startsWith("data");
  const isAuthProviders = step === "auth-providers";
  const isMobileEntry = [375, 320].includes(width);
  const needsProgressMetrics = (isData || isAuthProviders) && isMobileEntry;
  return {
    providerBtn: isAuthProviders ? await measurePrimaryProviderButton(page, kind) : null,
    formGeometry:
      step === "data-name" && width === 1440 ? await measureDataFormGeometry(page, kind) : null,
    questionTitle:
      step === "data-name" && width === 1440 ? await measureQuestionTitleTypography(page, kind) : null,
    panelHeader: isData ? await measureDataPanelHeader(page) : null,
    progressMarkers: isData ? await measureProgressMarkers(page) : null,
    progressRow: needsProgressMetrics ? await measureProgressRow(page, kind) : null,
    progressLabels: needsProgressMetrics ? await measureProgressLabelLines(page, kind) : null,
    progressTextLayout: needsProgressMetrics ? await measureProgressTextLayout(page, kind) : null,
    mobileCard:
      (isData || isAuthProviders) && isMobileEntry ? await measureMobileEntryCard(page, kind) : null,
    formFooterRow: isData && width === 375 ? await measureFormFooterRow(page) : null,
    cityField: step === "data-city" ? await measureCityFieldFocus(page) : null,
    authTitle:
      isAuthProviders && width === 320 ? await measureAuthProvidersTitle(page, kind) : null,
  };
}

function assertProgressRowParity(refProgress, implProgress, width) {
  if (![375, 320].includes(width) || !refProgress?.stageTops || !implProgress?.stageTops) {
    return [];
  }
  const failures = [];
  if (refProgress.stageTops.length !== 4 || implProgress.stageTops.length !== 4) {
    failures.push(`${width}:progress: expected 4 stages`);
    return failures;
  }
  const implSpread = implProgress.stageTopSpread ?? 0;
  if (implSpread > 1) {
    failures.push(`${width}:progress: stageTopSpread=${implSpread} (4th column wrapped)`);
  }
  const refSpread = refProgress.stageTopSpread ?? 0;
  if (refSpread > 1) {
    failures.push(`${width}:progress: ref stageTopSpread=${refSpread}`);
  }
  return failures;
}

function assertGridParity(refMeasure, implMeasure, width) {
  if (width !== 1440 || !refMeasure?.grid || !implMeasure?.grid) return [];
  const failures = [];
  const tol = 2;
  for (const [label, refVal, implVal] of [
    ["grid.x", refMeasure.grid.x, implMeasure.grid.x],
    ["grid.width", refMeasure.grid.width, implMeasure.grid.width],
    ["grid.columnCount", refMeasure.grid.columnCount, implMeasure.grid.columnCount],
  ]) {
    if (Math.abs(refVal - implVal) > tol) {
      failures.push(`${label}: ref=${refVal} impl=${implVal} (tol ${tol}px)`);
    }
  }
  if (refMeasure.grid.columnCount === 3 && implMeasure.grid.columnCount === 3) {
    for (let i = 0; i < 3; i++) {
      const d = Math.abs(refMeasure.grid.columnWidthsPx[i] - implMeasure.grid.columnWidthsPx[i]);
      if (d > tol) {
        failures.push(`grid.col${i + 1}: ref=${refMeasure.grid.columnWidthsPx[i]} impl=${implMeasure.grid.columnWidthsPx[i]}`);
      }
    }
  }
  return failures;
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

async function captureRecord(page, fileName, expectedWidth, theme, step, kind, verifyFn, layoutMeasure) {
  await verifyViewport(page, expectedWidth);
  const dataTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (dataTheme !== theme) {
    throw new Error(`Theme expected ${theme}, got ${dataTheme}`);
  }
  await waitForCaptureStabilization(page, theme, kind, step);
  if (kind === "reference") {
    await hidePrototypeDemoChrome(page);
  }
  await hideDevChrome(page);
  await assertDevChromeHidden(page);
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
    layout: layoutMeasure,
    verify: "passed",
  };
}

async function hidePrototypeDemoChrome(page) {
  await page.addStyleTag({ content: PROTO_DEMO_HIDE });
}

async function measureWelcomeLayout(page, kind) {
  return page.evaluate((sourceKind) => {
    const root =
      sourceKind === "reference"
        ? document.querySelector(".welcome-page, .welcome-hero")
        : document.querySelector('[data-testid="registration-welcome"]');
    const btn =
      sourceKind === "reference"
        ? document.querySelector(".welcome-action .btn")
        : root?.querySelector("a[class*='primaryBtn']");
    const action =
      sourceKind === "reference"
        ? document.querySelector(".welcome-action")
        : root?.querySelector("[class*='action']");
    const btnStyle = btn ? getComputedStyle(btn) : null;
    const actionStyle = action ? getComputedStyle(action) : null;
    const h1 = document.querySelector(".welcome-copy h1, [data-testid='registration-welcome'] h1");
    const h1Style = h1 ? getComputedStyle(h1) : null;
    const actionBox = action?.getBoundingClientRect();
    return {
      actionDisplay: actionStyle?.flexDirection ?? null,
      actionAlign: actionStyle?.alignItems ?? null,
      actionGap: actionStyle?.gap ?? null,
      btnBg: btnStyle?.backgroundColor ?? null,
      btnColor: btnStyle?.color ?? null,
      h1FontSizePx: h1Style ? Math.round(parseFloat(h1Style.fontSize) * 100) / 100 : null,
      h1LineHeight: h1Style?.lineHeight ?? null,
      actionTopPx: actionBox ? Math.round(actionBox.top) : null,
    };
  }, kind);
}

async function openPrototypeAgentStep(page, theme, width, stopStep) {
  await openPrototypeTypes(page, theme, width);
  await page.locator(".role-card").filter({ hasText: "Агент" }).first().click();
  await page.getByRole("button", { name: /Продолжить/i }).click();
  await page.waitForSelector("#entry-data-input", { timeout: 30_000 });
  if (stopStep === "data-name") return;
  await page.fill("#entry-data-input", "QA Visual");
  await page.getByRole("button", { name: /Продолжить|К подтверждению/i }).click();
  await page.waitForSelector("#entry-data-input", { timeout: 15_000 });
  if (stopStep === "data-city") return;
  await page.fill("#entry-data-input", "Москва");
  await page.getByRole("button", { name: /Продолжить|К подтверждению/i }).click();
  await page.waitForSelector("h1", { timeout: 15_000 });
  if (stopStep === "auth-providers") return;
  const maxBtn = page.getByRole("button", { name: /MAX/i });
  if (await maxBtn.count()) await maxBtn.first().click();
  await page.waitForSelector("#entry-code, #entry-code-title, h1", { timeout: 15_000 });
}

async function openImplAgentStep(page, stopStep) {
  await page.locator('label:has(input[value="agent"])').click({ position: { x: 8, y: 8 } });
  await page.getByRole("button", { name: /Продолжить/ }).click();
  await page.waitForSelector('[data-testid="registration-entry-data"]', { timeout: 15_000 });
  if (stopStep === "data-name") return;
  await page.getByLabel(/Ваше имя/i).fill("QA Visual");
  await page.getByRole("button", { name: /Продолжить|К подтверждению/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-data"]', { timeout: 15_000 });
  if (stopStep === "data-city") return;
  await page.getByLabel(/Город/i).fill("Москва");
  await page.getByRole("button", { name: /Продолжить|К подтверждению/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-auth-providers"]', { timeout: 15_000 });
  if (stopStep === "auth-providers") return;
  await page.getByRole("button", { name: /Продолжить с MAX/i }).click();
  await page.waitForSelector('[data-testid="registration-entry-auth-code"]', { timeout: 15_000 });
}

async function openImplTypes(page, theme, width) {
  await mockRegistrationCapabilities(page);
  await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.goto(`${IMPL_BASE}/join`, { waitUntil: "domcontentloaded" });
  await applyTheme(page, theme);
  await hideDevChrome(page);
  await page.waitForSelector('[data-testid="registration-types-grid"] label', {
    timeout: 30_000,
  });
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
  await applyPrototypeTheme(page, theme);
  await hidePrototypeDemoChrome(page);
  const h1 = await page.locator(".intro h1, h1").first().innerText();
  if (!/Какой тип партнёрства/i.test(h1)) {
    throw new Error(`Prototype choose screen not ready: "${h1}"`);
  }
  await page.waitForSelector(".role-grid .role-card", { timeout: 30_000 });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const protoRoot = await preparePrototypeTree();
  const protoProc = await startPrototypeServer(protoRoot);

  const browser = await chromium.launch({ channel: "chrome" }).catch(() => chromium.launch());
  const captures = [];
  const pairs = [];
  const parityFailures = [];
  const documentedExceptions = [];

  const typeMatrix = [
    { theme: "light", width: 1440, suffix: "1440-light" },
    { theme: "dark", width: 1440, suffix: "1440-dark" },
    { theme: "light", width: 375, suffix: "375-light" },
    { theme: "dark", width: 375, suffix: "375-dark" },
    { theme: "dark", width: 320, suffix: "320-dark" },
  ];

  if (!VISUAL_01_5) for (const { theme, width, suffix } of typeMatrix) {
    let refMeasure = null;
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openPrototypeTypes(page, theme, width);
      refMeasure = await measureTypesLayout(page, "reference");
      const refProgress = await measureProgressRow(page, "reference");
      if (refMeasure) refMeasure.progress = refProgress;
      captures.push(
        await captureRecord(
          page,
          `ref-types-${suffix}.png`,
          width,
          theme,
          "types",
          "reference",
          verifyTypesStep,
          refMeasure,
        ),
      );
      await context.close();
    }
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openImplTypes(page, theme, width);
      const implMeasure = await measureTypesLayout(page, "implementation");
      const implProgress = await measureProgressRow(page, "implementation");
      if (implMeasure) implMeasure.progress = implProgress;
      parityFailures.push(...assertGridParity(refMeasure, implMeasure, width));
      parityFailures.push(...assertMobileGridParity(refMeasure, implMeasure, width));
      parityFailures.push(...assertProgressRowParity(refMeasure?.progress, implProgress, width));
      captures.push(
        await captureRecord(
          page,
          `impl-types-${suffix}.png`,
          width,
          theme,
          "types",
          "implementation",
          verifyTypesStep,
          implMeasure,
        ),
      );
      pairs.push({ pair: `types-${suffix}`, ref: `ref-types-${suffix}.png`, impl: `impl-types-${suffix}.png` });
      await context.close();
    }
  }

  const entryStepMatrix = [
    { step: "data-name", suffix: "1440-light", theme: "light", width: 1440 },
    { step: "data-name", suffix: "375-dark", theme: "dark", width: 375 },
    { step: "data-city", suffix: "1440-light", theme: "light", width: 1440 },
    { step: "data-city", suffix: "375-dark", theme: "dark", width: 375 },
    { step: "auth-providers", suffix: "1440-light", theme: "light", width: 1440 },
    { step: "auth-providers", suffix: "375-dark", theme: "dark", width: 375 },
    { step: "auth-code", suffix: "375-dark", theme: "dark", width: 375 },
    { step: "auth-code", suffix: "320-dark", theme: "dark", width: 320 },
    ...(VISUAL_01_5
      ? [{ step: "auth-providers", suffix: "320-progress-dark", theme: "dark", width: 320 }]
      : [{ step: "data-name", suffix: "320-dark", theme: "dark", width: 320 }]),
  ];

  for (const { step, suffix, theme, width } of entryStepMatrix) {
    const refFile = `ref-${step}-${suffix}.png`;
    const implFile = `impl-${step}-${suffix}.png`;
    let refEntryMetrics = null;
    let implEntryMetrics = null;
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await openPrototypeAgentStep(page, theme, width, step);
      await applyPrototypeTheme(page, theme);
      await hidePrototypeDemoChrome(page);
      refEntryMetrics = await collectEntryStepMetrics(page, step, width, "reference");
      captures.push(
        await captureRecord(page, refFile, width, theme, step, "reference", async (p) => {
          const h1 = await p.locator("h1").first().innerText();
          if (step.startsWith("data") && !/(обращаться|город)/i.test(h1)) throw new Error(`ref ${step} h1=${h1}`);
          if (step === "auth-providers" && !/подтверд|вход/i.test(h1)) throw new Error(`ref auth h1=${h1}`);
          if (step === "auth-code" && !/код/i.test(h1)) throw new Error(`ref code h1=${h1}`);
        }, refEntryMetrics),
      );
      await context.close();
    }
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await mockRegistrationCapabilities(page);
      await mockAuthGuest(page);
      await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
      await page.addInitScript(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.goto(`${IMPL_BASE}/join`, { waitUntil: "domcontentloaded" });
      await applyTheme(page, theme);
      await hideDevChrome(page);
      await page.waitForSelector('[data-testid="registration-types-grid"] label', { timeout: 30_000 });
      await openImplAgentStep(page, step);
      implEntryMetrics = await collectEntryStepMetrics(page, step, width, "implementation");
      parityFailures.push(
        ...assertRegistrationCssGates({
          step,
          theme,
          width,
          refMetrics: refEntryMetrics,
          implMetrics: implEntryMetrics,
        }),
      );
      if (
        step === "data-name" &&
        width === 1440 &&
        refEntryMetrics?.formGeometry?.shell &&
        implEntryMetrics?.formGeometry?.shell
      ) {
        const dy = Math.abs(
          refEntryMetrics.formGeometry.shell.y - implEntryMetrics.formGeometry.shell.y,
        );
        if (dy > 6) {
          documentedExceptions.push({
            kind: "shellTopOffsetVsPrototypeHeader",
            refY: refEntryMetrics.formGeometry.shell.y,
            implY: implEntryMetrics.formGeometry.shell.y,
            deltaPx: dy,
            note: "Absolute shell Y includes app header vs prototype topbar; grid.relY still gated ref vs impl.",
          });
        }
        if (VISUAL_01_5) {
          const rAside = refEntryMetrics.formGeometry?.asidePanel;
          const iAside = implEntryMetrics.formGeometry?.asidePanel;
          if (rAside && iAside && Math.abs(rAside.height - iAside.height) > 24) {
            documentedExceptions.push({
              kind: "desktopAsidePanelHeightVsPrototype",
              refHeight: rAside.height,
              implHeight: iAside.height,
              note: "Not pixel PASS for desktop shell/aside; excluded from REGISTRATION_VISUAL_01_5 gates.",
            });
          }
        }
      }
      captures.push(
        await captureRecord(page, implFile, width, theme, step, "implementation", async (p) => {
          if (step.startsWith("data")) {
            await p.waitForSelector('[data-testid="registration-entry-data"]');
          } else if (step === "auth-providers") {
            await p.waitForSelector('[data-testid="registration-entry-auth-providers"]');
          } else {
            await p.waitForSelector('[data-testid="registration-entry-auth-code"]');
          }
        }, implEntryMetrics),
      );
      pairs.push({ pair: `${step}-${suffix}`, ref: refFile, impl: implFile });
      await context.close();
    }
  }

  const welcomeRefLayouts = {};
  for (const { theme, width, suffix } of [
    { theme: "light", width: 1440, suffix: "1440-light" },
    { theme: "light", width: 375, suffix: "375-light" },
    { theme: "dark", width: 375, suffix: "375-dark" },
    { theme: "dark", width: 320, suffix: "320-dark" },
  ]) {
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
      await page.goto(`${PROTO_BASE}/roles.html`, { waitUntil: "networkidle" });
      await applyPrototypeTheme(page, theme);
      await hidePrototypeDemoChrome(page);
      welcomeRefLayouts[suffix] = await measureWelcomeLayout(page, "reference");
      captures.push(
        await captureRecord(
          page,
          `ref-welcome-${suffix}.png`,
          width,
          theme,
          "welcome",
          "reference",
          async (p) => {
            const h1 = await p.locator(".welcome-copy h1, h1").first().innerText();
            if (!/клиентами/i.test(h1)) throw new Error(`welcome ref h1=${h1}`);
          },
          welcomeRefLayouts[suffix],
        ),
      );
      await context.close();
    }
    {
      const context = await browser.newContext();
      const page = await context.newPage();
      await mockAuthGuest(page);
      await mockRegistrationCapabilities(page);
      await page.setViewportSize({ width, height: width >= 1440 ? 900 : width <= 320 ? 640 : 812 });
      await page.goto(`${IMPL_BASE}/`, { waitUntil: "networkidle" });
      await applyTheme(page, theme);
      await hideDevChrome(page);
      await page.waitForSelector('[data-testid="registration-welcome"]', { timeout: 30_000 });
      const implWelcomeLayout = await measureWelcomeLayout(page, "implementation");
      const refWelcomeLayout = welcomeRefLayouts[suffix];
      if (width === 375 && refWelcomeLayout && implWelcomeLayout) {
        if (implWelcomeLayout.actionDisplay === "column" && refWelcomeLayout.actionDisplay === "row") {
          parityFailures.push("welcome-375:action flex-direction column vs ref row");
        }
        const tol = 28;
        if (
          refWelcomeLayout.actionTopPx != null &&
          implWelcomeLayout.actionTopPx != null &&
          Math.abs(implWelcomeLayout.actionTopPx - refWelcomeLayout.actionTopPx) > tol
        ) {
          parityFailures.push(
            `welcome-${suffix}:actionTop ref=${refWelcomeLayout.actionTopPx} impl=${implWelcomeLayout.actionTopPx} (tol ${tol}px)`,
          );
        }
        if (theme === "dark" && implWelcomeLayout.btnBg) {
          const targetBg = [244, 147, 145];
          const bg = parseRgbTriplet(implWelcomeLayout.btnBg);
          if (!rgbClose(bg, targetBg)) {
            parityFailures.push(`welcome-375-dark:cta-bg ${implWelcomeLayout.btnBg}`);
          }
        }
      }
      captures.push(
        await captureRecord(
          page,
          `impl-welcome-${suffix}.png`,
          width,
          theme,
          "welcome",
          "implementation",
          async (p) => {
            await p.waitForSelector('[data-testid="registration-welcome"]');
          },
          implWelcomeLayout,
        ),
      );
      pairs.push({ pair: `welcome-${suffix}`, ref: `ref-welcome-${suffix}.png`, impl: `impl-welcome-${suffix}.png` });
      await context.close();
    }
  }

  await browser.close();
  protoProc.kill();

  let buildId = null;
  try {
    const html = await fetch(`${IMPL_BASE}/join`).then((r) => r.text());
    const m = html.match(/"buildId":"([^"]+)"/);
    buildId = m?.[1] ?? null;
  } catch {
    buildId = null;
  }

  const report = {
    implBase: IMPL_BASE,
    protoBase: PROTO_BASE,
    codeSha: CODE_SHA,
    runnerSha: RUNNER_SHA,
    buildId,
    treeDirty: TREE_DIRTY,
    referenceSha: REF_SHA,
    referenceShaImmutable: REFERENCE_SHA_IMMUTABLE,
    capturedAt: new Date().toISOString(),
    pngFileCount: captures.length,
    pairCount: pairs.length,
    captureCount: captures.length,
    pairs,
    captures,
    layoutParityFailures: parityFailures,
    documentedExceptions,
    typesGridGeometryStatus:
      parityFailures.filter((f) => f.includes("grid") || f.includes("progress")).length === 0
        ? "within-tolerance"
        : "NO-GO",
    pairedCaptureStatus:
      parityFailures.length === 0 ? "pairs-captured-with-layout-metrics" : "NO-GO-layout-parity",
    captureStatus:
      parityFailures.length === 0 ? "geometry-within-tolerance" : "NO-GO-layout-parity",
    invalidSupersededRefs: [],
    remainingVisualGaps: [
      "CAPTURED ≠ pixel PASS; pairs are for human/review diff only.",
      "Welcome link retained on types step (not in frozen prototype footer).",
      "Dark card tokens: impl surface rgb(32,37,32) vs ref rgb(34,37,35) (platform globals — do not change for R06 parallel work).",
      "auth-code: ref prototype demo field vs impl live OTP copy — not production OTP delivery.",
      "Equal PNG widths ≠ visual PASS; review welcome CTA color/row layout via layout.* metrics.",
    ],
    parallelAgentNote:
      "R06-SPECIALIST-TAIL-01 (bc-6cb74748) owns specialist/taxonomy — avoid shared auth.module.css / global token edits.",
    assertions: [
      "step_verify",
      "viewport_verify",
      "theme_verify",
      "no_horizontal_overflow",
      "dev_overlay_hidden_post_navigation",
      "dark_card_computed_settled",
      "layout_json_embedded",
      "mobile_grid_parity_375_320",
      "progress_stage_top_alignment",
      "registration_css_gates",
    ],
  };
  await writeFile(
    path.join(ROOT, "artifacts/remcard-registration-01/visual-capture.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  if (parityFailures.length) {
    console.error("Layout parity failures:", parityFailures);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
