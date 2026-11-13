# P6 @ 78fd46e7 — exclude vendored P5 paths from P6 ownership

Root assembly must **not** treat P6 commit copies as authoritative for P5 bulk UI.

## P5 canonical (handoff in 78fd46e7 audit)

| Artifact | Owner | Pin |
|----------|-------|-----|
| `ReceivingBulkActions.tsx` | **P5** | `ca2855fb` (vendored into P6 tree; select **P5 blob** at publish) |
| `receiving-bulk-handoff.ts` | **P5** | `ca2855fb` |

## Paths present @ P6 `78fd46e7` (collision)

These exist under `src/components/clients/receiving/` in the P6 commit but are **excluded from P6 `ownerProductAllowlist`** in `generate-packaging-manifest.py`:

- `src/components/clients/receiving/ReceivingBulkActions.tsx`
- `src/components/clients/receiving/receiving-bulk-handoff.ts`

## P6-owned @ 78fd46e7 (receiving workspace)

- `ReceivingAppealsWorkspace.tsx`, `ReceivingAppealsList.tsx`, `ReceivingBulkActions` **mount site** only via import
- `src/lib/clients-parity/receiving-appeals-api.ts` — **P6/P2 coordination** (not P1); P1 only documents proxy gates

## P5 observer personal (unchanged ownership)

Still `src/components/clients/observer/ObserverPersonal*.tsx` @ P5 tip — not part of 78fd46e7 receiving bulk vendoring.
