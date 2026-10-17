/** Display + editing helpers aligned with backend normalizePhone (+7XXXXXXXXXX). */

const PHONE_CHARS = /^\+?[\d\s().-]+$/;

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

function compactPlusPrefix(text: string): string {
  return text.replace(/\s/g, "");
}

/** Normalize user text to canonical +7XXXXXXXXXX or empty if invalid. */
export function canonicalizeRuContactPhone(raw: string): string {
  const text = String(raw ?? "")
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\s\u00a0]+/g, " ");
  if (!text) return "";
  if (!PHONE_CHARS.test(text)) return "";
  const compact = compactPlusPrefix(text);
  if (compact.startsWith("+") && !compact.startsWith("+7")) {
    return "";
  }
  let digits = digitsOnly(text);
  if (digits.length === 11 && digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10 && !compact.startsWith("+")) digits = `7${digits}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  return "";
}

/** Display formatting for stored +79186360088. */
export function formatPhoneForDisplay(stored: string | undefined | null): string {
  const canonical = canonicalizeRuContactPhone(stored ?? "");
  if (!canonical) {
    const trimmed = String(stored ?? "").trim();
    return trimmed;
  }
  const digits = digitsOnly(canonical);
  return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
}

/** Light typing normalization — keeps invalid letters, no forced mask per keystroke. */
export function sanitizePhoneTyping(raw: string): string {
  return raw.replace(/[\u2010-\u2015\u2212]/g, "-");
}

/** @deprecated Prefer sanitizePhoneTyping + blur canonicalize. Kept for non-agent consumers. */
export function formatPhoneInput(raw: string): string {
  const canonical = canonicalizeRuContactPhone(raw);
  if (canonical) return formatPhoneForDisplay(canonical);
  return sanitizePhoneTyping(raw);
}

export function isCompleteRuPhone(raw: string): boolean {
  const canonical = canonicalizeRuContactPhone(raw);
  return canonical !== "" && /^\+7\d{10}$/.test(canonical);
}

export const CONTACT_PHONE_ERROR =
  "Введите 10 цифр номера или 11 цифр с начальной 8/7. Например: 9186360088 или 89186360088. Сохраним как +79186360088.";
