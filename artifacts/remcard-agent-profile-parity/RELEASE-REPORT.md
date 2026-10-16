# Agent profile parity RC (in progress toward owner RC)

**Not merge/deploy/production.** R03-PARITY-TAIL waits on this control point.

## Git

| Repo | Branch | Role |
|------|--------|------|
| remcard-partner-platform | `cursor/agent-profile-parity-b3e3` PR **#19** | UI + server gate on `/profile` |
| remcard-navigator | `cursor/agent-profile-parity-b3e3` | DELETE draft, requisites `label` column |

**Stack base:** `cursor/r03-ui-parity-b3e3` (PR **#18** @ `daf9410…`).

## Verified commands (this run)

```bash
npm run build                                    # exit 0
npx vitest run src/lib/profile-sections.test.ts \
  src/components/profile/agent/AgentProfileWizard.regression.test.tsx  # 13/13 pass
node scripts/agent-profile-parity-rc.mjs         # writes TEST-RESULTS.json
# Optional captures:
AGENT_PROFILE_VISUAL=1 node scripts/agent-profile-parity-rc.mjs
```

See `TEST-RESULTS.json` for `platformSha`, step exit codes, and counts.

## Closed since first slice (accepted)

- Pure agent tabs (Обзор / Основные данные / Уведомления)
- No legacy `ProfileOverviewSection` / branch switcher in compact mode
- Parity overview: wizard + bank; basics opens editor; no nested Профиль/Реквизиты tabs

## Added this pass

- **SSR agent gate** on `/profile` — avoids 6-tab flash when server resolves eligibility
- **Wizard:** step advance validates name/city; review facts order; **Отменить** with draft discard (DELETE `/agent-profile/draft`)
- **Bank:** reference heading/marker, optional **Название набора**, view/hide, copy + manual fallback, no `vN` in primary UI

## Honest remainder (owner scope)

- Full paired ref/impl PNG matrix (1440/375/320, light/dark, saved/wizard/bank states)
- Browser E2E matrix (finish/reload/bank types/409) as dedicated script run
- Pixel/visual PASS claims — **not** asserted until captures land in `screenshots/`

## Operator notes

- Test banner remains visible on impl captures (documented exception).
- Demo-only reference chrome may be hidden per existing r02 visual allowlist.
