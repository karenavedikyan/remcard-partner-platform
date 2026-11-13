/**
 * Run: node design/general-prototype/partner/demo-random-id.test.mjs
 */
import assert from "node:assert/strict";
import { demoRandomId, demoRandomToken } from "./demo-random-id.js";

const origRandomUuid = globalThis.crypto?.randomUUID;

function withoutRandomUuid(run) {
  if (!globalThis.crypto) {
    globalThis.crypto = {};
  }
  if (origRandomUuid) {
    try {
      delete globalThis.crypto.randomUUID;
    } catch {
      globalThis.crypto.randomUUID = undefined;
    }
  }
  try {
    run();
  } finally {
    if (origRandomUuid) {
      globalThis.crypto.randomUUID = origRandomUuid;
    }
  }
}

withoutRandomUuid(() => {
  const a = demoRandomId();
  const b = demoRandomId();
  assert.notEqual(a, b, "fallback ids must differ within session");
  assert.match(a, /^[0-9a-f-]{36}$/i, "fallback id is uuid-shaped");
  const token = demoRandomToken(8);
  assert.equal(token.length, 8);
  assert.match(token, /^[0-9A-F]{8}$/);
});

if (origRandomUuid) {
  const native = demoRandomId();
  assert.match(native, /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
}

console.log("demo-random-id.test.mjs: ok");
