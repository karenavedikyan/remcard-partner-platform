import {
  assertDarkThemeMeasurement,
  measureCabinetThemeInPage,
} from './r03-theme-assert.mjs';

function assertLightThemeMeasurement(m) {
  const dataTheme = m.dataTheme ?? null;
  if (dataTheme === 'dark') {
    return { ok: false, reason: 'explicit_dark_attr', ...m };
  }
  const luma = m.surfaceLuma ?? 255;
  if (luma < 140) {
    return { ok: false, reason: 'surface_too_dark_for_light', ...m };
  }
  return { ok: true, reason: 'light_surface', ...m };
}

export async function setCabinetTheme(page, theme) {
  const toggle = page.getByTestId('theme-toggle');
  if (!(await toggle.count())) {
    throw new Error('theme_toggle_unavailable');
  }
  const wantDark = theme === 'dark';
  for (let attempt = 0; attempt < 8; attempt++) {
    const raw = await page.evaluate(measureCabinetThemeInPage);
    const isDark = raw.dataTheme === 'dark';
    if (isDark === wantDark) {
      const verdict = wantDark
        ? assertDarkThemeMeasurement(raw)
        : assertLightThemeMeasurement(raw);
      if (verdict.ok) return raw;
    }
    await toggle.click();
    await page.waitForTimeout(400);
  }
  const last = await page.evaluate(measureCabinetThemeInPage);
  throw new Error(
    `theme_set_failed want=${theme} data-theme=${last.dataTheme} luma=${last.surfaceLuma}`,
  );
}

export async function setReferenceTheme(page, theme) {
  const resolved = theme === 'dark' ? 'dark' : 'light';
  const btn = page.locator('button[data-action="theme"]');
  if (!(await btn.count())) {
    throw new Error('reference_theme_toggle_unavailable');
  }
  for (let i = 0; i < 6; i++) {
    const cur = await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'light');
    if (cur === resolved) return;
    await btn.click();
    await page.waitForTimeout(350);
  }
  throw new Error(`reference_theme_failed want=${theme}`);
}
