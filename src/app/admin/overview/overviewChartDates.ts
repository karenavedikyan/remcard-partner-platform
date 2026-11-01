/** Chart axis / tooltip date formatting for overview community growth series. */

function parseSeriesDay(isoDate: string): Date | null {
  const raw = isoDate.trim();
  if (!raw) return null;
  const d = new Date(raw.includes("T") ? raw : `${raw}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Short axis tick: DD.MM (distinct across multi-day 7d/30d windows). */
export function formatOverviewChartAxisLabel(isoDate: string): string {
  const d = parseSeriesDay(isoDate);
  if (!d) return isoDate;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

/** Full day for aria-label, SVG title, and screen readers. */
export function formatOverviewChartFullDay(isoDate: string): string {
  const d = parseSeriesDay(isoDate);
  if (!d) return isoDate;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}
