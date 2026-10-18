/** Visual gates for login-entry captures (computed styles + layout, not theme attribute alone). */

function parseRgb(cssColor) {
  if (!cssColor) return null;
  const m = cssColor.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function relativeLuminance([r, g, b]) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fgCss, bgCss) {
  const fg = parseRgb(fgCss);
  const bg = parseRgb(bgCss);
  if (!fg || !bg) return null;
  const l1 = relativeLuminance(fg) + 0.05;
  const l2 = relativeLuminance(bg) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
}

export async function readButtonContrast(page, buttonLocator) {
  return buttonLocator.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      borderColor: cs.borderTopColor,
    };
  });
}

async function waitForProviderButtonPaintStable(page, button, theme, provider) {
  await page.addStyleTag({
    content: "*, *::before, *::after { transition: none !important; animation: none !important; }",
  });
  const expectedMaxBg = theme === "dark" ? "rgb(244, 147, 145)" : null;
  await button.evaluate(
    (el, { expectedMaxBg, providerName }) =>
      new Promise((resolve, reject) => {
        const deadline = Date.now() + 5000;
        const tick = () => {
          const bg = getComputedStyle(el).backgroundColor;
          if (providerName === "max" && expectedMaxBg && bg === expectedMaxBg) {
            resolve(undefined);
            return;
          }
          if (providerName !== "max" || !expectedMaxBg) {
            resolve(undefined);
            return;
          }
          if (Date.now() > deadline) {
            reject(new Error(`provider MAX ${expectedMaxBg} not stable (got ${bg})`));
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      }),
    { expectedMaxBg, providerName: provider },
  );
}

export async function assertProviderButtonVisual(page, { theme, provider }) {
  const pattern = provider === "max" ? /продолжить с max/i : /продолжить с telegram/i;
  const button = page.getByRole("button", { name: pattern });
  await button.waitFor({ state: "visible", timeout: 15_000 });
  await waitForProviderButtonPaintStable(page, button, theme, provider);
  const styles = await readButtonContrast(page, button);
  const ratio = contrastRatio(styles.color, styles.backgroundColor);
  if (ratio == null) {
    throw new Error(`${provider} contrast unavailable (${styles.color} on ${styles.backgroundColor})`);
  }
  const minRatio = theme === "dark" ? 4.5 : 3;
  if (ratio < minRatio) {
    throw new Error(`${provider} ${theme} contrast ${ratio.toFixed(2)} < ${minRatio}`);
  }
  const box = await button.boundingBox();
  if (!box || box.width < 200) {
    throw new Error(`${provider} button layout too narrow (${box?.width ?? 0}px)`);
  }
  return { provider, theme, contrast: Number(ratio.toFixed(2)), styles };
}

export async function assertAdminModalWithinViewport(page) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport missing");
  const password = page.getByTestId("admin-password-input");
  const toggle = page.getByRole("button", { name: /^(показать|скрыть)$/i });
  await password.waitFor({ state: "visible", timeout: 15_000 });
  const passwordBox = await password.boundingBox();
  const toggleBox = await toggle.boundingBox().catch(() => null);
  const dialog = page.getByTestId("admin-login-modal");
  const dialogBox = await dialog.boundingBox();
  const maxRight = viewport.width - 2;
  for (const [label, box] of [
    ["password", passwordBox],
    ["toggle", toggleBox],
    ["dialog", dialogBox],
  ]) {
    if (!box) continue;
    if (box.x < -1) throw new Error(`admin ${label} clipped left (${box.x})`);
    if (box.x + box.width > maxRight) {
      throw new Error(`admin ${label} clipped right (${box.x + box.width} > ${maxRight})`);
    }
  }
  return { viewport: viewport.width, passwordRight: passwordBox ? passwordBox.x + passwordBox.width : null };
}
