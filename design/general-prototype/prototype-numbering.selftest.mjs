/**
 * Static sanity checks for numbering keys (no DOM). Run: node prototype-numbering.selftest.mjs
 */
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const a = fnv1a("3|roles|href:#/catalog|path:main");
const b = fnv1a("3|roles|href:#/navigator|path:main");
assert.notEqual(a, b, "different hashes should differ for distinct hrefs");

const src = readFileSync(new URL("./prototype-numbering.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./prototype-numbering.css", import.meta.url), "utf8");
assert.match(src, /data-proto-number/, "targets must be marked");
assert.match(src, /mutationIsRelevant/, "observer filter required");
assert.match(css, /pointer-events:\s*none/, "badges must be non-interactive");
assert.doesNotMatch(src, /seen\.has\(key\)/, "must not dedupe by semantic key alone");

console.log("prototype-numbering.selftest: ok");
