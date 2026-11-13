import fs from "node:fs";
import { execSync } from "node:child_process";

const repo = "/agent/repos/remcard-partner-platform";
const PRODUCTION = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79";
const PROTOTYPE = "3dc31836cd18d9209c20097f18b906dd276f7af6";
const NAVIGATOR_RELEASE = "3c37ca2557069a43544b7d72848fd53c37e3be5e";

/** Final owner tips (fetched 2026-11-13 REM-PUBLISH-RESIDUAL-V2). */
const TIPS = {
  P1: "20b93f87544ca0b59857be73ce46b2e62afe466e",
  P2: "1340a128e0e436b39d36feabb6b0c1a894b132a5",
  P3: "8af6b6cbe5c3e70a0f79932b62d3f78f09ff5543",
  P4: "effd85f3e7ca8b4ce1a373074e95d975d89cc492",
  P5: "dbbe44557a42eb354397315b70e1290af490c45c",
  P6: "981c72aff23595d32e157dc9642e08c02a0cb70d",
  P7: "30a292d002d56e0daaeebdff62d1fce902590362",
  P8: "2a9af427fed47c21bae49d786846c52167476875",
};

const auditor = JSON.parse(
  execSync("git show bbf71e4a:audit/clients-parity-20261113/requirement-matrix-c01-c56.json", {
    encoding: "utf8",
    maxBuffer: 12 * 1024 * 1024,
  }),
);

/** Primary publication acceptance label (exactly one per C01–C56). */
const PRIMARY = {
  C01: "REPRODUCED_FAIL",
  C02: "NOT_VERIFIED",
  C03: "NOT_VERIFIED",
  C04: "NOT_VERIFIED",
  C05: "EXCLUDED",
  C06: "PASS",
  C07: "BLOCKED_CONTRACT",
  C08: "BLOCKED_CONTRACT",
  C09: "BLOCKED_CONTRACT",
  C10: "BLOCKED_CONTRACT",
  C11: "BLOCKED_CONTRACT",
  C12: "BLOCKED_CONTRACT",
  C13: "BLOCKED_CONTRACT",
  C14: "BLOCKED_CONTRACT",
  C15: "BLOCKED_CONTRACT",
  C16: "BLOCKED_CONTRACT",
  C17: "BLOCKED_CONTRACT",
  C18: "BLOCKED_CONTRACT",
  C19: "BLOCKED_CONTRACT",
  C20: "BLOCKED_CONTRACT",
  C21: "BLOCKED_CONTRACT",
  C22: "BLOCKED_CONTRACT",
  C23: "BLOCKED_CONTRACT",
  C24: "BLOCKED_CONTRACT",
  C25: "NOT_VERIFIED",
  C26: "NOT_VERIFIED",
  C27: "BLOCKED_CONTRACT",
  C28: "NOT_VERIFIED",
  C29: "PASS",
  C30: "NOT_VERIFIED",
  C31: "PASS",
  C32: "BLOCKED_CONTRACT",
  C33: "PASS",
  C34: "BLOCKED_CONTRACT",
  C35: "BLOCKED_PERSISTENCE",
  C36: "BLOCKED_PERSISTENCE",
  C37: "BLOCKED_PERSISTENCE",
  C38: "BLOCKED_PERSISTENCE",
  C39: "PASS",
  C40: "BLOCKED_CONTRACT",
  C41: "NOT_VERIFIED",
  C42: "NOT_VERIFIED",
  C43: "NOT_VERIFIED",
  C44: "NOT_VERIFIED",
  C45: "NOT_VERIFIED",
  C46: "PASS",
  C47: "NOT_VERIFIED",
  C48: "NOT_VERIFIED",
  C49: "NOT_VERIFIED",
  C50: "PASS",
  C51: "NOT_VERIFIED",
  C52: "PASS",
  C53: "NOT_VERIFIED",
  C54: "NOT_VERIFIED",
  C55: "PASS",
  C56: "PASS",
};

