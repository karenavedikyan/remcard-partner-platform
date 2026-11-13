# П6 → K1/P1/P4/P5 — receiving interface handoff

**Prototype:** `design/general-prototype/partner/client-appeals.js` @ `3dc31836`  
**Production pin:** `57ca4680` (proxy has **no** `client-appeals*`)  
**P2 observer decisions:** `origin/cursor/remcard-p2-acceptance-20261113` (observer absent; AgentClient ≠ appeals)

## Hook / role (accepted)

- `ClientsDirectionWorkspace` — hook-free router + `ClientsDirectionTabbedPane key={accessMode}` (`5b93b6a6`+).
- C04: observer keep-alive within same role; reset on role key change.

## Typed surface (`receiving-appeals-api.ts`)

| Prototype function | API (contracts.ts) | Owner |
|--------------------|-------------------|-------|
| `filterAppeals(incoming)` | `GET /api/pro/client-appeals?…` | K1 + P1 allowlist |
| `renderListPage` list/kpi/buckets | Response `ReceivingAppealsListResponse` | **П6** list shell |
| `renderManualInline` | `POST /api/pro/client-appeals` | **П6** form stub |
| `renderDetailPage` | `GET/PATCH /api/pro/client-appeals/:id` | **P4** detail/history |
| `renderBulkEditPanel` / batch | `POST /api/pro/client-appeals/batch` | **P5** bulk |
| `renderSettingsInline` | `GET/POST …/working-stages` | **П6** `WorkingStagesEditor` |
| `commitStageChange` | `PATCH` stage fields | P4 + wallet owners |

**Entity `ReceivingAppealListRow`** mirrors prototype `Appeal` typedef (lines 218–243 in JS).  
**Identity:** `receivingPartnerUserId` = User.id; see `receiving-identity-correction-handoff.md` (not Branch.id).

## K8 canonical contract (candidate — **not on origin yet**)

See `k8-root-gap-handoff-20261113.md` for Root gaps #1–#5, ACCESS BLOCKED on `fc33b4fa` / `16253b84`, and scan→appeal integration proposal.

## K1 / P1 decisions required (before UI replaces blocker)

1. Confirm origin routes + auth: receiving partner only (`receivingPartnerId` scoped to session).
2. Add allowlist patterns in `remcard-proxy.ts` (same style as `agent-clients`).
3. Response shapes must match exports in `receiving-appeals-api.ts` (or version bump coordinated here).

Until `isReceivingAppealsProxyReady()` → **true**, `ReceivingAppealsWorkspace` shows `ReceivingAppealsBlocked` (no fake data).

## P4 handoff

```ts
onOpenAppeal?: (appealId: string) => void;
patchReceivingAppeal(id, ReceivingAppealPatchBody);
// history: appeal.history[] in detail GET — prototype pushHistory
```

## P5 handoff

```ts
ReceivingAppealsBatchBody;
// prototype bulkSelectedAppeals, bulkStageEditBlocked
```

## P7 handoff

CSS classes: `ca-kpi-strip`, `ca-row`, `ca-bucket-tabs`, `ca-filters` from prototype — **do not** add global CSS in П6.

## П6 not done (blocked)

- Full `renderListPage` UI (filters, KPI, bulk bar, scan/manual nav).
- Replacing blocker with “complete CRM” claim.
- DB/migrations/deploy.
