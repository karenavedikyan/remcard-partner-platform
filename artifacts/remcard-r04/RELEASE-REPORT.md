# RemCard R04.4 — Agent Partners (three remainders)

## HEAD

| Repo | Branch | HEAD |
|------|--------|------|
| remcard-partner-platform | `cursor/r04-agent-partners-b3e3` | `a337b40` (code/capture `a337b40`) |
| remcard-navigator | `cursor/r04-agent-partners-b3e3` | `4d275090657113b5765e90e2e1bee4c7eaa36fce` (unchanged) |

Review baseline carried from R04.3: platform `a03ca3c`, navigator `4d275090`.

## R04.4 delta (only open items)

1. **Direct workspace actions** — list/cards/mobile show share, rename, archive/restore, details (eye), more on the surface via `AgentPartnerWorkspaceActions`; pause/resume and other business actions stay in expanded details. Card face drops duplicate city/terms line (percent terms remain in details).
2. **Find modal order** — ref sequence: lead → contrast spec/stage block with field hints → combined-filter hint → optional search + «Найти» → collapsed city/type → results with `partnerSearchResultMeta`. Filter CSS: `min-width:0`, `width:100%`, grid gap. Hub primary CTA: white on red in light (`data-theme`/system dark keeps accent-ink).
3. **R03 accept proof** — after accepting incoming «Свет и электрика», acceptance checks ACTIVE via fresh list GET, `available-partners` API, and the partner label on `/certificates/new` (not pre-existing «Дом материалов»).

## Commands (exit codes in `TEST-RESULTS.json`)

```bash
cd remcard-partner-platform && pnpm exec vitest run src/components/partners/PartnersHub.test.tsx   # 0
cd remcard-partner-platform && node scripts/r04-browser-acceptance.mjs   # 0 (includes build)
cd remcard-partner-platform && node scripts/r04-ui-parity-visual.mjs   # 0
```

## Captures (R04.4 recapture)

Re-shot: P1, P2, P3, P5, P6, P7, P8, P9, modal-320, acceptance impl-partners-* (same run as acceptance/visual).

Carry-over unchanged from R04.3 operator review (same SHA as prior ref pairs): P4 invitations, ref-r04-* reference PNGs, invite in/out extras unless listed above.

**Status:** READY_FOR_REVIEW — `visualParityOk: false` (human composition sign-off still required).

No merge / deploy / production DB / flags / R05.
