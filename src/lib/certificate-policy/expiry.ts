/**
 * Certificate recipient expiry — proposed convention (not a product decision).
 * Issue date is day 1; expiry is end of the Nth calendar day in Europe/Moscow.
 */
export const CERTIFICATE_POLICY_TIME_ZONE = "Europe/Moscow";

export function certificatePolicyExpiryIso(
  validityDays: number,
  issuedAt: Date = new Date(),
): string {
  if (!Number.isFinite(validityDays) || validityDays < 1) {
    return issuedAt.toISOString();
  }
  const parts = moscowDateParts(issuedAt);
  const endDayIndex = parts.day + validityDays - 1;
  const end = moscowZonedToUtc(parts.year, parts.month, endDayIndex, 23, 59, 59, 999);
  return end.toISOString();
}

export function certificatePolicyExpiryDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: CERTIFICATE_POLICY_TIME_ZONE,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

type MoscowParts = { year: number; month: number; day: number };

function moscowDateParts(at: Date): MoscowParts {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CERTIFICATE_POLICY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(at).split("-").map(Number);
  return { year, month, day };
}

/** Moscow local wall-clock → UTC Date (DST-safe via formatter probe). */
function moscowZonedToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour - 3, minute, second, ms));
  const offsetMs = moscowOffsetMs(guess);
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute, second, ms) - offsetMs,
  );
}

function moscowOffsetMs(at: Date): number {
  const utc = new Date(at.toLocaleString("en-US", { timeZone: "UTC" }));
  const msk = new Date(at.toLocaleString("en-US", { timeZone: CERTIFICATE_POLICY_TIME_ZONE }));
  return msk.getTime() - utc.getTime();
}