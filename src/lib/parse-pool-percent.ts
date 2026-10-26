/** Parses pool percent from form input; supports comma decimal separator. */
export function parsePoolPercentInput(
  raw: string,
): { ok: true; value: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Укажите процент" };
  }
  const normalized = trimmed.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { ok: false, error: "Пул должен быть от 0 до 100" };
  }
  return { ok: true, value: Math.round(n * 1000) / 1000 };
}
