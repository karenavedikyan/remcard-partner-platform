# RemCard R04.3 — Agent Partners targeted correction

## HEAD (after push)

| Repo | Branch | HEAD |
|------|--------|------|
| remcard-partner-platform | `cursor/r04-agent-partners-b3e3` | `TEST-RESULTS.json` → `platformHead` |
| remcard-navigator | `cursor/r04-agent-partners-b3e3` | `TEST-RESULTS.json` → `navigatorHead` |

## R04.3 fixes (review blockers)

1. **Desktop table** — local `agent-r04-partners-table` CSS (no R03 checkbox column mismatch); row-height guard in `PARITY-VISUAL.json`.
2. **Action icons** — partnership kinds mapped to SVG (accept/reject/pause/resume/revoke/eye/more); no fallback «•» for R04 row actions.
3. **Acceptance** — archive uses `archiveTargetId` ACTIVE fixture; pass includes archive/alias/R03 partner checks; builds run with real exit codes; migrate order before→apply→after.
4. **Cards** — select strip, divider, compact icon footer (business actions in «Ещё»/details).
5. **Fixtures** — «Мастерская интерьера» as COMPANY + Russian labels via taxonomy helpers; seed guard on hostname+DB+test user.
6. **Hub** — outlined tabs, lead after tabs; invitations toolbar without archive/view-mode noise.
7. **Modal** — ~560px, copy/hints, filter block order, loaded-state capture, Escape/focus trap/scroll lock; viewport shots for modal rows.
8. **List** — row selection + pagination footer.

## Commands (recorded in TEST-RESULTS.json)

```bash
cd remcard-partner-platform && pnpm run build
cd remcard-navigator && npm run build
cd remcard-partner-platform && pnpm exec vitest run src/lib/agent-r04/partner-list-row.test.ts src/lib/agent-r04/partnership-action-icons.test.ts src/lib/agent-r04/partner-filters.test.ts
set -a && source /tmp/admin-test-local-stack/runtime.env && set +a
cd remcard-partner-platform && node scripts/r04-browser-acceptance.mjs
cd remcard-partner-platform && node scripts/r04-ui-parity-visual.mjs
```

**Status:** READY_FOR_REVIEW — `visualParityOk: false` until operator compares impl/ref composition.

No merge / deploy / production / R05.
