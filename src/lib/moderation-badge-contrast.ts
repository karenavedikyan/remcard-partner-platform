function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.x contrast ratio for two #RRGGBB colors. */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(hexToRgb(foreground));
  const l2 = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function relativeLuminanceFromHex(hex: string): number {
  return relativeLuminance(hexToRgb(hex));
}

export type Rgba = { r: number; g: number; b: number; a: number };

/** Parse `rgb()` / `rgba()` from computed styles (hex not required). */
export function parseRgbCss(css: string): Rgba | null {
  const m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] === undefined ? 1 : Number(m[4]),
  };
}

export function rgbaToHex({ r, g, b }: Rgba): string {
  const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

/** Alpha-composite foreground over background (both 0–255). */
export function compositeRgb(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a <= 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / a,
    g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / a,
    b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / a,
    a,
  };
}

export function contrastRatioFromCssColors(foregroundCss: string, backgroundCss: string): number | null {
  const fg = parseRgbCss(foregroundCss);
  const bg = parseRgbCss(backgroundCss);
  if (!fg || !bg) return null;
  const effective =
    fg.a < 1 ? compositeRgb(fg, bg) : fg;
  const effectiveBg = bg.a < 1 ? null : bg;
  if (!effectiveBg) return null;
  return contrastRatio(rgbaToHex(effective), rgbaToHex(effectiveBg));
}
