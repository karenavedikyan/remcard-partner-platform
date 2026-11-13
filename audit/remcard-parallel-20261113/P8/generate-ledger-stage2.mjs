import fs from "node:fs";
import { execSync } from "node:child_process";

const repo = "/agent/repos/remcard-partner-platform";

const TIPS = {
  P1: "c3d7c13d16a065a2733a989a43fd3915fb0e5e63",
  P2: "e0063d15cb2887f61077cdfad066615845837bb0",
  P3: "8af6b6cbe5c3e70a0f79932b62d3f78f09ff5543",
  P4: "dd76accfe94343fb17c5a96797ee4d7b010eacb2",
  P5: "c265ba6978b01b2536df2f9889a039a2aaa0380e",
  P6: "3753b24c5273a8d83b68ab88a06f0ebe6c38547c",
  P7: "9280f9e7279da14964574a6d1585499134ac7f8c",
  P8: "803b45e81334f857e3cebc04794827c4ca03da62",
};

const SHARED_BASE = "9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0";
const PRODUCTION = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79";
const PRODUCT_FIX = "140de0a83044f324bf455ac2dfb87b17432fb8d1";
const PROTOTYPE = "3dc31836cd18d9209c20097f18b906dd276f7af6";

function diffLines(base, head, file) {
  return parseInt(
    execSync(`git diff ${base} ${head} -- ${file} 2>/dev/null | wc -l`, {
      cwd: repo,
      encoding: "utf8",
    }),
    10,
  );
}

const packagingAtSharedBase = {
  "src/components/clients/OwnerClientsGate.tsx": diffLines(PRODUCTION, SHARED_BASE, "src/components/clients/OwnerClientsGate.tsx"),
  "src/components/clients/OwnerClientsModeContext.tsx": diffLines(
    PRODUCTION,
    SHARED_BASE,
    "src/components/clients/OwnerClientsModeContext.tsx",
  ),
  legacyClientsRoute: execSync(`git cat-file -e ${SHARED_BASE}:src/app/clients/page.tsx 2>/dev/null; echo $?`, {
    cwd: repo,
    encoding: "utf8",
  }).trim().endsWith("0")
    ? "present"
    : "absent",
  cabinetRoute: "present @9fa6cc42",
  "src/lib/onboarding-step/history-link-eligibility.ts": diffLines(
    PRODUCTION,
    SHARED_BASE,
    "src/lib/onboarding-step/history-link-eligibility.ts",
  ),
  "vitest.config.ts": diffLines(PRODUCTION, SHARED_BASE, "vitest.config.ts"),
};

const auditor = JSON.parse(
  execSync("git show bbf71e4a:audit/clients-parity-20261113/requirement-matrix-c01-c56.json", {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
  }),
);

