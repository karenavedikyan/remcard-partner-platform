#!/usr/bin/env node
/**
 * Bounded validator for audit/clients-parity-20261113 artifacts.
 * No product imports, no network, no heavy build.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const audit = path.join(root, "audit/clients-parity-20261113");
const required = [
  "00-ACKNOWLEDGEMENT.md",
  "01-EARLY-API-OWNERSHIP-PERSISTENCE-BLOCKERS.md",
  "page-matrix.json",
  "action-inventory.json",
  "contract-audit.json",
  "element-state-matrix.csv",
];

let failed = 0;
for (const name of required) {
  const p = path.join(audit, name);
  if (!existsSync(p)) {
    console.error(`MISSING ${name}`);
    failed++;
  } else {
    console.log(`OK ${name}`);
  }
}

const matrix = JSON.parse(readFileSync(path.join(audit, "page-matrix.json"), "utf8"));
const pages = matrix.pages || [];
const nums = new Set(pages.map((p) => p.page));
for (let n = 79; n <= 123; n++) {
  if (!nums.has(n)) {
    console.error(`page-matrix missing page ${n}`);
    failed++;
  }
}
for (const n of [141, 142, 143, 144, 145, 146, 147]) {
  if (!nums.has(n)) {
    console.error(`page-matrix missing boundary page ${n}`);
    failed++;
  }
}
const excludedAgent = [107, 108, 109, 110, 111, 112];
for (const n of excludedAgent) {
  const row = pages.find((p) => p.page === n);
  if (!row || row.status !== "EXCLUDED") {
    console.error(`page ${n} must be EXCLUDED`);
    failed++;
  }
}

const actions = JSON.parse(readFileSync(path.join(audit, "action-inventory.json"), "utf8"));
if ((actions.dataCaActions?.length || 0) < 1) {
  console.error("action-inventory dataCaActions empty");
  failed++;
}

const contracts = JSON.parse(readFileSync(path.join(audit, "contract-audit.json"), "utf8"));
if (contracts.summary?.personalReferrerOverlayContractExists !== false) {
  console.error("personalReferrerOverlayContractExists must be false until proven");
  failed++;
}

console.log(
  JSON.stringify(
    {
      ok: failed === 0,
      failed,
      pageCount: pages.length,
      caActions: actions.dataCaActions?.length,
      observerActions: actions.dataObserverActions?.length,
    },
    null,
    2,
  ),
);
process.exit(failed === 0 ? 0 : 1);
