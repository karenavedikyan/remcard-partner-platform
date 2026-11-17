/**
 * Extract certificate lookup code from QR payload or manual input.
 * Mirrors navigator store/scan extractCode — codes only, never fetches URLs.
 */

export type CertificateCodeResult =
  | { ok: true; code: string }
  | { ok: false; error: string };

function safeDecodeSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

/**
 * Promo codes (`RC-…`) are case-insensitive and always upper-case; opaque QR tokens are
 * case-exact and must reach the server untouched.
 */
function normalizeLookupCode(code: string): string {
  return /^rc-/i.test(code) ? code.toUpperCase() : code;
}

/**
 * Parse QR text or manual input into a certificate lookup code.
 * Never throws; does not fetch URL contents.
 */
export function parseCertificateCode(text: string): CertificateCodeResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: "Укажите код документа" };
  }

  const remcardMatch = trimmed.match(/remcard\.ru\/certificate\/([^/?#]+)/i);
  if (remcardMatch?.[1]) {
    const code = safeDecodeSegment(remcardMatch[1]);
    if (!code) {
      return { ok: false, error: "Некорректная ссылка в QR-коде. Введите код вручную." };
    }
    return { ok: true, code: normalizeLookupCode(code) };
  }

  const localMatch = trimmed.match(
    /(?:127\.0\.0\.1|localhost)(?::\d+)?\/certificate\/([^/?#]+)/i,
  );
  if (localMatch?.[1]) {
    const code = safeDecodeSegment(localMatch[1]);
    if (!code) {
      return { ok: false, error: "Некорректная ссылка в QR-коде. Введите код вручную." };
    }
    return { ok: true, code: normalizeLookupCode(code) };
  }

  const addMatch = trimmed.match(/\/certificate\/([^/?#]+)\/add/i);
  if (addMatch?.[1]) {
    const code = safeDecodeSegment(addMatch[1]);
    if (!code) {
      return { ok: false, error: "Некорректная ссылка в QR-коде. Введите код вручную." };
    }
    return { ok: true, code: normalizeLookupCode(code) };
  }

  const pathMatch = trimmed.match(/\/certificate\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    const code = safeDecodeSegment(pathMatch[1]);
    if (!code) {
      return { ok: false, error: "Некорректная ссылка в QR-коде. Введите код вручную." };
    }
    return { ok: true, code: normalizeLookupCode(code) };
  }

  return { ok: true, code: normalizeLookupCode(trimmed) };
}

/** @deprecated Prefer parseCertificateCode for UI flows that need error messages. */
export function extractCertificateCode(text: string): string {
  const parsed = parseCertificateCode(text);
  return parsed.ok ? parsed.code : "";
}
