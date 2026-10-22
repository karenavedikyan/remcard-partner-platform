export const MSK_TIME_ZONE = "Europe/Moscow";

export function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d
  );
}

export function compareIsoCalendarDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function validateMskPeriod(from: string, to: string): string | null {
  if (from && !isIsoCalendarDate(from)) {
    return "Некорректная дата начала периода.";
  }
  if (to && !isIsoCalendarDate(to)) {
    return "Некорректная дата окончания периода.";
  }
  if (from && to && compareIsoCalendarDates(from, to) > 0) {
    return "Дата начала периода не может быть позже даты окончания.";
  }
  return null;
}

export function mskCalendarDateFromInstant(iso: string): string | null {
  if (!iso || !Number.isFinite(Date.parse(iso))) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MSK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function instantInMskCalendarRange(iso: string, from: string, to: string): boolean {
  const day = mskCalendarDateFromInstant(iso);
  if (!day) return false;
  if (from && compareIsoCalendarDates(day, from) < 0) return false;
  if (to && compareIsoCalendarDates(day, to) > 0) return false;
  return true;
}
