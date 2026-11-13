#!/usr/bin/env python3
"""P1 audit: owner-tip assembly manifest (parallel branches, NOT P7 whole tree)."""
import hashlib
import json
import subprocess
import sys

BASE = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79"

AGENT_TIPS = {
    "P1": "ca2221e22f9abe727b088328ddb6a8fa56f4e76d",
    "P2": "ac2d4a7b365e0fec5e83de3e59e9d624a0908b0a",
    "P3": "fe416e2b19103ca7e7eaf945c179353dd7dc1e45",
    "P4": "eb4592fd64f33763f705bfda564b4988a8267c2b",
    "P4_audit": "ad7b0824b39ffedd576af84d18be64782611d6b5",
    "P5": "dbbe44557a42eb354397315b70e1290af490c45c",
    "P6": "981c72aff23595d32e157dc9642e08c02a0cb70d",
    "P7": "30a292d002d56e0daaeebdff62d1fce902590362",
    "P8": "803b45e81334f857e3cebc04794827c4ca03da62",
}

P6_REJECTED_DO_NOT_USE = {
    "sha": "12aea8756fb0344a7aaf8f29b3b427a9e6ce204f",
    "reason": "Root rejected: conditional hooks before agent return; do not accept from 21 tests alone",
    "awaiting": "P6 correction branch",
}

# Reviewed product ownership (parallel tips — authoritative content source per path).
OWNER_PRODUCT: dict[str, list[str]] = {
    "P1": [
        "src/components/clients/ClientsListWorkspace.tsx",
        "src/components/clients/ClientDetailWorkspace.tsx",
        "src/lib/clients-parity/patch-manifest-57ca4680.json",
        "src/lib/clients-parity/author-handoff-v6.json",
    ],
    "P2": [],
    "P3": [
        "src/components/clients/observer/ObserverPartnersListView.tsx",
        "src/components/clients/observer/ObserverPartnerCard.tsx",
        "src/components/clients/observer/ObserverFilterChips.tsx",
    ],
    "P4": [
        "src/components/clients/observer/ObserverPartnerDetailView.tsx",
        "src/components/clients/observer/ObserverClientDetailView.tsx",
    ],
    "P5": [
        "src/components/clients/observer/ObserverPersonalClientRow.tsx",
        "src/components/clients/observer/ObserverPersonalConfirmPanel.tsx",
        "src/components/clients/observer/ObserverPersonalEditPanel.tsx",
        "src/components/clients/observer/ObserverPersonalTools.tsx",
    ],
    "P6": [
        "src/components/clients/direction/ClientsDirectionTabs.tsx",
        "src/components/clients/direction/ClientsDirectionWorkspace.tsx",
        "src/components/clients/direction/ReceivingAppealsBlocked.tsx",
        "src/components/clients/observer/ObserverContractBlocked.tsx",
    ],
    "P7": ["src/components/clients/observer/observer.module.css"],
    "P8": [],
}

# On 57ca, keep byte-identical — branch variants regress clientsEmptyCopy.test / history links.
PRESERVE_BASE_57CA = [
    "src/components/clients/new-partner-empty/ClientsNewPartnerEmptyState.tsx",
    "src/components/clients/new-partner-empty/clients-new-partner-empty.module.css",
    "src/components/clients/new-partner-empty/clientsEmptyCopy.ts",
]

# Runtime scaffold extracted from P1 tip (not in P3–P7 owner list; not PRESERVE_BASE).
P1_SCAFFOLD_DEPENDENCIES = [
    "src/components/clients/observer/ObserverPartnersWorkspace.tsx",
    "src/lib/clients-parity/contracts.ts",
    "src/lib/clients-parity/fetch-observer-appeals.ts",
    "src/lib/clients-parity/filter-observer.ts",
    "src/lib/clients-parity/observer-display.ts",
    "src/lib/clients-parity/observer-personal-row-spec.ts",
    "src/lib/clients-parity/observer-stats-grid-harness.ts",
    "src/lib/clients-parity/observer-stats-grid-spec.ts",
    "src/lib/clients-parity/observer-stats.ts",
    "src/lib/clients-parity/patch-ClientsListWorkspace-57ca4680.snippet.txt",
    "src/lib/clients-parity/production-compat.ts",
    "src/lib/clients-parity/types.ts",
]

