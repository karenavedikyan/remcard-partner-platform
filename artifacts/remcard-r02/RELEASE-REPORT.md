# RemCard R02.6 RC

## PRs (unchanged)

- Backend: https://github.com/karenavedikyan/remcard-navigator/pull/678 — **b6d910ee** (unchanged)
- Frontend: https://github.com/karenavedikyan/remcard-partner-platform/pull/12 — branch `cursor/r02-agent-profile-b3e3`

## Root cause (scoped fix)

`--pw-*` tokens lived only on `.pw` (wizard root). Tabs (`AgentProfileSection`) and `AgentPayoutRequisitesPanel` are **siblings** outside `.pw`, so `var(--pw-*)` was invalid → zero gap/padding/borders (“ПрофильРеквизиты”, bare requisites list).

**Fix:** shared token block on `.pw, .agentScope`; dark theme on both; wrapper `[data-testid="agent-profile-scope"]` around tabs + wizard/requisites. Layout margins stay on `.pw` only. Requisites list uses `.requisitesList` / `.requisitesItemActions` (not wizard `.facts`).

## Evidence

| Check | Result |
|-------|--------|
| Computed tokens on scope/tabs | **PASS** — `--pw-2`, `--pw-bg`, `--pw-line` non-empty; tab gap ≥8px, padding ≥8px, border ≥1px; active ≠ inactive |
| Requisites 320 ready list | **PASS** — seeded item, masked account, card borders |
| Dialog 320 create | **PASS** — in-panel dialog (no portal); themed fields |
| Wizard 375 regression | **PASS** — mobile steps flex/overlap unchanged |
| Desktop / summary | **carry-over** — ~28px width Δ, status radius 6px vs ref pill, demo banner not ported |

Command: `R02_6_CAPTURE=1 node scripts/r02-profile-visual.mjs` → `visual-report.json` (`tokenScope`, `r026Capture`).

Frontend: regression 5/5, `pnpm run build`. Backend **not re-run**.

Production smoke **NOT RUN**. Merge/deploy **NOT RUN**.

See `TEST-RESULTS.json` for SHAs.
