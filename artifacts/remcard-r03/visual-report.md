# R03 visual — dark pair fix (2026-10-15)

Platform SHA at capture: see `local-acceptance-report.json` (`platformGitSha`).

## Dark pair (375×812, certificates list)

| Side | File | Verified |
|------|------|----------|
| Implementation | `visual/impl-certificates-list-375-dark.png` | yes |
| Reference | `visual/ref-certificates-list-375-dark.png` | yes |

### Measured theme/surface (evidence)

**Implementation:** `dataTheme=dark`, `colorScheme=dark`, `htmlBg=rgba(0,0,0,0)`, `bodyBg=rgb(23,26,23)`, cabinet surface `rgb(24,26,25)` luma ≈ 25.

**Reference:** `dataTheme=dark`, `colorScheme=dark`, `htmlBg=rgba(0,0,0,0)`, `bodyBg=rgb(24,26,25)`, cabinet surface `rgb(24,26,25)` luma ≈ 25.

Capture: `R03_ONLY_DARK_PAIR=1 node scripts/r03-local-acceptance.mjs` → `READY_FOR_REVIEW`.

Other visual pairs from prior FINAL-4 run not re-captured in this scoped fix.