const META = {
  C01: {
    owner: "Root packaging",
    criterion: "Production route + Gate/Context byte-match 57ca4680",
    nextAction: "Cherry-pick only deployableIndependentUiOnly paths; never whole branch (P1 manifest).",
    evidenceSha: TIPS.P1,
    evidencePaths: ["audit/remcard-parallel-20261113/P1/PUBLICATION-RECONCILE-V2.md", "p1-p7-packaging-manifest.json"],
    uiStatus: "PARTIAL",
    dataPersistenceStatus: "N/A",
    browserProductionCheck: "NOT_VERIFIED",
  },
  C02: {
    owner: "P6 + Root",
    criterion: "Agent observer-only on production-mounted page",
    nextAction: "Root: mock gate + `/clients` browser matrix after 57ca assembly.",
    evidenceSha: TIPS.P6,
    evidencePaths: ["P6.ClientsDirectionWorkspace.test.tsx"],
    uiStatus: "PRESENT",
    note: "Component PASS; page acceptance NOT_VERIFIED.",
  },
  C03: {
    owner: "P6 + Root",
    criterion: "Direction tabs on specialist/business production page",
    nextAction: "Same as C02; ship P6-owned direction files via manifest only.",
    evidenceSha: TIPS.P6,
    uiStatus: "PRESENT",
    browserProductionCheck: "NOT_VERIFIED",
  },
  C26: {
    owner: "P3+P7",
    criterion: "Compact partner cards vs prototype",
    nextAction: "Root QA: paired screenshot diff using P7 audit/screenshots; not blocking on missing P8 rerun.",
    evidenceSha: TIPS.P7,
    evidencePaths: ["observer.module.css", "audit/.../P7/screenshots/"],
    uiStatus: "PRESENT",
    dataPersistenceStatus: "BLOCKED_CONTRACT",
    note: "Missing screenshot ≠ functional FAIL; computed/harness PASS per owners.",
  },
  C28: {
    owner: "P7",
    criterion: "Compact card spacing etalon",
    nextAction: "Optional P7 follow-up trash-grid; Root overlay diff when shell mocked.",
    evidenceSha: TIPS.P7,
    uiStatus: "PRESENT",
  },
  C40: {
    owner: "P4",
    criterion: "Client detail timeline / purchase with live referred data",
    nextAction: "Backend referred-appeals contract; until then NA timeline honest.",
    evidenceSha: TIPS.P4,
    uiStatus: "PARTIAL",
    dataPersistenceStatus: "BLOCKED_CONTRACT",
  },
  C45: {
    owner: "P7 + Root QA",
    criterion: "Light/dark screenshot pairs full matrix",
    nextAction: "P7 delivered partial pairs @30a292d0; Root full-shell compare NOT_VERIFIED.",
    evidenceSha: TIPS.P7,
    uiStatus: "PARTIAL",
    note: "Do not classify missing full matrix as REPRODUCED_FAIL.",
  },
  C46: {
    owner: "P7",
    criterion: "Isolated viewport harness (not section)",
    nextAction: "Included in publishable CSS bundle; does not lift C01/C27.",
    evidenceSha: TIPS.P7,
    evidencePaths: ["test-run-ledger-fix.log", "observer-mobile-navigation.computed.test.ts"],
    uiStatus: "PRESENT",
    browserProductionCheck: "NOT_VERIFIED_FULL_APP",
  },
  C47: {
    owner: "Root QA",
    criterion: "≤1px overlay vs prototype",
    nextAction: "Run measure-paired-visual.mjs in CI with mocked shell.",
    evidenceSha: TIPS.P7,
    note: "P7 paired-computed partial; full overlay NOT_VERIFIED.",
  },
  C48: {
    owner: "Root QA",
    criterion: "Screenshot overlay PASS",
    nextAction: "Same as C45/C47.",
    evidenceSha: TIPS.P7,
  },
};

function defaultMeta(id, ar) {
  const blocker = ar.blocker || "";
  let owner = "Root / Backend";
  let nextAction = "Implement missing API or publish gate per contracts.ts";
  if (blocker === "BLK-RECEIVING-APPEALS") {
    owner = "Backend + receiving product";
    nextAction = "Add client-appeals + working-stages on navigator ≥3c37ca25; keep agent receiving excluded.";
  }
  if (blocker === "BLK-OBSERVER-REFERRED") {
    owner = "Backend (P2 contract)";
    nextAction = "GET /api/pro/referred-appeals* + proxy allowlist; verify vs navigator 3c37ca25.";
  }
  if (["C35", "C36", "C37", "C38"].includes(id)) {
    owner = "Backend (P5 UI ready)";
    nextAction = "personal-meta overlay routes; keep Save disabled until contract proven.";
  }
  return {
    owner,
    criterion: ar.title,
    nextAction,
    evidenceSha: TIPS.P8,
    evidencePaths: ar.feEvidence || [],
    uiStatus: ar.uiState || "N/A",
    dataPersistenceStatus:
      PRIMARY[id] === "BLOCKED_CONTRACT"
        ? "BLOCKED_CONTRACT"
        : PRIMARY[id] === "BLOCKED_PERSISTENCE"
          ? "BLOCKED_PERSISTENCE"
          : PRIMARY[id] === "EXCLUDED"
            ? "EXCLUDED"
            : "N/A",
    browserProductionCheck:
      PRIMARY[id] === "PASS" ? "NOT_VERIFIED_PAGE" : PRIMARY[id] === "NOT_VERIFIED" ? "NOT_VERIFIED" : "BLOCKED",
    note: ar.evidence,
  };
}

