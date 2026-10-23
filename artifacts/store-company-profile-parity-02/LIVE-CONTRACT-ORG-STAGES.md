# Org catalog renovation stages — live contract proposal (no implementation in 02.x)

## Gap (confirmed)

- Draft-only `Organization.catalogDraft.navigatorStageIds` survives PATCH/GET/submit snapshot.
- `buildOrgApproveUpdate` applies only column fields via `orgCatalogColumnsToPrisma`; **does not** promote stages to live storage and clears `catalogDraft` / `catalogUnderReview`.
- Public catalog read/filter paths for STORE/COMPANY org cards do not read draft JSON meta.

## Proposed minimal schema addition (for approval)

Add to **`Organization`** (single source for org-level public card, aligned with `storeCategories` / `specializations`):

```sql
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "catalogNavigatorStageIds" TEXT[] NOT NULL DEFAULT '{}';
```

No backfill required for correctness: existing published orgs keep `[]` until partner resubmits or an approved edit adds stages. Demo rows are not production requirements.

Alternative if rejected: prove an existing live field already carries org stages with moderation-safe semantics (none found on `Organization` / `Branch` today).

## Lifecycle mapping

| Phase | Storage | Rules |
|-------|---------|--------|
| Draft edit (DRAFT / APPROVED+staging) | `catalogDraft.navigatorStageIds` (+ optional live overlay when APPROVED) | Same guards as other org catalog fields; PENDING blocks public content edits; pin/touched meta unchanged |
| Submit | `catalogUnderReview` snapshot | Include normalized stage ids in `orgModerationSnapshotWithContacts` |
| Approve | Live column `catalogNavigatorStageIds` | `buildOrgApproveUpdate`: copy from frozen underReview/draft via `applyOrgCatalogDraftToPrisma` helper |
| Reject / unpublish | Live column unchanged | Draft may retain partner edits per existing rules |
| GET `/api/pro/profile` | `organization.publicNavigatorStageIds` | Effective = live columns overlaid by draft when staging (mirror categories) |
| Preview (F) | Draft slice | Uses effective GET fields, not `User.catalogNavigatorStageIds` |
| Public catalog / navigation | Read live column (+ branch-level only if product later scopes per branch) | Filter invalid ids with `isNavigatorRenovationStageId` |

## Validation & access

- PATCH: `normalizeOrgCatalogNavigatorStageIds` (taxonomy ids only, no empty strings).
- Submit: require ≥1 valid stage alongside categories (already enforced in 02.5).
- Explicit `[]` allowed in draft; submit fails until partner selects stages.
- Owner-only PATCH; staff/employer types unchanged.

## Regressions to add with live column

- Approve promotes stages to live column; subsequent GET without draft returns live ids.
- Re-submit after APPROVED stages draft diff in underReview only.
- Public catalog query respects org `catalogNavigatorStageIds` when filter present.
- No silent use of owner `User.catalogNavigatorStageIds` for org entity.

## Out of scope for implementation PR

- Automatic backfill from working profile stages.
- Auto-republish / hide legacy cards.
- JSON-only “live bypass” without moderation.
