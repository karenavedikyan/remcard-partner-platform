# R03-PARITY-TAIL — queued AFTER AGENT-PROFILE-PARITY

**Owner order:** do **not** start this until profile has its own RC (commit/PR/report). Do **not** mix into profile PR **#19**.

## Integration base (use latest tips at start, not frozen blindly)

| Repo | Accepted R03 reference | Notes |
|------|------------------------|--------|
| Platform | PR **#18** (last verified tip `daf9410…`, code delta `386d2f5…`) | Re-branch from current `#18` / post-profile stack tip |
| Navigator | PR **#681** (`0aa8db4c…`, runtime `65115075…`) | Minimal DTO if purchase-state needs read-only flag |

**Already accepted — do not rework:** 1-col cards, 3 stats row, hero CTA, mobile toolbar show+view row + filters below, compact client pill, mobile record borders, desktop client table geometry, viewport bottomnav proof.

## Tail scope (summary)

### Certificate
- Footer composition: author + «Подробнее ↗» one row (wrap/min-width, no action clip)
- «Подробнее» theme/weight; caption REMCARD, checkbox/actions, lower gradient/spacing vs reference CSS
- Badge: **purchase state** vs lifecycle «Активен» — use real data or minimal read-only DTO + test

### Client
- **Cards:** keep compact badge above name, actions right
- **Mobile LIST only:** match reference list (name/task top; bottom row badge + compact actions) — **not** cards layout

### Evidence
- One truly matched cert + one client fixture (ref + impl isolated seed)
- Paired PNG: 1440 + 375 light/dark; 320 smoke for touched components
- Honest TEST-RESULTS (commands, exit codes, counts, SHA)

## Delivery

Separate branch/PR `R03-PARITY-TAIL`, RC report, no merge/deploy/production.

**Blocked on:** AGENT-PROFILE-PARITY RC (`cursor/agent-profile-parity-b3e3`, PR **#19**).