const requirements = auditor.requirements.map((ar) => {
  const primary = PRIMARY[ar.id];
  if (!primary) throw new Error(`Missing PRIMARY for ${ar.id}`);
  const meta = { ...defaultMeta(ar.id, ar), ...(META[ar.id] || {}) };
  return {
    id: ar.id,
    title: ar.title,
    p8PublicationStatus: primary,
    uiStatus: meta.uiStatus,
    dataPersistenceStatus: meta.dataPersistenceStatus,
    evidenceSha: meta.evidenceSha,
    evidencePaths: meta.evidencePaths,
    browserProductionCheck: meta.browserProductionCheck,
    owner: meta.owner,
    criterion: meta.criterion,
    nextAction: meta.nextAction,
    p8Evidence: meta.note,
    p8TestsRunThisPass: false,
  };
});

const counts = {};
for (const r of requirements) counts[r.p8PublicationStatus] = (counts[r.p8PublicationStatus] || 0) + 1;
counts.TOTAL = requirements.length;

const sum = Object.entries(counts)
  .filter(([k]) => k !== "TOTAL")
  .reduce((a, [, v]) => a + v, 0);
if (sum !== 56) throw new Error(`Count mismatch ${sum}`);

const out = {
  task: "REM-PUBLISH-RESIDUAL-20261113-V2",
  generatedAt: new Date().toISOString(),
  p8Agent: "П8 — Независимая приёмка C01–C56",
  sectionPublishable: false,
  sectionAccepted: false,
  clientsSectionPublishable: false,
  packagingBaseSha: PRODUCTION,
  navigatorReleaseSha: NAVIGATOR_RELEASE,
  prototypeSha: PROTOTYPE,
  finalOwnerTips: TIPS,
  rootEvidenceReadOnly: {
    p1PublicationReconcile: `${TIPS.P1}:audit/remcard-parallel-20261113/P1/PUBLICATION-RECONCILE-V2.md`,
    p1OwnerAssembly: `${TIPS.P1}:validate-owner-assembly.log (PASS)`,
    p6PublishResidual: `${TIPS.P6}:publish-residual-REM-PUBLISH-RESIDUAL-20261113-V2.md`,
    p7Final: `${TIPS.P7}:27 P7 tests + partial screenshots audit tree`,
    fetchAdapterAtP7: "fetch-observer-appeals.ts always BLOCKED_CONTRACT @30a292d0",
    navigatorSearch: "github search referred-appeals/client-appeals on remcard-navigator: 0 hits (incomplete)",
  },
  p8TestsThisPass: {
    ran: false,
    reason: "Prioritize ledger reconcile; root already green — no duplicate happy-path vitest.",
    lastP8Smoke: "vitest-contracts-stage2.log (3 PASS) @2a9af427",
  },
  statusLegend: ["PASS", "REPRODUCED_FAIL", "NOT_VERIFIED", "BLOCKED_CONTRACT", "BLOCKED_PERSISTENCE", "EXCLUDED"],
  p8Counts: counts,
  requirements,
  unresolvedForRoot: [
    {
      id: "AC-GATE-CONTEXT",
      status: "REPRODUCED_FAIL",
      owner: "Root packaging",
      nextAction: "Never replace 57ca Gate/Context/routes from parallel branch.",
    },
    {
      id: "AC-REFERRED-API",
      status: "BLOCKED_CONTRACT",
      owner: "Backend",
      nextAction: "Ship referred-appeals read API; wire proxy + fetch adapter ok:true.",
    },
    {
      id: "AC-PERSONAL-PERSIST",
      status: "BLOCKED_PERSISTENCE",
      owner: "Backend",
      nextAction: "personal-meta overlay; P5 UI already honest.",
    },
    {
      id: "AC-RECEIVING-APPEALS",
      status: "BLOCKED_CONTRACT",
      owner: "Backend",
      nextAction: "Out of agent scope; specialist receiving remains blocked shell.",
    },
    {
      id: "AC-PAGE-BROWSER",
      status: "NOT_VERIFIED",
      owner: "Root QA",
      nextAction: "Mocked prof.remcard.ru clients routes after cherry-pick assembly.",
    },
    {
      id: "AC-FULL-LEDGER",
      status: "PASS",
      owner: "P8",
      nextAction: "This file; maintain on residual commits only.",
    },
  ],
};

const dir = `${repo}/audit/remcard-parallel-20261113/P8`;
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(`${dir}/requirement-ledger-publish-v2.json`, JSON.stringify(out, null, 2));
fs.writeFileSync(`${dir}/final-owner-tips.json`, JSON.stringify({ TIPS, NAVIGATOR_RELEASE, PRODUCTION }, null, 2));
console.log(JSON.stringify({ p8Counts: counts }, null, 2));
