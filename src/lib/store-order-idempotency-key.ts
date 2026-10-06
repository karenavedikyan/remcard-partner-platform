/** Mirrors navigator `parseIdempotencyKeyHeader` — BFF-only validation. */

export const STORE_ORDER_IDEMPOTENCY_KEY_MAX_LENGTH = 128;

const STORE_ORDER_IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export type ParseStoreOrderIdempotencyKeyResult =
  | { ok: true; key: string }
  | { ok: false; error: string };

export function parseStoreOrderIdempotencyKey(
  raw: string | null | undefined,
): ParseStoreOrderIdempotencyKeyResult {
  if (raw == null || raw === "") {
    return { ok: false, error: "Idempotency-Key обязателен для оформления покупки" };
  }

  const key = raw.trim();
  if (!key) {
    return { ok: false, error: "Idempotency-Key не может быть пустым" };
  }
  if (key.length > STORE_ORDER_IDEMPOTENCY_KEY_MAX_LENGTH) {
    return { ok: false, error: "Idempotency-Key слишком длинный" };
  }
  if (!STORE_ORDER_IDEMPOTENCY_KEY_PATTERN.test(key)) {
    return { ok: false, error: "Некорректный формат Idempotency-Key" };
  }

  return { ok: true, key };
}
