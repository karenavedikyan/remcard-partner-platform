/**
 * Cabinet standalone embed integration checks.
 * Run: node design/general-prototype/prototype-cabinet-integration.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));

const host = readFileSync(path.join(root, "partner/cabinet-standalone-host.js"), "utf8");
const roles = readFileSync(path.join(root, "partner/roles.js"), "utf8");
const wallet = readFileSync(path.join(root, "partner/wallet-accruals.js"), "utf8");
const index = readFileSync(path.join(root, "index.html"), "utf8");
const numbering = readFileSync(path.join(root, "prototype-numbering.js"), "utf8");

assert.match(host, /STANDALONE_BY_N/, "standalone catalog");
assert.match(host, /cabinet_embed/, "embed query");
assert.match(roles, /cabinet-standalone-host/, "roles imports host");
assert.match(roles, /proto-standalone:143/, "partner cooperation embed action");
assert.match(roles, /handleStandaloneHostClick/, "roles wires standalone clicks");
assert.match(wallet, /proto-standalone:147/, "wallet hub in cabinet");
assert.match(index, /proto_standalone=143/, "hub launches cabinet 143");
assert.doesNotMatch(index, /href="\.\/partner\/partner-cooperation-detail\.html"/, "no bare 143 hub link");
assert.match(numbering, /__protoCabinetEmbeddedPage/, "embedded page badge");

for (const n of [143, 144, 147]) {
  const file = {
    143: "partner/partner-cooperation-detail.html",
    144: "partner/partner-purchase-detail.html",
    147: "partner/partner-wallet-history.html",
  }[n];
  const html = readFileSync(path.join(root, file), "utf8");
  assert.match(html, /prototype-cabinet-embed\.js/, `${file} embed child script`);
}

console.log("prototype-cabinet-integration.mjs: ok");
