/** Server-safe: parse ?hidden=p004.p005 from client catalog preview URLs. */
export function parseClientPreviewHidden(
  searchParams: Record<string, string | string[] | undefined>,
): string[] {
  const h = searchParams.hidden;
  const raw = Array.isArray(h) ? h[0] : h;
  if (!raw) return [];
  return raw.split(".").filter(Boolean);
}