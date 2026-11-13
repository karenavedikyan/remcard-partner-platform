/** Prototype-only IDs for demos; not production auth or certificate identifiers. */

let demoIdSeq = 0;

function fallbackDemoRandomId() {
  demoIdSeq += 1;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12);
  return `00000000-0000-4000-8000-${time}${demoIdSeq}${rand}`.slice(0, 36);
}

/**
 * UUID-shaped demo id when secure `crypto.randomUUID` is unavailable (e.g. opaque sandbox srcdoc).
 */
export function demoRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // non-secure context may throw even when the function exists
    }
  }
  return fallbackDemoRandomId();
}

/** Uppercase alphanumeric slice for display codes (certificate prefix suffix). */
export function demoRandomToken(length = 8) {
  const raw = demoRandomId().replace(/[^a-fA-F0-9]/g, "");
  const mix = (raw + Date.now().toString(16) + demoIdSeq.toString(16)).toUpperCase();
  return mix.slice(0, Math.max(1, length)).padEnd(length, "0");
}
