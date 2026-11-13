#!/usr/bin/env python3
"""Exit 0 iff owner-tip manifest passes deterministic validation (fails old P7 mapping)."""
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
GEN = ROOT / "audit/remcard-parallel-20261113/P1/generate-packaging-manifest.py"
OUT = ROOT / "audit/remcard-parallel-20261113/P1/p1-p7-packaging-manifest.json"


def main() -> int:
    proc = subprocess.run(
        [sys.executable, str(GEN)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr, file=sys.stderr)
        return proc.returncode
    manifest = json.loads(proc.stdout)
    OUT.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if not manifest["validation"]["deterministicChecksPassed"]:
        for f in manifest["validation"]["failures"]:
            print("FAIL", json.dumps(f))
        return 1
    tabs = next(
        r
        for r in manifest["ownerRootAssembly"]
        if r["path"].endswith("ClientsDirectionTabs.tsx")
    )
    if tabs["matchesP7WholeTree"] is not False:
        print("FAIL: P6 tabs must differ from P7 whole tree blob")
        return 1
    list_view = next(
        r
        for r in manifest["ownerRootAssembly"]
        if r["path"].endswith("ObserverPartnersListView.tsx")
    )
    if list_view["owner"] != "P3":
        print("FAIL: ObserverPartnersListView owner must be P3")
        return 1
    print("PASS owner-assembly validation")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
