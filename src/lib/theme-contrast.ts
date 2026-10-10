/** WCAG 2.x relative luminance helpers — token hex values must stay aligned with globals.css */

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channelLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelLinear(r) + 0.7152 * channelLinear(g) + 0.0722 * channelLinear(b);
}

export function contrastRatio(foregroundHex: string, backgroundHex: string): number {
  const l1 = relativeLuminance(foregroundHex);
  const l2 = relativeLuminance(backgroundHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pairs mirrored from :root and [data-theme="dark"] in globals.css */
export const THEME_CONTRAST_PAIRS = {
  light: {
    primaryButton: { fg: "#ffffff", bg: "#c12b2f", minRatio: 4.5 },
    tabActive: { fg: "#ffffff", bg: "#252923", minRatio: 4.5 },
    accentEmphasisOnSurface: { fg: "#9f1239", bg: "#ffffff", minRatio: 4.5 },
    accentFillBadge: { fg: "#ffffff", bg: "#c12b2f", minRatio: 4.5 },
    bodyText: { fg: "#6c706a", bg: "#ffffff", minRatio: 4.5 },
    placeholder: { fg: "#6c706a", bg: "#ffffff", minRatio: 4.5 },
  },
  dark: {
    primaryButton: { fg: "#ffffff", bg: "#b54844", minRatio: 4.5 },
    tabActive: { fg: "#f0f1ec", bg: "#343a34", minRatio: 4.5 },
    accentEmphasisOnSurface: { fg: "#fda4af", bg: "#202520", minRatio: 4.5 },
    accentFillBadge: { fg: "#ffffff", bg: "#b54844", minRatio: 4.5 },
    bodyText: { fg: "#a6aea4", bg: "#202520", minRatio: 4.5 },
    placeholder: { fg: "#a6aea4", bg: "#202520", minRatio: 4.5 },
  },
} as const;
