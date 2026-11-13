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
  "02-V2-QA-STATIC-COMPAT.md",
  "03-V2-VISUAL-BASELINE-AND-DIFF.md",
  "04-V2-QA-SUMMARY.json",
  "05-V3-QA-FORBIDDEN-COMPAT.md",
  "06-V3-BACKEND-HANDLERS-READONLY.md",
  "07-V3-AUTHOR-FOLLOWUP.md",
  "08-V3-QA-SUMMARY.json",
  "requirement-matrix-c01-c56.json",
  "candidate-isolated-listview/isolated-mount-report.json",
  "page-matrix.json",
  "action-inventory.json",
  "action-field-keyboard-inventory.json",
  "contract-audit.json",
  "element-state-matrix.csv",
  "prototype-baseline/computed-style-baseline.json",
  "candidate-mount/computed-style-candidate.json",
  "candidate-mount/visual-diff-summary.json",
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
if (!contracts.implCandidateSha || contracts.implCandidateSha.length < 40) {
  console.error("contract-audit.implCandidateSha missing");
  failed++;
}

const reqs = JSON.parse(
  readFileSync(path.join(audit, "requirement-matrix-c01-c56.json"), "utf8"),
);
const reqIds = new Set((reqs.requirements || []).map((r) => r.id));
for (let i = 1; i <= 56; i++) {
  const id = `C${String(i).padStart(2, "0")}`;
  if (!reqIds.has(id)) {
    console.error(`requirement-matrix missing ${id}`);
    failed++;
  }
}
if (reqs.implCandidateSha !== contracts.implCandidateSha) {
  console.error("implCandidateSha mismatch between requirement-matrix and contract-audit");
  failed++;
}

const proto = JSON.parse(
  readFileSync(path.join(audit, "prototype-baseline/computed-style-baseline.json"), "utf8"),
);
const cand = JSON.parse(
  readFileSync(path.join(audit, "candidate-mount/computed-style-candidate.json"), "utf8"),
);
const vis = JSON.parse(
  readFileSync(path.join(audit, "candidate-mount/visual-diff-summary.json"), "utf8"),
);
if ((proto.measurements || []).length !== 12) {
  console.error(`prototype baseline shots expected 12, got ${(proto.measurements || []).length}`);
  failed++;
}
if ((cand.measurements || []).length !== 12) {
  console.error(`candidate mount shots expected 12, got ${(cand.measurements || []).length}`);
  failed++;
}
if (vis.functionalVisualVerdict === "PASS" && (vis.visualPassCount || 0) < 12) {
  console.error("visual PASS claimed without 12 passes");
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
      implCandidateSha: contracts.implCandidateSha,
      visualVerdict: vis.functionalVisualVerdict,
      visualPass: vis.visualPassCount,
      visualFail: vis.visualFailCount,
      requirementRows: reqs.requirements?.length,
    },
    null,
    2,
  ),
);
process.exit(failed === 0 ? 0 : 1);
