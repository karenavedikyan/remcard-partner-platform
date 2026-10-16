# R03-PARITY-TAIL RC

**Base branch:** `cursor/r03-ui-parity-b3e3` (platform PR #18 stack)  
**Profile checkpoint:** `ce2921e` accepted separately on PR #19 — not mixed into this diff.

## Closed in this pass

| Area | Change |
|------|--------|
| Certificate card | Purchase-state badge («Есть покупки» / «Ожидает покупки») vs lifecycle caption («Активен»…) |
| Certificate footer | Author + «Подробнее ↗» one row (ellipsis + title, link ink/600) |
| Client mobile LIST | Name/task/detail top; purchase pill + actions on bottom row |
| Fixtures | Shared `PARITY_MATCH` seed + usage mark for Anna purchase state |
| Evidence | `R03_PARITY_TAIL_CAPTURE=1` matched pairs 1440/375 light/dark + 320 smoke |

## Honest limits

- Full-page pixel parity not claimed; CAPTURED ≠ visual PASS.
- Reference hides demo chrome at capture; impl uses isolated test stack.
- Bonus totals remain «—» without financial API.

## SHAs (fill after verify)

| Repo | Tip |
|------|-----|
| Platform | `2f8704dae9c466e2cb11f834eaed901fe2456013` |
| Navigator | `f8310b1f92fe2abc790661bcae5886c73415176c` |

See `TEST-RESULTS.json` for commands, exit codes, and counts.