QA_TESTS_BY_OWNER: dict[str, list[str]] = {
    "P1": [
        "src/components/clients/P1.ClientsListWorkspace.compat.test.tsx",
        "src/components/clients/P1.ClientDetailWorkspace.compat.test.tsx",
        "src/components/clients/ClientsListWorkspace.props.test.tsx",
    ],
    "P3": [
        "src/components/clients/observer/P3.ObserverFilterChips.test.tsx",
        "src/components/clients/observer/P3.ObserverPartnerCard.test.tsx",
        "src/components/clients/observer/P3.ObserverPartnersListView.back-label.test.tsx",
        "src/components/clients/observer/P3.ObserverPartnersListView.roundtrip.test.tsx",
    ],
    "P4": [
        "src/components/clients/observer/P4.ObserverClientDetailView.test.tsx",
        "src/components/clients/observer/P4.ObserverPartnerDetailView.test.tsx",
        "src/components/clients/observer/P4.observer-detail-navigation.test.tsx",
    ],
    "P5": [
        "src/components/clients/observer/P5.ObserverPersonalClientRow.test.tsx",
        "src/components/clients/observer/P5.ObserverPersonalConfirmPanel.test.tsx",
        "src/components/clients/observer/P5.ObserverPersonalEditPanel.test.tsx",
        "src/components/clients/observer/P5.ObserverPersonalTools.test.tsx",
    ],
    "P6": [
        "src/components/clients/direction/P6.ClientsDirectionTabs.test.tsx",
        "src/components/clients/direction/P6.ClientsDirectionTabs.keyboard.test.tsx",
        "src/components/clients/direction/P6.ClientsDirectionWorkspace.test.tsx",
        "src/components/clients/direction/P6.ClientsDirectionWorkspace.keyboard.test.tsx",
        "src/components/clients/direction/P6.ReceivingAppealsBlocked.test.tsx",
        "src/components/clients/observer/P6.ObserverContractBlocked.test.tsx",
    ],
    "P7": [
        "src/components/clients/observer/P7.observer-accent-contrast.test.ts",
        "src/components/clients/observer/P7.observer-prototype-layout.test.ts",
    ],
}

# Transitive QA fixtures (imported by owner tests only — never production UI).
QA_TRANSITIVE_FIXTURES = [
    {
        "path": "src/lib/clients-parity/fixtures/observer-demo-fixtures.ts",
        "qaConsumers": ["P3", "P4"],
        "sourceOwner": "P3",
        "sourceShaKey": "P3",
        "note": "Imported by P3/P4 observer tests; do not ship to production bundle",
    },
    {
        "path": "audit/remcard-parallel-20261113/P5/fixtures.ts",
        "qaConsumers": ["P5"],
        "sourceOwner": "P5",
        "sourceShaKey": "P5",
        "note": "P5 personal-row tests; audit path only",
    },
]

REJECTED_MANIFEST_SHAS = {
    "e90615aa_linear_p7_tree": "e90615aa819c32caf787e74bd8e751f182d83545",
    "814df98d_stale_new_partner_empty": "814df98d8a83bae358c9540188aa3800201e2a4c",
}

NAVIGATOR_RELEASE_PIN = "8137ddd1ae5bad880fa28df34bab04e460bf2bdd"

