# Partner primary kind unification (2026-10-29)

## Branches and SHAs

| Repo | Branch | Base release | Implementation tip |
|------|--------|--------------|-------------------|
| remcard-partner-platform | `feat/partner-primary-kind-unify-20261029` | `1d9bbeb6332b68ba4421a299c1b6b5e3dfe8dd1e` | _(after push)_ |
| remcard-navigator | `feat/partner-primary-kind-unify-20261029` | `4b4c1244f8ed838508e7d4a99796092ebd2cb7ed` | _(after push)_ |

## Problem

`resolvePublicPartnerType` (partner lists/cards/share) treated any `AGENT` activity as primary type **agent**, ignoring `partnerType` COMPANY/STORE. Admin registry and profile already use `resolvePartnerKindUi` (pure agent vs mixed activities).

Confirmed production examples (read-only, 2026-10-29):

| publicId | partnerType | partnerActivities | Canonical kind |
|----------|-------------|-------------------|----------------|
| ОПТОВИК (`cmn6imq…`) | COMPANY | STORE, AGENT | **company** |
| Seda Rallis (`cmp6ruv…`) | COMPANY (technical) | AGENT | **agent** |

Partnership storeUser/proUser sides for Seda↔ОПТОВИК are **not** modified.

## Canonical model (no new schema)

Primary kind = `resolvePartnerKindUi({ partnerType, partnerActivities })`:

1. Pure agent: `AGENT` without `STORE`/`SERVICE` → **agent** (legacy technical COMPANY/STORE allowed).
2. Else derive from `partnerType` + activities (see `src/lib/partner-kind-ui.ts` / backend `partnerKindUi.ts`).

Distinct from `UserRole` (PRO/STAFF/ADMIN) and from extra capabilities (recommendation/agent inviter helpers still use activity checks).

**Schema:** additive migration **not required** — existing `partnerType` + `partnerActivities` suffice when classification is unified.

## Code changes (frontend)

| File | Rationale |
|------|-----------|
| `src/lib/agent-r04/partner-filters.ts` | Delegate `resolvePublicPartnerType` → `resolvePartnerKindUi` |
| `src/lib/partner-kind-ui.test.ts` | Acceptance cases (Seda, OPTOVIK, four kinds) |
| `src/lib/agent-r04/partner-filters.test.ts` | List/share alignment + inverted partnership perspectives |
| `vitest.config.ts` | Include `partner-kind-ui.test.ts` |

Unchanged on purpose: registration/switch (`partnerTypeSwitch.ts` backend), admin API `partnerKind` field, `principalPartnerKindLabel` in profile overview.

## Code changes (backend)

| File | Rationale |
|------|-----------|
| `src/lib/partnerPrimaryKindAudit.ts` | Dry-run audit row builder |
| `src/lib/__tests__/partnerPrimaryKindAudit.test.ts` | Fixture tests (Seda/OPTOVIK/staff/incomplete) |
| `src/lib/__tests__/partnerKindUi.test.ts` | STORE+AGENT company regression |
| `scripts/partner-primary-kind-audit.ts` | Paginated full-registry **read-only** JSON audit |

## Registry audit (dry-run)

```bash
# Local/staging DATABASE_URL only — NOT production write path
cd remcard-navigator
pnpm tsx scripts/partner-primary-kind-audit.ts --json-out=artifacts/partner-primary-kind-audit/dry-run.json
```

- Paginates all `User` with `deletedAt=null` (cursor, page 200).
- Output: `userId`, `publicId`, `displayName`, segment, types, `canonicalKind`, `reason`, `ambiguous`, `conflict`, `proposedChange`.
- **`--apply` exits 2** — normalization not implemented; manual review first.

### Normalization plan (if needed later, guarded)

1. Run dry-run JSON on staging clone; review `ambiguous` / `conflict` rows.
2. Allowlist only `proposedChange=align_display_with_kind:*` with compare-and-set on `updatedAt`.
3. **Do not** strip `AGENT` from COMPANY partners with STORE activity.
4. Transaction + idempotency key per user; default remain dry-run.

**Production registry:** not scanned in this cloud run (no production DB access). Computer can run the script against an approved read-only replica.

## Tests run (agent)

- Frontend: `partner-kind-ui.test.ts`, `partner-filters.test.ts`, `tsc`, `build`
- Backend: `partnerKindUi.test.ts`, `partnerPrimaryKindAudit.test.ts`, `pnpm test` subset

## Known ambiguities

- Empty `partnerActivities` + legacy `partnerType` only → `null` kind (unknown); admin facets count as `unknown`.
- Raw enum `partnerType` on API remains technical storage; UI labels must use `partnerKind` / `resolvePartnerKindUi`.
- Inverted partnership sides (agent as `storeUserId`) affect labels per counterparty view only; no side swap.
