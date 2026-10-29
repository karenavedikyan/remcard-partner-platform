# PARTNER-ROW-ACTIONS-01

## Git

| | SHA |
|---|---|
| **Base** | `6f8542927c67e12dcb89d1c128fc22ca78186d55` (`release/prof-v1-20261007`) |
| **Branch** | `fix/partner-row-actions-20261029` |
| **Tip** | `a813ef4c9c4b264fd6edfc8382183d78a9df000d` |

Backend unchanged (expected `4b4c1244f8ed838508e7d4a99796092ebd2cb7ed`).

## Summary

Partner list rows (`AgentPartnerCollection`) now show **workflow actions inline** on collapsed table/mobile/card rows using existing `getPartnershipUiActions` (+ ACTIVE extras: «Изменение условий», «Создать сертификат»). The **eye / «Детали» / «Ещё»** path to workflow was removed; workspace actions (share/rename/archive/hide) stay in `AgentPartnerWorkspaceActions`.

**Partner name** (and personal alias title) is a **native button** that opens **`PartnerPartnershipDetailDialog`** (read-only context: role, city, full specializations, all personal terms, status, waiting text, action hints). Opening details does not mutate partnership state. Escape and «Закрыть» return focus to the name control.

## Files touched

| File | Change |
|------|--------|
| `src/components/partners/AgentPartnerCollection.tsx` | Inline workflow, name button, detail dialog wiring; removed row expansion for workflow |
| `src/components/partners/AgentPartnerCollection.module.css` | `.nameButton`, `.inlineWorkflow`, workflow sub-row |
| `src/components/partners/PartnerPartnershipDetailDialog.tsx` | New modal |
| `src/components/partners/PartnerPartnershipDetailDialog.module.css` | New |
| `src/lib/agent-r04/partner-list-row.ts` | `partnerSpecializationFull`, `partnerTermsFullDetail`, `partnerActiveTerms` |
| `src/components/partners/AgentPartnerCollection.test.tsx` | New component tests |
| `scripts/partner-row-actions-visual-harness/*` | Isolated Vite harness (synthetic fixtures, no API) |
| `scripts/partner-row-actions-visual-capture.mjs` | Playwright screenshots 375/1440 light+dark |

## UI behavior (matrix)

| State | Inline (when rules allow) |
|-------|---------------------------|
| Incoming empty agent request (store) | **Предложение агенту** (primary), **Отклонить** |
| Incoming invite with terms | **Принять**, **Отклонить** |
| PENDING, non-author | **Принять условия**, **Запросить другие условия**, **Отклонить** |
| ACTIVE | Rule actions + **Изменение условий** + link **Создать сертификат** |
| PAUSED | **Возобновить** (per rules) |
| Waiting-only | Waiting copy in inline strip |

Details dialog adds plain-language hint for empty agent requests (recommend products/services, store may prepare offer). No `storeUser`/`proUser` technical labels.

## Verification

```bash
cd remcard-partner-platform
npm run test:component -- src/components/partners/AgentPartnerCollection.test.tsx src/components/partners/PartnersHub.test.tsx
# 13 passed

set -o pipefail && npm run build
# BUILD_EXIT=0

node scripts/partner-row-actions-visual-capture.mjs
# 16 PNGs → artifacts/partner-row-actions-01/screenshots/
```

Recorded in `artifacts/partner-row-actions-01/verify-exit-codes.txt`.

**Scope limits:** Harness is **component-only** (Vite + fixtures), not live `prof.remcard.ru` E2E. No real offers/notifications. Full monorepo `vitest run` still has unrelated failures in other suites (e.g. consent context); partners tests above are green.

## Evidence

After change (synthetic harness):

- `artifacts/partner-row-actions-01/screenshots/incoming-agent-375-light.png` — primary «Предложение агенту» visible without eye menu
- `artifacts/partner-row-actions-01/screenshots/incoming-agent-1440-light.png` — desktop table + workflow sub-row
- `artifacts/partner-row-actions-01/screenshots/pending-375-dark.png` — pending actions inline
- `artifacts/partner-row-actions-01/capture-results.json` — manifest

Before: workflow lived only under expanded row via trailing «Детали»/«Ещё» (see base `AgentPartnerCollection.tsx` at `6f854292`). No production before-screenshots captured in this run.

## Not done (by request)

- PR / merge / deploy
- Backend changes
- Live submission to Seda Rallis or any partner
