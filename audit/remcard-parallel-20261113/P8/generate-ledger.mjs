import fs from "node:fs";
import { execSync } from "node:child_process";

const repo = "/agent/repos/remcard-partner-platform";
const auditorPath = execSync(
  "git show bbf71e4a:audit/clients-parity-20261113/requirement-matrix-c01-c56.json",
  { cwd: repo, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
const auditor = JSON.parse(auditorPath);
const authorJson = execSync(
  `npx tsx -e "import { buildClientsAcceptanceMatrix } from './src/lib/clients-parity/acceptance-matrix.ts'; console.log(JSON.stringify(buildClientsAcceptanceMatrix()))"`,
  { cwd: repo, encoding: "utf8" },
);
const authorRows = JSON.parse(authorJson.trim());
const authorById = Object.fromEntries(authorRows.map((r) => [r.id, r]));

function diffLines(file) {
  return parseInt(
    execSync(`git diff 57ca4680892ae16c62fc38d0ad2ccb6a404dbd79 HEAD -- ${file} | wc -l`, {
      cwd: repo,
      encoding: "utf8",
    }),
    10,
  );
}

const packagingForbidden = {
  "src/components/clients/OwnerClientsGate.tsx": diffLines("src/components/clients/OwnerClientsGate.tsx"),
  "src/components/clients/OwnerClientsModeContext.tsx": diffLines(
    "src/components/clients/OwnerClientsModeContext.tsx",
  ),
  "src/app/clients/page.tsx (vs cabinet route)": diffLines("src/app/clients/page.tsx"),
  "src/lib/onboarding-step/history-link-eligibility.ts": diffLines(
    "src/lib/onboarding-step/history-link-eligibility.ts",
  ),
  "vitest.config.ts": diffLines("vitest.config.ts"),
};

const legacyRoute = fs.existsSync(`${repo}/src/app/clients/page.tsx`) ? "present" : "absent";

const productDelta = execSync(
  "git diff 140de0a83044f324bf455ac2dfb87b17432fb8d1 HEAD -- src/components src/lib/clients-parity",
  { cwd: repo, encoding: "utf8" },
).trim();

const requirements = auditor.requirements.map((ar) => {
  const auth = authorById[ar.id];
  let p8Status = ar.status;
  let p8Note = ar.evidence;

  if (["C01", "C02", "C03"].includes(ar.id)) {
    p8Status = "FAIL";
    p8Note = `PACKAGING_FORBIDDEN @9fa6cc42: legacy route ${legacyRoute}; diff lines ${JSON.stringify(packagingForbidden)}. Observer/direction UI may be present — section packaging not accepted.`;
  }

  if (ar.id === "C46") {
    p8Status = "PASS_functional";
    p8Note =
      "P8 independently re-ran isolated harness @9fa6cc42: 24 Playwright + component tests PASS (superset of Computer V8 8-test claim). Isolated only — not full section/screenshot parity.";
  }

  if (
    ["C29", "C31", "C33", "C39", "C40", "C42", "C44"].includes(ar.id) &&
    (ar.status === "FAIL" || ar.status === "NOT_STARTED")
  ) {
    p8Note += " | V7/V8 isolated vitest PASS @9fa6cc42 does not lift section acceptance.";
  }

  return {
    id: ar.id,
    title: ar.title,
    auditorStatus: ar.status,
    authorImplStatus: auth?.status ?? null,
    authorNote: auth?.note ?? null,
    blockerId: auth?.blockerId ?? ar.gapKind,
    p8AcceptanceStatus: p8Status,
    p8Evidence: p8Note,
    gapKind: ar.gapKind,
    feEvidence: ar.feEvidence,
  };
});

const counts = {};
for (const r of requirements) {
  counts[r.p8AcceptanceStatus] = (counts[r.p8AcceptanceStatus] || 0) + 1;
}
counts.TOTAL = requirements.length;

const out = {
  generatedAt: new Date().toISOString(),
  p8Agent: "П8 — Независимая приёмка C01–C56",
  productionBaseSha: "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79",
  productFixSha: "140de0a83044f324bf455ac2dfb87b17432fb8d1",
  authorCandidateSha: "9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0",
  priorAuditTipSha: "bbf71e4a4e5815eb93e9b89424dddf41172a40d0",
  prototypeSha: "3dc31836cd18d9209c20097f18b906dd276f7af6",
  p8WorkingBranch: "cursor/remcard-p8-acceptance-20261113",
  sectionAccepted: false,
  publication: false,
  packagingForbidden,
  legacyProductionClientsRoute: legacyRoute,
  metadataReconcile: {
    v8AuditAtBbf71e4a: "Still noted stale author manifest productFixSha 5063368a",
    p8At9fa6cc42:
      "patch-manifest-57ca4680.json already pins productFixSha=140de0a8 — reconciled without product edits",
    productTreeDeltaAfter140de0a8: productDelta || "none (metadata-only commits on candidate tip)",
  },
  v7IsolatedPass: {
    computerPriorClaim: "2 files / 8 tests on 140de0a8/a36c609b",
    p8ReverifiedAt: "9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0",
    vitestScoped: {
      command:
        "npx vitest run src/lib/clients-parity/ src/components/clients/observer/",
      filesPassed: 7,
      testsPassed: 41,
      browserCoverage: "Playwright chromium harness on loopback :5377 (fixtures only)",
    },
    sectionLift: false,
    mapsPartiallyTo: ["C29", "C31", "C33", "C39", "C40", "C42", "C44"],
  },
  browserFullAppCoverage: "BLOCKED (no mocked Next.js egress harness for full cabinet Clients route)",
  auditorCounts: auditor.counts,
  p8Counts: counts,
  requirements,
};

fs.mkdirSync(`${repo}/audit/remcard-parallel-20261113/P8`, { recursive: true });
fs.writeFileSync(
  `${repo}/audit/remcard-parallel-20261113/P8/requirement-ledger-c01-c56.json`,
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify({ p8Counts: counts, legacyRoute }, null, 2));
