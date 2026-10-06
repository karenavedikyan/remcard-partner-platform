/**
 * Extract certificate lookup code from QR payload or manual input.
 * Mirrors navigator store/scan extractCode — codes only, never fetches URLs.
 */
export function extractCertificateCode(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "";
  }

  const remcardMatch = trimmed.match(/remcard\.ru\/certificate\/([^/?#]+)/i);
  if (remcardMatch?.[1]) {
    return decodeURIComponent(remcardMatch[1]);
  }

  const localMatch = trimmed.match(
    /(?:127\.0\.0\.1|localhost)(?::\d+)?\/certificate\/([^/?#]+)/i,
  );
  if (localMatch?.[1]) {
    return decodeURIComponent(localMatch[1]);
  }

  const pathMatch = trimmed.match(/\/certificate\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    return decodeURIComponent(pathMatch[1]);
  }

  const addMatch = trimmed.match(/\/certificate\/([^/?#]+)\/add/i);
  if (addMatch?.[1]) {
    return decodeURIComponent(addMatch[1]);
  }

  return trimmed;
}
