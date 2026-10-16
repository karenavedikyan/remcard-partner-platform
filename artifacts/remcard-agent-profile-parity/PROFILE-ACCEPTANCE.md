# AGENT-PROFILE-PARITY — reviewer acceptance checkpoint

**Status:** `reviewed_with_documented_exceptions`  
**Accepted code tip:** `ce2921e23785d6383190e34f18fe2d9c8b86f4f4` (branch `cursor/agent-profile-parity-b3e3`, PR **#19**)  
**Navigator (unchanged):** `7a47405f9dbcaa4a6b1c4bdbed77ac8a155b64d7`

## Scope accepted

Functional and measured layout scope per agreed gates: `functionalOk`, `captureOk`, `geometryOk`, `cssOk`. Desktop summary/bank widths and x at 1440; mobile 343/288 at x16; badge content-sized; tab divider; bank inline primary marker.

## Not claimed

- **`visualParityOk: false`** — not universal full-page pixel parity or a 90% numerical match.
- Documented exceptions: longer product PageHeading intro, no demo banner/footnote on impl, real user IDs, resulting vertical/y differences.

## SHA note (avoid stale wording)

| Label | SHA | Meaning |
|-------|-----|---------|
| **Code tip (authoritative)** | `ce2921e…` | Final merged-ready profile parity code on `#19`. |
| **Capture snapshot in JSON** | `stack.platformGitSha` at run time | Git HEAD when the parity stack booted (may be pre-tip if captures ran before the last commit). Re-run RC after tip to align. |

R03-PARITY-TAIL blocked-on profile RC: **satisfied** as of this checkpoint. Tail work proceeds on a separate branch/PR.
