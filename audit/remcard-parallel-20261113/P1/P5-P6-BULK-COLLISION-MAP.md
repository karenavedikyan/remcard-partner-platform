# P5 ↔ P6 bulk collision map (Root rejection)

**Do not** publish or assembly-select P6 whole tip `3d6c7637` bulk UI duplicates.

## Rejected (P6 @ `3d6c7637`)

| Path | Issue |
|------|--------|
| `src/components/clients/receiving/ReceivingBulkToolbar.tsx` | Duplicate of P5 bulk toolbar |
| `src/lib/clients-parity/receiving-bulk-contract.ts` (or `receiving/**/receiving-bulk-contract`) | Duplicate contract surface |
| `src/components/clients/receiving/ReceivingBulkEditPanel.tsx` | **Collides** with P5 @ `1298491f` |

Root: reject bulk ownership workaround; **never** silently select 3d6c7637 blobs.

## P5 canonical (select at publish)

**Pin:** `164b8dbe` (Root selected P5; supersedes `1298491f`)

| Role | Typical paths (verify @ P5 tip) |
|------|----------------------------------|
| Toolbar | `ReceivingBulkToolbar.tsx` |
| Edit | `ReceivingBulkEditPanel.tsx` |
| Confirm | `ReceivingBulkConfirmPanel.tsx` (if present @ P5) |
| Helpers | `receiving-bulk-handoff.ts`, `receiving-bulk-contract.ts` |

Legacy note: P6 `78fd46e7` also vendored `ReceivingBulkActions.tsx` — **exclude**; use P5 `1298491f` lineage.

## P6 allowed scope (per-path pins, not whole 3d6c7637)

| Pin | Scope |
|-----|--------|
| `86251070900989cf82100376ffb870535f0477f3` | Mounted detail host, settings (`WorkingStagesEditor`), P4 detail bridge — **preserve** |
| `78fd46e70fa6cd5b1eb08aa79a9554505a121c00` | Workspace/list **transport** orchestration (batch HTTP wiring only — no duplicate bulk UI files) |

P6 owns: workspace, list, detail **host**, HTTP adapters — imports **P5** bulk components.

## Proxy vs production `57ca4680`

| Layer | Status @ P1 `0bb25b9b` |
|-------|-------------------------|
| Partner `remcard-proxy.ts` | **Source-prepared**: batch POST, detail GET/PATCH, `working-stages` GET/POST (+ extended K1/K2 allowlist) |
| Production partner tree @ `57ca` | **No** receiving workspace routes product — gate/empty states unchanged |
| Navigator @ `89fb8e07` | Published profile ≠ Clients section ready; **no DB** in synthetic review |

Transport allowlisted ≠ mounted UI on production base.

## P4 / P6 inform

- P6 must **drop** imports of 3d6c7637 duplicate bulk modules; wire P5 `1298491f` exports only.
- Detail/settings integration doc @ `86251070`: `audit/.../P6/p4-detail-settings-integration-handoff.md` (read via `git show`, not vendored by P1).
