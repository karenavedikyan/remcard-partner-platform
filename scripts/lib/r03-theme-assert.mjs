/**
 * Theme/surface measurement for R03 visual acceptance (no transparent-root false dark).
 */

export function parseCssRgb(bg) {
  const s = String(bg ?? '').trim();
  const m = s.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (!m) return { r: 0, g: 0, b: 0, a: 0, raw: s };
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] !== undefined ? Number(m[4]) : 1,
    raw: s,
  };
}

export function rgbLuma(r, g, b) {
  return (r + g + b) / 3;
}

export function isEffectivelyTransparent(bg) {
  const { a } = parseCssRgb(bg);
  return a < 0.08;
}

/** Resolve first opaque background walking up from `start` (falls back to body). */
export function resolveOpaqueSurfaceFromStyles(getBg, startKey, chainKeys) {
  for (const key of chainKeys) {
    const bg = getBg(key);
    if (bg && !isEffectivelyTransparent(bg)) {
      const { r, g, b, a, raw } = parseCssRgb(bg);
      return { source: key, bg: raw, r, g, b, a, luma: rgbLuma(r, g, b) };
    }
  }
  return { source: startKey, bg: 'none', r: 255, g: 255, b: 255, a: 1, luma: 255 };
}

/**
 * Pure verdict for dark capture (unit-tested).
 * @param {object} m - measurement with dataTheme, colorScheme, surfaceLuma, surfaceBg
 */
export function assertDarkThemeMeasurement(m) {
  const dataTheme = m.dataTheme ?? null;
  const colorScheme = m.colorScheme ?? null;
  const surfaceLuma = m.surfaceLuma ?? 255;
  const explicitLight = dataTheme === 'light' || colorScheme === 'light';
  const explicitDark = dataTheme === 'dark' || colorScheme === 'dark';

  if (explicitLight && surfaceLuma > 140) {
    return { ok: false, reason: 'explicit_light_with_light_surface', ...m };
  }
  if (explicitDark && surfaceLuma < 110) {
    return { ok: true, reason: 'explicit_dark_surface', ...m };
  }
  if (explicitDark && surfaceLuma >= 110) {
    return { ok: false, reason: 'explicit_dark_but_light_surface', ...m };
  }
  if (surfaceLuma < 95 && !explicitLight) {
    return { ok: true, reason: 'dark_surface', ...m };
  }
  return { ok: false, reason: 'light_surface', ...m };
}

/** In-browser measurement (passed to page.evaluate). */
export function measureCabinetThemeInPage() {
  const html = document.documentElement;
  const dataTheme = html.getAttribute('data-theme') || html.dataset.theme || null;
  const colorScheme = getComputedStyle(html).colorScheme || null;

  const candidates = [
    ['toolbar', document.querySelector('[data-testid="agent-r03-collection-toolbar"]')],
    ['main', document.querySelector('#main')],
    ['content', document.querySelector('.content')],
    ['topbar', document.querySelector('.topbar')],
    ['agentTopbar', document.querySelector('[data-testid="agent-product-topbar"]')],
    ['body', document.body],
  ];

  let surface = { source: 'none', bg: 'none', luma: 255 };
  for (const [source, el] of candidates) {
    if (!el) continue;
    let node = el;
    while (node && node !== html) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = bg.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
      if (m) {
        const a = m[4] !== undefined ? Number(m[4]) : 1;
        const r = Number(m[1]);
        const g = Number(m[2]);
        const b = Number(m[3]);
        if (a >= 0.08) {
          const luma = (r + g + b) / 3;
          surface = { source, bg, luma, r, g, b, a };
          break;
        }
      }
      node = node.parentElement;
    }
    if (surface.source !== 'none') break;
  }

  const bodyBg = getComputedStyle(document.body).backgroundColor;
  const htmlBg = getComputedStyle(html).backgroundColor;

  return {
    dataTheme,
    colorScheme,
    htmlClass: html.className,
    bodyBg,
    htmlBg,
    surfaceSource: surface.source,
    surfaceBg: surface.bg,
    surfaceLuma: surface.luma,
    surfaceRgb: { r: surface.r, g: surface.g, b: surface.b, a: surface.a },
  };
}

export async function measurePageTheme(page) {
  const raw = await page.evaluate(measureCabinetThemeInPage);
  return assertDarkThemeMeasurement({
    dataTheme: raw.dataTheme,
    colorScheme: raw.colorScheme,
    surfaceLuma: raw.surfaceLuma,
    surfaceBg: raw.surfaceBg,
    ...raw,
  });
}
