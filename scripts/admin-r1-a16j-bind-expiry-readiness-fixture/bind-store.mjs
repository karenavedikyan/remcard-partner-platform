import { randomBytes } from "node:crypto";

/**
 * Stateful admin notification bind model aligned with backend:
 * POST /notification-bind/start → pending botLoginCode-like challenge
 * GET /notification-bind/status → linked flags only (no pending field on real BE)
 * Bot completion → linked; expired/used tokens reject completion.
 */

/** @typedef {"TELEGRAM"|"MAX"} BindProvider */

export function createBindStore() {
  /** @type {{ telegramLinked: boolean, maxLinked: boolean }} */
  let linked = { telegramLinked: false, maxLinked: false };

  /** @type {Map<BindProvider, { token: string, expiresAtMs: number, startPayload: string }>} */
  const pending = new Map();

  let seq = 0;

  function reset() {
    linked = { telegramLinked: false, maxLinked: false };
    pending.clear();
    seq = 0;
  }

  function normalizeProvider(raw) {
    return raw === "MAX" ? "MAX" : "TELEGRAM";
  }

  /**
   * @param {BindProvider} provider
   * @param {{ ttlMs?: number }} [opts]
   */
  function start(provider, opts = {}) {
    const p = normalizeProvider(provider);
    pending.delete(p);
    seq += 1;
    const token = `qa_${p.toLowerCase()}_${seq}_${randomBytes(6).toString("hex")}`;
    const ttlMs = typeof opts.ttlMs === "number" ? opts.ttlMs : 10 * 60 * 1000;
    const expiresAtMs = Date.now() + ttlMs;
    const startPayload = `nbind_admin_${token}`;
    const hint =
      p === "TELEGRAM"
        ? "Откройте бота RemCard и подтвердите привязку по ссылке (синтетика, localhost)."
        : "В MAX откройте бота и отправьте /start с кодом ниже (синтетика, localhost).";
    const deepLink =
      p === "TELEGRAM" ? `https://t.me/RemCardBot?start=${encodeURIComponent(startPayload)}` : null;
    pending.set(p, { token, expiresAtMs, startPayload });
    return {
      provider: p,
      expiresAt: new Date(expiresAtMs).toISOString(),
      deepLink,
      startPayload,
      hint,
      token,
    };
  }

  function getStatus() {
    return { ...linked };
  }

  function forceLink(provider) {
    const p = normalizeProvider(provider);
    if (p === "TELEGRAM") linked.telegramLinked = true;
    else linked.maxLinked = true;
    pending.delete(p);
  }

  function expirePending(provider) {
    const p = normalizeProvider(provider);
    const row = pending.get(p);
    if (row) row.expiresAtMs = Date.now() - 1000;
  }

  /**
   * @param {BindProvider} provider
   * @param {string} [tokenFromPayload]
   */
  function completeFromBot(provider, tokenFromPayload) {
    const p = normalizeProvider(provider);
    const row = pending.get(p);
    if (!row) return { ok: false, code: "NOT_FOUND", message: "Нет активной привязки" };
    if (Date.now() > row.expiresAtMs) {
      return { ok: false, code: "EXPIRED", message: "Ссылка устарела" };
    }
    const token = tokenFromPayload?.trim();
    if (token && token !== row.token) {
      return { ok: false, code: "NOT_FOUND", message: "Неверный код" };
    }
    pending.delete(p);
    if (p === "TELEGRAM") linked.telegramLinked = true;
    else linked.maxLinked = true;
    return { ok: true, provider: p };
  }

  function pendingSnapshot() {
    const out = {};
    for (const [k, v] of pending.entries()) {
      out[k] = { expiresAt: new Date(v.expiresAtMs).toISOString(), hasPending: true };
    }
    return out;
  }

  return {
    reset,
    start,
    getStatus,
    forceLink,
    expirePending,
    completeFromBot,
    pendingSnapshot,
  };
}
