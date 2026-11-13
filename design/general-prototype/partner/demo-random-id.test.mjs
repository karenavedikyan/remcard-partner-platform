/**
 * Run: node design/general-prototype/partner/demo-random-id.test.mjs
 */
import assert from "node:assert/strict";
import { demoRandomId, demoRandomToken } from "./demo-random-id.js";

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const origCrypto = globalThis.crypto;

function withCryptoStub(stub, run) {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: stub,
  });
  try {
    run();
  } finally {
    if (origCrypto) {
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: origCrypto });
    } else {
      delete globalThis.crypto;
    }
  }
}

withCryptoStub({ getRandomValues: (buf) => buf.fill(0) }, () => {
  const ids = [];
  for (let i = 0; i < 8; i += 1) ids.push(demoRandomId());
  assert.equal(new Set(ids).size, ids.length, "fallback ids must differ when randomUUID missing");
  for (const id of ids) {
    assert.match(id, UUID_V4_RE, `id must be uuid v4-shaped: ${id}`);
    assert.doesNotMatch(id, /^00000000-0000-4000-8000-/i, "must not use constant zero prefix");
  }

  const tokens = [];
  for (let i = 0; i < 12; i += 1) tokens.push(demoRandomToken(8));
  assert.equal(new Set(tokens).size, tokens.length, "12 certificate tokens must not duplicate");
  for (const token of tokens) {
    assert.equal(token.length, 8);
    assert.match(token, /^[0-9A-F]{8}$/);
    assert.notEqual(token, "00000000", "token must not be all-zero");
  }
});

withCryptoStub(
  {
    randomUUID: () => {
      throw new TypeError("randomUUID unavailable");
    },
    getRandomValues: (buf) => {
      for (let i = 0; i < buf.length; i += 1) buf[i] = (i * 17 + 3) % 256;
      return buf;
    },
  },
  () => {
    const id = demoRandomId();
    assert.match(id, UUID_V4_RE);
    const a = demoRandomToken(8);
    const b = demoRandomToken(8);
    assert.notEqual(a, b);
  },
);

withCryptoStub(undefined, () => {
  const id = demoRandomId();
  assert.match(id, UUID_V4_RE);
});

if (origCrypto?.randomUUID) {
  const native = demoRandomId();
  assert.match(native, UUID_V4_RE);
}

console.log("demo-random-id.test.mjs: ok");
