/** Chart-only geometry helpers for overview daily line panels (presentation). */

export function formatAxisTick(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs < 1000) return `${sign}${Math.round(abs)}`;

  const units: { div: number; suffix: string }[] = [
    { div: 1e12, suffix: "T" },
    { div: 1e9, suffix: "G" },
    { div: 1e6, suffix: "M" },
    { div: 1e3, suffix: "K" },
  ];
  for (const { div, suffix } of units) {
    if (abs >= div) {
      const n = abs / div;
      const digits = n >= 100 ? 0 : n >= 10 ? 1 : 2;
      let body = n.toFixed(digits);
      body = body.replace(/\.0+$/, "").replace(/(\.\d*[1-9])0+$/, "$1");
      return `${sign}${body}${suffix}`;
    }
  }
  return `${sign}${Math.round(abs)}`;
}

/** Approximate label width in user units at 14px (CTM≈1). */
export function estimateTickPadPx(labels: string[], fontSize = 14): number {
  const maxChars = Math.max(1, ...labels.map((l) => l.length));
  // Digits/letters ~0.62em; +8px gap before plot area
  return Math.ceil(maxChars * fontSize * 0.62) + 8;
}

export type LineGeometry = {
  max: number;
  padL: number;
  padR: number;
  width: number;
  height: number;
  xAt: (i: number) => number;
  yAt: (v: number) => number;
  linePath: string;
  areaPath: string;
  guides: { v: number; label: string; y: number }[];
  axisIdx: number[];
};

/**
 * Build line geometry in user units matching the CSS pixel width of the SVG
 * (viewBox width === rendered width → screen CTM scale ≈ 1 for axis text).
 */
export function buildLineGeometry(values: number[], width: number, height: number): LineGeometry {
  const n = values.length;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const max = Math.max(4, ...values) + 2;
  const guideValues = [0, 1, 2, 3].map((i) => Math.round((i * max) / 3));
  const tickLabels = guideValues.map(formatAxisTick);
  const rawPad = estimateTickPadPx(tickLabels);
  // Keep a usable plot area even for long compact labels
  const padL = Math.min(Math.max(36, rawPad), Math.max(36, Math.floor(width * 0.42)));

  const xAt = (i: number) =>
    n <= 1 ? padL + (width - padL - padR) / 2 : padL + (i * (width - padL - padR)) / (n - 1);
  const yAt = (v: number) => height - padB - (v / max) * (height - padT - padB);

  const linePath =
    n === 0 ? "" : values.map((v, i) => `${i ? "L" : "M"}${xAt(i)},${yAt(v)}`).join(" ");
  const areaPath =
    n === 0 ? "" : `${linePath} L${xAt(n - 1)},${height - padB} L${xAt(0)},${height - padB} Z`;

  const guides = guideValues.map((v) => ({
    v,
    label: formatAxisTick(v),
    y: yAt(v),
  }));

  const axisIdx =
    n <= 1
      ? [0]
      : n <= 3
        ? values.map((_, i) => i)
        : [0, Math.floor((n - 1) / 3), Math.floor(((n - 1) * 2) / 3), n - 1];

  return { max, padL, padR, width, height, xAt, yAt, linePath, areaPath, guides, axisIdx };
}
