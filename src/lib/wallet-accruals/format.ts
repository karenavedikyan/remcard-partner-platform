import { formatMoneyRub } from "@/lib/history-format";
import { mskCalendarDateFromInstant } from "@/lib/specialist-settlements/mskCalendar";

/** Split formatted ruble string into amount and currency for header contrast styling. */
export function formatHistoryTotalParts(totalRub: number): { amount: string; currency: string } {
  const rub = formatMoneyRub(totalRub);
  const suffix = " ₽";
  if (rub.endsWith(suffix)) {
    return { amount: rub.slice(0, -suffix.length), currency: suffix };
  }
  return { amount: rub, currency: "" };
}

/** Calendar day in Europe/Moscow — never browser-local date slicing. */
export function formatIsoShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = mskCalendarDateFromInstant(iso);
  if (!day) return "—";
  const [y, m, d] = day.split("-");
  if (!y || !m || !d) return "—";
  return `${d}.${m}.${y}`;
}

export function formatDeadlineShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return `до ${formatIsoShort(iso)}`;
}

export function confirmDaysLabel(days: number | null | undefined): string {
  if (days == null) return "—";
  if (days === 0) return "без ожидания";
  return `${days} дн`;
}

/** Readable order reference when API has no public order number field. */
export function formatPurchaseRef(orderId: string): string {
  const trimmed = orderId.trim();
  if (trimmed.length <= 10) return trimmed;
  return trimmed.slice(-8).toUpperCase();
}
