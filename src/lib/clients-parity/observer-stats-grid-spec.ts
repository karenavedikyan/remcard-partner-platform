/**
 * Prototype `3dc31836` — `.ca-personal-partners .ca-observer-stats`:
 * 4 columns by default and through 760px; 2 columns at max-width 360px.
 */
export const STATS_GRID_MEASURE_WIDTHS = [1440, 1024, 768, 375, 360, 320] as const;

export type StatsGridMeasureWidth = (typeof STATS_GRID_MEASURE_WIDTHS)[number];

export function expectedStatsGridColumnCount(innerWidth: number): 2 | 4 {
  return innerWidth <= 360 ? 2 : 4;
}

export function parseComputedGridColumnCount(gridTemplateColumns: string): number {
  const trimmed = gridTemplateColumns.trim();
  if (!trimmed || trimmed === "none") {
    return 0;
  }
  const repeat = trimmed.match(/repeat\(\s*(\d+)/);
  if (repeat) {
    return Number.parseInt(repeat[1]!, 10);
  }
  return trimmed.split(/\s+/).filter(Boolean).length;
}
