/** Prototype-only IDs for demos; not production auth or certificate identifiers. */

let demoIdSeq = 0;
let demoTokenSeq = 0;

function randomHexByteCount(bytes) {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    try {
      const buf = new Uint8Array(bytes);
      crypto.getRandomValues(buf);
      return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // fall through
    }
  }
  let out = "";
  for (let i = 0; i < bytes; i += 1) {
    out += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  }
  return out;
}

function formatUuidV4Hex(entropyHex) {
  const ent = entropyHex.replace(/[^0-9a-f]/gi, "").padEnd(12, "0").slice(0, 12);
  const tick = Date.now().toString(16).padStart(12, "0").slice(-12);
  const seq = demoIdSeq.toString(16).padStart(8, "0").slice(-8);
  const mixed = `${ent}${tick}${seq}`.padEnd(32, "0").slice(0, 32);
  const variant = ((parseInt(mixed.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  return `${mixed.slice(0, 8)}-${mixed.slice(8, 12)}-4${mixed.slice(12, 15)}-${variant}${mixed.slice(
    18,
    20,
  )}-${mixed.slice(20, 32)}`;
}

function fallbackDemoRandomId() {
  demoIdSeq += 1;
  return formatUuidV4Hex(randomHexByteCount(16));
}

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  const id = fallbackDemoRandomId();
  if (!UUID_V4_RE.test(id)) {
    return formatUuidV4Hex(randomHexByteCount(16));
  }
  return id;
}

/** Uppercase hex slice for display codes (certificate prefix suffix). */
export function demoRandomToken(length = 8) {
  demoTokenSeq += 1;
  const head = `${demoTokenSeq.toString(16)}${Date.now().toString(16)}${randomHexByteCount(
    Math.max(4, Math.ceil(length / 2)),
  )}`;
  const hex = head.toUpperCase().replace(/[^0-9A-F]/g, "");
  if (hex.length >= length) return hex.slice(0, length);
  return (hex + randomHexByteCount(4).toUpperCase()).slice(0, length);
}