/** Per-id overrides after team parallel tips (read-only git show + owner reports). */
const STAGE2 = {
  C01: {
    p8AcceptanceStatus: "FAIL",
    uiStatus: "PARTIAL",
    dataPersistenceStatus: "N/A",
    evidenceSha: SHARED_BASE,
    evidencePaths: ["src/app/(cabinet)/clients/page.tsx", "src/components/clients/ClientsListWorkspace.tsx"],
    browserProductionCheck: "BLOCKED",
    note: "Packaging vs 57ca4680 forbidden; P1 confirms list shell wiring on fixtures only.",
    owner: "P1",
  },
  C02: {
    p8AcceptanceStatus: "FAIL",
    uiStatus: "PRESENT",
    dataPersistenceStatus: "N/A",
    evidenceSha: TIPS.P6,
    evidencePaths: ["src/components/clients/direction/ClientsDirectionWorkspace.tsx", "src/components/clients/observer/ObserverPartnersWorkspace.tsx"],
    browserProductionCheck: "BLOCKED",
    note: "P6: agent observer-only composition PASS (vitest); section still FAIL packaging.",
    owner: "P6",
  },
  C03: {
    p8AcceptanceStatus: "FAIL",
    uiStatus: "PRESENT",
    dataPersistenceStatus: "N/A",
    evidenceSha: TIPS.P6,
    evidencePaths: ["src/components/clients/direction/ClientsDirectionTabs.tsx", "src/components/clients/direction/ReceivingAppealsBlocked.tsx"],
    browserProductionCheck: "BLOCKED",
    note: "P6: direction tabs + honest receiving blocker; packaging FAIL.",
    owner: "P6",
  },
  C04: { uiStatus: "PARTIAL", dataPersistenceStatus: "NOT_EXERCISED", browserProductionCheck: "NOT_RUN", owner: "P3" },
  C05: { p8AcceptanceStatus: "EXCLUDED", uiStatus: "ABSENT_BY_SCOPE", owner: "—" },
  C06: { p8AcceptanceStatus: "PASS_safety", uiStatus: "PRESENT", owner: "P6" },
  C07: {
    uiStatus: "PRESENT",
    dataPersistenceStatus: "BLOCKED_CONTRACT",
    evidenceSha: TIPS.P6,
    evidencePaths: ["src/components/clients/direction/ReceivingAppealsBlocked.tsx"],
    browserProductionCheck: "BLOCKED",
    owner: "P6",
  },
  C26: {
    uiStatus: "PRESENT",
    dataPersistenceStatus: "BLOCKED_CONTRACT",
    evidenceSha: TIPS.P7,
    evidencePaths: ["src/components/clients/observer/ObserverPartnerCard.tsx", "src/components/clients/observer/observer.module.css"],
    browserProductionCheck: "BLOCKED",
    note: "P3 vitest grouped cards; P7 compactTop 340px @9280f9e7; pixel etalon still incomplete.",
    owner: "P3+P7",
  },
  C27: {
    uiStatus: "PRESENT",
    dataPersistenceStatus: "BLOCKED_CONTRACT",
    evidenceSha: TIPS.P2,
    evidencePaths: ["src/lib/clients-parity/fetch-observer-appeals.ts", "src/lib/remcard-proxy.ts"],
    owner: "P2",
  },
  C28: {
    evidenceSha: TIPS.P7,
    evidencePaths: ["src/components/clients/observer/observer.module.css"],
    note: "P7 prototype spacing tokens; screenshot overlay still FAIL.",
    owner: "P7",
  },
  C29: {
    p8AcceptanceStatus: "PASS_functional",
    uiStatus: "PRESENT",
    dataPersistenceStatus: "N/A_FIXTURE",
    evidenceSha: TIPS.P3,
    owner: "P3",
  },
  C30: {
    uiStatus: "PRESENT",
    dataPersistenceStatus: "SESSION_ONLY",
    note: "openPartners session; reload persistence NOT_STARTED.",
    owner: "P3",
  },
  C33: {
    p8AcceptanceStatus: "PASS_functional",
    uiStatus: "PRESENT",
    dataPersistenceStatus: "N/A_FIXTURE",
    evidenceSha: TIPS.P3,
    evidencePaths: ["src/components/clients/observer/ObserverFilterChips.tsx", "src/components/clients/observer/ObserverPartnersListView.tsx"],
    owner: "P3",
  },
  C35: {
    uiStatus: "PRESENT",
    dataPersistenceStatus: "BLOCKED_PERSISTENCE",
    evidenceSha: TIPS.P5,
    evidencePaths: ["src/components/clients/observer/ObserverPersonalEditPanel.tsx"],
    browserProductionCheck: "BLOCKED",
    owner: "P5",
  },
  C36: {
    uiStatus: "PRESENT",
    dataPersistenceStatus: "BLOCKED_PERSISTENCE",
    evidenceSha: TIPS.P5,
    owner: "P5",
  },
  C37: {
    uiStatus: "PRESENT",
    dataPersistenceStatus: "BLOCKED_PERSISTENCE",
    evidenceSha: TIPS.P5,
    owner: "P5",
  },
  C39: {
    p8AcceptanceStatus: "PASS_functional",
    uiStatus: "PRESENT",
    dataPersistenceStatus: "N/A_FIXTURE",
    evidenceSha: TIPS.P4,
    evidencePaths: ["src/components/clients/observer/ObserverPartnerDetailView.tsx"],
    browserProductionCheck: "BLOCKED",
    note: "P4 synthetic navigation tests; live referred data BLOCKED.",
    owner: "P4",
  },
  C40: {
    p8AcceptanceStatus: "FAIL",
    uiStatus: "PARTIAL",
    dataPersistenceStatus: "BLOCKED_CONTRACT",
    evidenceSha: TIPS.P4,
    evidencePaths: ["src/components/clients/observer/ObserverClientDetailView.tsx"],
    note: "Fields PASS; timeline/purchase BLOCKED (P4 PARTIAL).",
    owner: "P4",
  },
  C42: {
    evidenceSha: TIPS.P7,
    note: "P7 CSS tokens + shared observer-visual-tokens; full computed diff NOT_STARTED.",
    owner: "P7",
  },
  C44: {
    evidenceSha: TIPS.P7,
    owner: "P7",
  },
  C45: {
    uiStatus: "PARTIAL",
    browserProductionCheck: "NOT_RUN",
    note: "P7 computed 12 width×theme; full screenshot pairs NOT_STARTED.",
    owner: "P7",
  },
  C46: {
    p8AcceptanceStatus: "PASS_functional",
    uiStatus: "PRESENT",
    dataPersistenceStatus: "N/A_FIXTURE",
    evidenceSha: PRODUCT_FIX,
    note: "Isolated harness; root claims 12 width/theme synthetic browser — NOT verified by P8 this stage.",
    owner: "P7+V8",
  },
  C50: {
    uiStatus: "PRESENT",
    evidenceSha: TIPS.P6,
    evidencePaths: ["src/components/clients/direction/P6.ClientsDirectionTabs.test.tsx"],
    note: "Tab roving focus P6; observer focus-visible unchanged.",
    owner: "P6",
  },
};