DEPENDENCY_GRAPH_EDGES = [
    ("src/components/clients/ClientsListWorkspace.tsx", "src/components/clients/direction/ClientsDirectionWorkspace.tsx"),
    ("src/components/clients/direction/ClientsDirectionWorkspace.tsx", "src/components/clients/direction/ClientsDirectionTabs.tsx"),
    ("src/components/clients/direction/ClientsDirectionWorkspace.tsx", "src/components/clients/direction/ReceivingAppealsBlocked.tsx"),
    ("src/components/clients/direction/ClientsDirectionWorkspace.tsx", "src/components/clients/observer/ObserverPartnersWorkspace.tsx"),
    ("src/components/clients/observer/ObserverPartnersWorkspace.tsx", "src/components/clients/observer/ObserverPartnersListView.tsx"),
    ("src/components/clients/observer/ObserverPartnersListView.tsx", "src/lib/clients-parity/types.ts"),
    ("src/components/clients/observer/ObserverPartnersListView.tsx", "src/lib/clients-parity/filter-observer.ts"),
    ("@57ca/production", "src/components/clients/OwnerClientsGate.tsx"),
    ("@57ca/production", "src/components/clients/OwnerClientsModeContext.tsx"),
    ("@57ca/production", "src/app/clients/page.tsx"),
    ("src/components/clients/ClientsListWorkspace.tsx", "@57ca/production OwnerClientsGate+snippet export"),
]

MISSING_ACCEPTANCE_FOR_UI_PACKAGE = [
    {"id": "AC-REFERRED-API", "blocker": "BLK-OBSERVER-REFERRED", "detail": "fetch-observer-appeals has no production ok:true contract; UI must stay unavailable/honest"},
    {"id": "AC-PERSONAL-PERSIST", "blocker": "BLK-OBSERVER-PERSONAL-PERSIST", "detail": "alias/tag/note/archive/trash save not backed by personal overlay API"},
    {"id": "AC-RECEIVING-APPEALS", "blocker": "BLK-RECEIVING-APPEALS", "detail": "incoming specialist direction shows blocked shell only"},
    {"id": "AC-FULL-LEDGER", "blocker": "FULL-SECTION-ACCEPTANCE", "detail": "C01–C56 ledger not closed; component tests ≠ page acceptance"},
    {"id": "AC-ONBOARDING-LINKS", "blocker": "PRESERVE_BASE", "detail": "empty-state copy must remain 57ca blobs for settlements/history links"},
    {"id": "AC-GATE-CONTEXT", "blocker": "BLK-GATE-CONTEXT", "detail": "production gate/context unchanged; list snippet only on 57ca"},
]

# Paths wrongly included in 814df98d productionBundleFromOwnerTips (dry-run regression).
REJECTED_814DF_BUNDLE_PATHS = [
    "src/components/clients/new-partner-empty/ClientsNewPartnerEmptyState.tsx",
    "src/components/clients/new-partner-empty/clients-new-partner-empty.module.css",
    "src/components/clients/new-partner-empty/clientsEmptyCopy.ts",
]

BLOCKED_SHARED = [
    "src/components/clients/OwnerClientsGate.tsx",
    "src/components/clients/OwnerClientsModeContext.tsx",
    "src/app/(cabinet)/clients/page.tsx",
    "src/app/(cabinet)/clients/[id]/page.tsx",
    "vitest.config.ts",
    "src/lib/onboarding-step/history-link-eligibility.ts",
]


