#!/usr/bin/env python3
"""One-off generator for P1 audit; not part of production bundle."""
import hashlib
import json
import re
import subprocess

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
COMBINED = AGENT_TIPS["P7"]
TIPS = [(k, AGENT_TIPS[k]) for k in ["P1", "P2", "P3", "P4", "P5", "P6", "P7"]]
PREFIXES = ("src/components/clients/", "src/lib/clients-parity/")


def blob(sha: str, path: str) -> bytes | None:
    try:
        return subprocess.check_output(["git", "show", f"{sha}:{path}"], stderr=subprocess.DEVNULL)
    except subprocess.CalledProcessError:
        return None


def digest(data: bytes | None) -> str | None:
    if data is None:
        return None
    return hashlib.sha256(data).hexdigest()[:16]


def last_owner(path: str) -> tuple[str, str]:
    prev = digest(blob(BASE, path))
    last = ("BASE", BASE)
    for tag, tip in TIPS:
        cur = digest(blob(tip, path))
        if cur != prev:
            last = (tag, tip)
            prev = cur
    return last


BLOCKED_PATHS = {
    "src/components/clients/OwnerClientsGate.tsx",
    "src/components/clients/OwnerClientsModeContext.tsx",
}


def classify(path: str, st: str) -> tuple[str, str]:
    if path in BLOCKED_PATHS:
        return "exclude", "BLOCKED_SHARED_GATE_CONTEXT"
    if path.startswith("src/app/(cabinet)/clients"):
        return "exclude", "BLOCKED_CABINET_ROUTE_PARITY_ONLY"
    if re.search(r"\.(test|spec)\.(ts|tsx)$", path) or "/computed.test." in path:
        return "exclude", "QA_TEST_NOT_PRODUCT"
    if "/fixtures/" in path:
        return "exclude", "QA_FIXTURE"
    if "/audit/" in path and path.endswith(".json"):
        return "exclude", "AUDIT_COMPUTED_ARTIFACT"
    if path.endswith(("author-handoff-v6.json", "patch-manifest-57ca4680.json")):
        return "exclude", "PACKAGING_METADATA"
    if path.endswith(
        (
            "acceptance-matrix.json",
            "acceptance-matrix.ts",
            "element-state-matrix.csv",
            "element-state-matrix.json",
            "page-matrix.json",
        )
    ):
        return "exclude", "QA_MATRIX_NOT_RUNTIME"
    if path == "src/components/clients/ClientsListWorkspace.tsx":
        return "include-partial", "APPLY_BODY_FROM_TIP_EXPORT_FROM_SNIPPET"
    if path == "src/lib/clients-parity/fetch-observer-appeals.ts":
        return "include-with-blocker", "BLK_OBSERVER_REFERRED_CONTRACT"
    if path.startswith("scripts/clients-parity-20261113/"):
        return "exclude", "REPLAY_HARNESS_NOT_PRODUCTION"
    if st == "D":
        return "exclude", "DELETION_DO_NOT_APPLY_ON_57ca"
    return "include", "SELECTED_PRODUCT"


out = subprocess.check_output(["git", "diff", "--name-status", f"{BASE}..{COMBINED}"], text=True)
rows: list[tuple[str, str]] = []
for line in out.splitlines():
    if not line:
        continue
    st, path = line.split("\t", 1)
    if path.startswith(PREFIXES) or path.startswith("scripts/clients-parity-20261113/"):
        rows.append((st, path))

files = []
for st, path in sorted(rows, key=lambda x: x[1]):
    tag, tip = last_owner(path)
    packaging, reason_code = classify(path, st)
    files.append(
        {
            "path": path,
            "gitStatusVs57ca": st,
            "contentSourceAgent": tag,
            "contentSourceSha": tip,
            "packaging": packaging,
            "reasonCode": reason_code,
        }
    )

blockers = [
    {
        "id": "BLK-GATE-API",
        "path": "src/components/clients/OwnerClientsGate.tsx",
        "sourceSha": AGENT_TIPS["P1"],
        "vs57ca": "Branch gate: client remcardFetch R03/R06/me; production: useBusinessSectionDispatch + canLinkOnboardingHistory",
        "packaging": "NEVER_INCLUDE",
    },
    {
        "id": "BLK-CONTEXT-HISTORY",
        "path": "src/components/clients/OwnerClientsModeContext.tsx",
        "sourceSha": AGENT_TIPS["P1"],
        "vs57ca": "Branch removes useOwnerClientsCanLinkOnboardingHistory; production 57ca retains hook",
        "packaging": "NEVER_INCLUDE",
    },
    {
        "id": "BLK-CABINET-ROUTES",
        "path": "src/app/(cabinet)/clients/**",
        "sourceSha": AGENT_TIPS["P1"],
        "vs57ca": "Parity routes omit history prop; production uses src/app/clients/page.tsx",
        "packaging": "NEVER_INCLUDE",
    },
    {
        "id": "BLK-VITEST",
        "path": "vitest.config.ts",
        "sourceSha": "branch",
        "vs57ca": "Modified on branch; excluded by manifest policy",
        "packaging": "NEVER_INCLUDE",
    },
    {
        "id": "BLK-HISTORY-TEST-REGRESSION",
        "path": "src/components/clients/ClientsListWorkspace.history-prop.test.tsx",
        "sourceSha": AGENT_TIPS["P1"],
        "vs57ca": "Deleted on branch; preserve 57ca copy in any packaging",
        "packaging": "PRESERVE_57ca",
    },
    {
        "id": "BLK-P1-TESTS-DROPPED-P2",
        "path": "src/components/clients/P1.*.compat.test.tsx",
        "sourceSha": AGENT_TIPS["P2"],
        "vs57ca": "On P1 c3d7c13d only; removed by P2 e0063d15 from combined line",
        "packaging": "QA_ONLY_ON_P1_BRANCH",
    },
]

manifest = {
    "task": "P1-P7 selected-file packaging (read-only)",
    "packagingBaseSha": BASE,
    "combinedProductContentTip": COMBINED,
    "agentTipsReviewed": AGENT_TIPS,
    "productFixPinReference": "140de0a83044f324bf455ac2dfb87b17432fb8d1",
    "prototypePin": "3dc31836cd18d9209c20097f18b906dd276f7af6",
    "prototypeAccess": "OK: design/general-prototype/prototype-page-catalog.json at prototype pin",
    "clientDetailWorkspaceVs57ca": "noDelta",
    "productionApplyListExport": "src/lib/clients-parity/patch-ClientsListWorkspace-57ca4680.snippet.txt",
    "deadCodeOnBranchNotFor57ca": [
        "ProductionOwnerClientsGate cast in ClientsListWorkspace.tsx",
        "canLinkOnboardingHistory forwarded to parity gate that does not consume it",
    ],
    "counts": {
        "filesScanned": len(files),
        "productionBundleInclude": len(
            [f for f in files if f["packaging"].startswith("include")]
        ),
        "excluded": len([f for f in files if f["packaging"] == "exclude"]),
    },
    "productionBundlePaths": [
        f["path"] for f in files if f["packaging"].startswith("include")
    ],
    "files": files,
    "sharedInfrastructureBlockers": blockers,
    "sectionBlockers": [
        "FULL-SECTION-ACCEPTANCE",
        "BLK-OBSERVER-REFERRED",
        "BLK-OBSERVER-PERSONAL-PERSIST",
        "BLK-RECEIVING-APPEALS",
    ],
}

print(json.dumps(manifest, indent=2, ensure_ascii=False))