function defaultsFromAuditor(ar) {
  let data = "N/A";
  if (ar.serverState) data = ar.serverState === "ABSENT" ? "BLOCKED_CONTRACT" : ar.serverState;
  if (ar.blocker === "BLK-OBSERVER-PERSONAL-PERSIST" || ar.gapKind === "BLOCKED_PERSISTENCE")
    data = "BLOCKED_PERSISTENCE";
  if (ar.status === "BLOCKED_CONTRACT" || ar.gapKind === "MISSING_SERVER") data = "BLOCKED_CONTRACT";

  return {
    p8AcceptanceStatus: ar.status,
    uiStatus: ar.uiState || "N/A",
    dataPersistenceStatus: data,
    evidenceSha: SHARED_BASE,
    evidencePaths: ar.feEvidence || [],
    browserProductionCheck:
      ar.gapKind === "PACKAGING_FORBIDDEN" ? "BLOCKED" : ar.status === "NOT_STARTED" ? "NOT_RUN" : "BLOCKED",
    note: ar.evidence,
    owner: "V8-auditor",
  };
}

const requirements = auditor.requirements.map((ar) => {
  const base = defaultsFromAuditor(ar);
  const patch = STAGE2[ar.id] || {};
  return {
    id: ar.id,
    title: ar.title,
    gapKind: ar.gapKind,
    blockerId: ar.blocker || null,
    ...base,
    ...patch,
    p8Evidence: patch.note || base.note,
    p8TestsRunByP8: false,
  };
});

for (const id of ["C35", "C36", "C37", "C38"]) {
  const r = requirements.find((x) => x.id === id);
  if (r && !r.p8AcceptanceStatus.includes("BLOCKED")) r.p8AcceptanceStatus = "BLOCKED_PERSISTENCE";
}

const counts = {};
for (const r of requirements) {
  counts[r.p8AcceptanceStatus] = (counts[r.p8AcceptanceStatus] || 0) + 1;
}
counts.TOTAL = requirements.length;

const out = {
  stage: 2,
  generatedAt: new Date().toISOString(),
  p8Agent: "П8 — Независимая приёмка C01–C56",
  evaluationModel: "combined_parallel_tips_readonly_git_show",
  teamTips: TIPS,
  sharedProductBase: SHARED_BASE,
  productionBaseSha: PRODUCTION,
  productFixSha: PRODUCT_FIX,
  prototypeSha: PROTOTYPE,
  packagingAtSharedBase,
  sectionAccepted: false,
  publication: false,
  externalRootSyntheticQa: {
    description: "Root orchestrator: 120 component + 22 P7 + 12 width/theme synthetic browser (dark fallback, contextual return)",
    verifiedByP8: false,
    doesNotLift: ["backend", "persistence", "pixel_perfect", "section_acceptance"],
  },
  ownerTestEvidence: {
    P1: { sha: TIPS.P1, log: "audit/.../P1/vitest-run.log", claimed: "11 tests PASS", p8Reran: false },
    P2: { sha: TIPS.P2, log: "audit/.../P2/test-run.log", productWrites: 0, p8Reran: false },
    P3: { sha: TIPS.P3, log: "audit/.../P3/vitest-p3.log", claimed: "20 tests PASS", p8Reran: false },
    P4: { sha: TIPS.P4, log: "audit/.../P4/vitest-p4.log", claimed: "11 tests PASS", p8Reran: false },
    P5: { sha: TIPS.P5, log: "audit/.../P5/test-log.txt", claimed: "18+7 tests PASS", p8Reran: false },
    P6: { sha: TIPS.P6, log: "audit/.../P6/vitest-p6.log", claimed: "9+ keyboard PASS", p8Reran: false },
    P7: { sha: TIPS.P7, log: "audit/.../P7/test-run.log", claimed: "22 P7 + 36 shared PASS", p8Reran: false },
    P8_prior: { sha: TIPS.P8, log: "vitest-scoped.log", claimed: "41 tests PASS @9fa6cc42", p8Reran: false },
  },
  p8TestsThisStage: {
    command: "npx vitest run src/lib/clients-parity/contracts.test.ts",
    atSha: TIPS.P8,
    files: 1,
    testsPassed: 3,
    note: "BLOCKED_CONTRACT re-smoke only; parallel P3–P7 product trees verified via git show, not re-run.",
  },
  v7IsolatedRegression: {
    status: "CLOSED_ON_PRODUCT_FIX",
    notClaimedReranThisStage: true,
    priorP8Evidence: "vitest-scoped.log (41) @803b45e8 parent tree",
    rootSyntheticMayOverlap: true,
  },
  p8Counts: counts,
  p8CountCheck: `${Object.entries(counts).filter(([k]) => k !== "TOTAL").reduce((s, [, v]) => s + v, 0)} === ${counts.TOTAL}`,
  requirements,
};

const dir = `${repo}/audit/remcard-parallel-20261113/P8`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/requirement-ledger-c01-c56.json`, JSON.stringify(out, null, 2));
fs.writeFileSync(`${dir}/team-tips-pins.json`, JSON.stringify({ TIPS, SHARED_BASE, packagingAtSharedBase }, null, 2));
console.log(JSON.stringify({ p8Counts: counts }, null, 2));
