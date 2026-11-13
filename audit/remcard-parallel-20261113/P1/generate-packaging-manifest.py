#!/usr/bin/env python3
"""P1 audit: owner-tip assembly manifest (parallel branches, NOT P7 whole tree)."""
import hashlib
import json
import subprocess
import sys

BASE = "57ca4680892ae16c62fc38d0ad2ccb6a404dbd79"

AGENT_TIPS = {
    "P1": "c3d7c13d16a065a2733a989a43fd3915fb0e5e63",
    "P2": "e0063d15cb2887f61077cdfad066615845837bb0",
    "P3": "8af6b6cbe5c3e70a0f79932b62d3f78f09ff5543",
    "P4": "dd76accfe94343fb17c5a96797ee4d7b010eacb2",
    "P5": "c265ba6978b01b2536df2f9889a039a2aaa0380e",
    "P6": "3753b24c5273a8d83b68ab88a06f0ebe6c38547c",
    "P7": "9280f9e7279da14964574a6d1585499134ac7f8c",
    "P8": "803b45e81334f857e3cebc04794827c4ca03da62",
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

# Runtime scaffold extracted from P1 tip only (not re-owned by P3–P7 list above).
P1_SCAFFOLD_DEPENDENCIES = [
    "src/components/clients/observer/ObserverPartnersWorkspace.tsx",
    "src/components/clients/new-partner-empty/ClientsNewPartnerEmptyState.tsx",
    "src/components/clients/new-partner-empty/clients-new-partner-empty.module.css",
    "src/components/clients/new-partner-empty/clientsEmptyCopy.ts",
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
    }


def validate_assembly(rows: list[dict]) -> list[dict]:
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

    return failures


def main() -> None:
    assembly = build_owner_assembly()
    failures = validate_assembly(assembly)
    bundle = [
        r
        for r in assembly
        if r.get("packaging", "").startswith("include")
    ]

    manifest = {
        "task": "P1-P7 owner-tip assembly (parallel branches)",
        "packagingBaseSha": BASE,
        "assemblyModel": "byte-extract each path from reviewed owner tip SHA (NOT P7 whole tree)",
        "rejectsManifestSha": "e90615aa819c32caf787e74bd8e751f182d83545",
        "agentTipsReviewed": AGENT_TIPS,
        "ownerProductAllowlist": OWNER_PRODUCT,
        "p1ScaffoldDependencies": P1_SCAFFOLD_DEPENDENCIES,
        "ownerRootAssembly": assembly,
        "productionBundleFromOwnerTips": bundle,
        "p1SnippetTransformation": p1_snippet_transform(),
        "qaTestManifest": qa_manifest(),
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