def path_exists(sha: str, path: str) -> bool:
    return subprocess.call(
        ["git", "cat-file", "-e", f"{sha}:{path}"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    ) == 0


def git_blob_sha(commit: str, path: str) -> str | None:
    if not path_exists(commit, path):
        return None
    out = subprocess.check_output(
        ["git", "rev-parse", f"{commit}:{path}"], text=True
    ).strip()
    return out


def blob_bytes(commit: str, path: str) -> bytes | None:
    if not path_exists(commit, path):
        return None
    return subprocess.check_output(["git", "show", f"{commit}:{path}"])


def sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_status_vs_base(path: str) -> str:
    out = subprocess.check_output(
        ["git", "diff", "--name-status", f"{BASE}..{AGENT_TIPS['P1']}", "--", path],
        text=True,
    ).strip()
    if not out:
        # unchanged on P1; may still exist at owner
        if path_exists(BASE, path):
            return "M" if path_exists(AGENT_TIPS["P1"], path) else "?"
        return "A" if path_exists(AGENT_TIPS["P1"], path) else "?"
    return out.split()[0]


def owner_for_path(path: str) -> tuple[str, str]:
    for owner, paths in OWNER_PRODUCT.items():
        if path in paths:
            return owner, AGENT_TIPS[owner]
    if path in P1_SCAFFOLD_DEPENDENCIES:
        return "P1-scaffold", AGENT_TIPS["P1"]
    raise KeyError(f"No owner mapping for {path}")


def entry_for_product(path: str, owner: str, tip: str) -> dict:
    data = blob_bytes(tip, path)
    if data is None:
        return {
            "path": path,
            "owner": owner,
            "sourceSha": tip,
            "packaging": "MISSING_AT_OWNER_TIP",
        }
    blob = git_blob_sha(tip, path)
    p7_blob = git_blob_sha(AGENT_TIPS["P7"], path)
    packaging = "include"
    reason = "owner-tip-extract"
    if path == "src/components/clients/ClientsListWorkspace.tsx":
        packaging = "include-partial"
        reason = "body-from-owner-tip-export-via-snippet-on-57ca"
    elif path in (
        "src/lib/clients-parity/patch-manifest-57ca4680.json",
        "src/lib/clients-parity/author-handoff-v6.json",
    ):
        packaging = "exclude"
        reason = "packaging-metadata-not-runtime"
    elif path == "src/components/clients/ClientDetailWorkspace.tsx":
        packaging = "omit"
        reason = "noDelta-vs-57ca"
    elif path == "src/lib/clients-parity/fetch-observer-appeals.ts":
        packaging = "include-with-blocker"
        reason = "BLK-OBSERVER-REFERRED"
    return {
        "path": path,
        "owner": owner,
        "sourceSha": tip,
        "gitBlobSha": blob,
        "contentSha256": sha256_hex(data),
        "gitStatusVs57ca": git_status_vs_base(path),
        "packaging": packaging,
        "reasonCode": reason,
        "p7TipBlobSha": p7_blob,
        "matchesP7WholeTree": blob == p7_blob if p7_blob else None,
    }


def build_owner_assembly() -> list[dict]:
    rows: list[dict] = []
    for owner, paths in OWNER_PRODUCT.items():
        tip = AGENT_TIPS[owner]
        for path in paths:
            rows.append(entry_for_product(path, owner, tip))
    for path in P1_SCAFFOLD_DEPENDENCIES:
        rows.append(entry_for_product(path, "P1-scaffold", AGENT_TIPS["P1"]))
    return sorted(rows, key=lambda r: r["path"])


def build_preserve_base() -> list[dict]:
    rows: list[dict] = []
    for path in PRESERVE_BASE_57CA:
        data = blob_bytes(BASE, path)
        if data is None:
            continue
        base_blob = git_blob_sha(BASE, path)
        branch_blob = git_blob_sha(AGENT_TIPS["P1"], path)
        rows.append(
            {
                "path": path,
                "packaging": "PRESERVE_BASE",
                "sourceSha": BASE,
                "gitBlobSha": base_blob,
                "contentSha256": sha256_hex(data),
                "reasonCode": "STALE_BRANCH_INHERITANCE: removes canLinkOnboardingHistory/step.action/OnboardingStepItem; direction/observer/list shell do not import",
                "branchBlobAtP1Tip": branch_blob,
                "branchDiffersFrom57ca": base_blob != branch_blob,
                "dryRunEvidence": "clientsEmptyCopy.test.tsx fails 2 cases when branch copies applied",
            }
        )
    return rows


def qa_fixtures_manifest() -> list[dict]:
    rows = []
    for item in QA_TRANSITIVE_FIXTURES:
        tip = AGENT_TIPS[item["sourceShaKey"]]
        path = item["path"]
        exists = path_exists(tip, path)
        rows.append(
            {
                **item,
                "sourceSha": tip,
                "presentAtOwnerTip": exists,
                "gitBlobSha": git_blob_sha(tip, path) if exists else None,
                "packaging": "QA_FIXTURE_TRANSITIVE",
            }
        )
    return rows


def qa_manifest() -> list[dict]:
    rows = []
    for owner, tests in QA_TESTS_BY_OWNER.items():
        tip = AGENT_TIPS.get(owner, "")
        for path in tests:
            exists = path_exists(tip, path)
            blob = git_blob_sha(tip, path) if exists else None
            rows.append(
                {
                    "path": path,
                    "qaOwner": owner,
                    "sourceSha": tip,
                    "presentAtOwnerTip": exists,
                    "gitBlobSha": blob,
                    "packaging": "QA_MANIFEST_ONLY",
                }
            )
    return rows


def p7_qa_runtime_requirements() -> dict:
    return {
        "tests": [
            "src/components/clients/observer/P7.observer-accent-contrast.test.ts",
            "src/components/clients/observer/P7.observer-prototype-layout.test.ts",
        ],
        "playwright": {
            "api": "chromium.launch({ headless: true })",
            "channel": "none — no channel: 'chrome' in owner P7 tests",
            "browserDownload": "not required when root sandbox provides Chromium adapter",
            "note": "QA harness expects pre-provisioned Chromium in sandbox; do not add product dependencies",
        },
    }


def p1_snippet_transform() -> dict:
    snippet_path = "src/lib/clients-parity/patch-ClientsListWorkspace-57ca4680.snippet.txt"
    list_path = "src/components/clients/ClientsListWorkspace.tsx"
    tip = AGENT_TIPS["P1"]
    return {
        "baseSha": BASE,
        "listBodySource": {
            "path": list_path,
            "owner": "P1",
            "sourceSha": tip,
            "gitBlobSha": git_blob_sha(tip, list_path),
        },
        "productionExportArtifact": {
            "path": snippet_path,
            "sourceSha": tip,
            "gitBlobSha": git_blob_sha(tip, snippet_path),
        },
        "transformOn57ca": [
            "Replace ClientsListWorkspace export block with snippet (direct OwnerClientsGate, no ProductionOwnerClientsGate cast)",
            "Keep ClientsListBody + ClientsDirectionWorkspace imports from P1 tip file body",
            "Do not cherry-pick parity-branch cast or Gate R5 typing shim",
        ],
        "forbiddenOn57caFromBranch": [
            "ProductionOwnerClientsGate cast",
            "Forwarding canLinkOnboardingHistory into parity OwnerClientsGate that ignores it",
        ],
        "paritySourceAssertionNotAppliedProduction": {
            "file": "src/components/clients/P1.ClientsListWorkspace.compat.test.tsx",
            "scope": "parity-branch source only (NOT applied 57ca dry-run acceptance)",
            "appliedProductionMustNotContain": ["ProductionOwnerClientsGate"],
            "snippetRemovesCast": "patch-ClientsListWorkspace-57ca4680.snippet.txt has no ProductionOwnerClientsGate",
        },
    }


def validate_assembly(rows: list[dict], bundle: list[dict], preserve: list[dict]) -> list[dict]:
    """Deterministic checks; fails on rejected e90615aa-style P7-sourcing."""
    failures: list[dict] = []

    by_path = {r["path"]: r for r in rows}

    expected = {
        "src/components/clients/direction/ClientsDirectionTabs.tsx": ("P6", AGENT_TIPS["P6"]),
        "src/components/clients/observer/ObserverPartnersListView.tsx": (
            "P3",
            AGENT_TIPS["P3"],
        ),
    }
    for path, (owner, tip) in expected.items():
        r = by_path[path]
        if r["owner"] != owner or r["sourceSha"] != tip:
            failures.append(
                {
                    "check": "OWNER_TIP_MAPPING",
                    "path": path,
                    "expectedOwner": owner,
                    "expectedSha": tip,
                    "actual": {k: r.get(k) for k in ("owner", "sourceSha")},
                }
            )
        if r.get("matchesP7WholeTree") is True and path in expected:
            failures.append(
                {
                    "check": "MUST_NOT_USE_P7_TREE_FOR_OWNER_FILE",
                    "path": path,
                    "p7TipBlobSha": r.get("p7TipBlobSha"),
                    "ownerBlobSha": r.get("gitBlobSha"),
                }
            )

    # Rejected heuristic: last-linear-owner == P7 for P6-owned tabs
    wrong_tabs_owner = "P7"
    if by_path["src/components/clients/direction/ClientsDirectionTabs.tsx"]["owner"] == wrong_tabs_owner:
        failures.append({"check": "REJECTED_LINEAR_P7_OWNERSHIP", "path": "ClientsDirectionTabs"})

    wrong_list_owner = "P4"
    if by_path["src/components/clients/observer/ObserverPartnersListView.tsx"]["owner"] == wrong_list_owner:
        failures.append({"check": "REJECTED_LINEAR_P4_LIST_VIEW", "path": "ObserverPartnersListView"})

    # Blobs must match owner tip (cat-file verification)
    for path, (owner, tip) in expected.items():
        r = by_path[path]
        direct = git_blob_sha(tip, path)
        if r.get("gitBlobSha") != direct:
            failures.append(
                {
                    "check": "BLOB_HASH_EQ_OWNER_TIP",
                    "path": path,
                    "manifestBlob": r.get("gitBlobSha"),
                    "revParseTip": direct,
                }
            )

    bundle_paths = {r["path"] for r in bundle}
    for path in PRESERVE_BASE_57CA:
        if path in bundle_paths:
            failures.append(
                {
                    "check": "PRESERVE_BASE_MUST_NOT_BE_IN_PRODUCTION_BUNDLE",
                    "path": path,
                    "rejectedPatternSha": REJECTED_MANIFEST_SHAS["814df98d_stale_new_partner_empty"],
                }
            )
        if path in REJECTED_814DF_BUNDLE_PATHS and path in bundle_paths:
            failures.append(
                {
                    "check": "REJECTED_814DF98D_DRY_RUN_REGRESSION",
                    "path": path,
                }
            )

    snippet_path = "src/lib/clients-parity/patch-ClientsListWorkspace-57ca4680.snippet.txt"
    snippet = blob_bytes(AGENT_TIPS["P1"], snippet_path)
    if snippet and b"ProductionOwnerClientsGate" in snippet:
        failures.append(
            {
                "check": "SNIPPET_MUST_NOT_CONTAIN_CAST",
                "path": snippet_path,
            }
        )

    return failures


def build_publication_reconcile(bundle: list[dict], preserve: list[dict]) -> dict:
    ui_only = [r["path"] for r in bundle if r.get("packaging") == "include"]
    with_blocker = [r["path"] for r in bundle if r.get("packaging") == "include-with-blocker"]
    partial = [r["path"] for r in bundle if r.get("packaging") == "include-partial"]
    forbidden_paths = (
        [r["path"] for r in preserve]
        + BLOCKED_SHARED
        + [f["path"] for f in QA_TRANSITIVE_FIXTURES]
        + ["src/lib/clients-parity/fixtures/observer-demo-fixtures.ts"]
        + ["src/app/(cabinet)/clients/**"]
    )
    return {
        "publicationId": "REM-PUBLISH-RESIDUAL-20261113-V2",
        "clientsSectionPublishable": False,
        "wholeBranchTransferForbidden": True,
        "profClientsPackagingBaseSha": BASE,
        "navigatorReleasePin": NAVIGATOR_RELEASE_PIN,
        "navigatorReleaseBranchNote": "release/prof-backend-v1-20261007 (remote ref not fetched here; SHA object present locally)",
        "prototypePin": "3dc31836cd18d9209c20097f18b906dd276f7af6",
        "deployableIndependentUiOnly": {
            "description": "Owner-tip extracted UI + parity lib; applies only atop 57ca gate/routes",
            "paths": sorted(ui_only + partial),
            "partialApply": partial,
        },
        "deployableWithExplicitRuntimeBlocker": with_blocker,
        "forbiddenInPublicationPackage": forbidden_paths,
        "dependencyGraphEdges": [
            {"from": a, "to": b} for a, b in DEPENDENCY_GRAPH_EDGES
        ],
        "missingAcceptanceCriteria": MISSING_ACCEPTANCE_FOR_UI_PACKAGE,
        "rootOwnerAction": "Root alone cherry-picks deployableIndependentUiOnly paths; root assigns backend contract work for blockers",
    }


def main() -> None:
    assembly = build_owner_assembly()
    preserve_base = build_preserve_base()
    bundle = [
        r
        for r in assembly
        if r.get("packaging", "").startswith("include")
    ]
    failures = validate_assembly(assembly, bundle, preserve_base)

    manifest = {
        "task": "P1-P7 owner-tip assembly (parallel branches)",
        "packagingBaseSha": BASE,
        "assemblyModel": "byte-extract each path from reviewed owner tip SHA (NOT P7 whole tree)",
        "rejectsManifestShas": REJECTED_MANIFEST_SHAS,
        "agentTipsReviewed": AGENT_TIPS,
        "p6RejectedDoNotUse": P6_REJECTED_DO_NOT_USE,
        "p3FollowUpResolverPending": {
            "tip": AGENT_TIPS["P3"],
            "note": "fe416e2b — follow-up resolver pending; do not treat as final stack until P3 closes",
        },
        "p2OperationMatrix8137": {
            "tip": AGENT_TIPS["P2"],
            "finding": "no complete no-schema publication path under current restrictions",
            "blocksFullSectionPublish": True,
        },
        "p4Pins": {
            "productTip": AGENT_TIPS["P4"],
            "auditTip": AGENT_TIPS["P4_audit"],
        },
        "ownerProductAllowlist": OWNER_PRODUCT,
        "p1ScaffoldDependencies": P1_SCAFFOLD_DEPENDENCIES,
        "preserveBase57caByteIdentical": preserve_base,
        "ownerRootAssembly": assembly,
        "productionBundleFromOwnerTips": bundle,
        "p1SnippetTransformation": p1_snippet_transform(),
        "qaTestManifest": qa_manifest(),
        "qaTransitiveFixturesManifest": qa_fixtures_manifest(),
        "p7QaRuntimeRequirements": p7_qa_runtime_requirements(),
        "publicationReconcileV2": build_publication_reconcile(bundle, preserve_base),
        "sharedInfrastructureBlockers": [
            {
                "id": "BLK-GATE-API",
                "paths": ["src/components/clients/OwnerClientsGate.tsx"],
                "packaging": "NEVER_INCLUDE_FROM_BRANCH",
            },
            {
                "id": "BLK-CONTEXT-HISTORY",
                "paths": ["src/components/clients/OwnerClientsModeContext.tsx"],
                "packaging": "NEVER_INCLUDE_FROM_BRANCH",
            },
            {
                "id": "BLK-CABINET-ROUTES",
                "paths": ["src/app/(cabinet)/clients/**"],
                "packaging": "NEVER_INCLUDE",
            },
            {
                "id": "BLK-VITEST",
                "paths": ["vitest.config.ts"],
                "packaging": "NEVER_INCLUDE",
            },
        ],
        "blockedPaths57caPreserve": BLOCKED_SHARED,
        "sectionBlockers": [
            "FULL-SECTION-ACCEPTANCE",
            "BLK-OBSERVER-REFERRED",
            "BLK-OBSERVER-PERSONAL-PERSIST",
            "BLK-RECEIVING-APPEALS",
        ],
        "validation": {
            "deterministicChecksPassed": len(failures) == 0,
            "failures": failures,
        },
        "p7MismatchEvidence": [
            {
                "path": "src/components/clients/direction/ClientsDirectionTabs.tsx",
                "ownerBlob": git_blob_sha(AGENT_TIPS["P6"], "src/components/clients/direction/ClientsDirectionTabs.tsx"),
                "p7Blob": git_blob_sha(AGENT_TIPS["P7"], "src/components/clients/direction/ClientsDirectionTabs.tsx"),
            },
            {
                "path": "src/components/clients/observer/ObserverPartnersListView.tsx",
                "ownerBlob": git_blob_sha(AGENT_TIPS["P3"], "src/components/clients/observer/ObserverPartnersListView.tsx"),
                "p7Blob": git_blob_sha(AGENT_TIPS["P7"], "src/components/clients/observer/ObserverPartnersListView.tsx"),
            },
        ],
    }

    json.dump(manifest, sys.stdout, indent=2, ensure_ascii=False)
    sys.stdout.write("\n")
    if failures:
        sys.exit(2)


if __name__ == "__main__":
    main()
