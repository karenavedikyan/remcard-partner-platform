# REPORT — partner type switch in profile

## Status
READY FOR REVIEW (not DEPLOYED)

## Runtime bases (explicit)
- **Backend baseline (branch root):** `1267da4274826e06b7358f1a785fe275c9cec836`
- **Frontend baseline (branch root):** `f3b996714e2900a20a7ff1d99b8f2d45315a876b`

## Application SHAs (this implementation)
See `browser-capture.json` / git tips on branch `fix/partner-type-switch-profile-01` after evidence commit.

## UI ↔ server mapping
| UI kind | `partnerType` | `partnerActivities` |
|---------|---------------|---------------------|
| agent | COMPANY | AGENT |
| specialist | MASTER | SERVICE |
| store | STORE | STORE |
| company | COMPANY | STORE + SERVICE |

Employee (branch/partner employee) cannot switch. Staff is not a fifth selectable type.

## API
- `GET /api/pro/partner-type/switch` — current kind, options, optional `?target=` preview
- `POST /api/pro/partner-type/switch` — `{ targetKind, expectedSourceKind }` (409 on stale source)
- Generic `PATCH /api/pro/profile` with `partnerType` / `partnerActivities` changes → **403** `PARTNER_TYPE_USE_SWITCH_ENDPOINT` when principal kind is established

## Side effects (intentional)
- Updates user `partnerType` + `partnerActivities` atomically
- STORE/COMPANY targets sync/create owned org + default branch if missing; existing org not deleted
- Does **not** auto publish/unpublish catalog or change moderation status

## Tests (commands / exit 0)
```bash
# Backend
pnpm exec vitest run src/lib/__tests__/partnerKindUi.test.ts
pnpm exec vitest run src/lib/__tests__/partnerTypeSwitch.integration.test.ts  # PostgreSQL, 12/12 matrix

# Frontend
pnpm exec tsc --noEmit
pnpm run build
pnpm exec vitest run src/components/profile/PartnerTypeSettings.test.tsx
node --test src/lib/remcard-proxy.test.ts  # includes partner-type/switch allowlist

# Browser (isolated harness)
node scripts/partner-type-switch-profile-01/run-browser-partner-type-switch.mjs
```

## Honest limitations (not claimed closed)
- Historical certificate snapshot lifecycle — not re-audited in this task
- Concurrency guarantees for all partnership offer-write paths — not re-audited
- Full financial / catalog-wide regression gate — out of scope (targeted tests only)

## Changed files (summary)
- **Navigator:** `partnerKindUi.ts`, `partnerTypeSwitch.ts`, `partnerTypeSwitchGuard.ts`, `api/pro/partner-type/switch/route.ts`, profile PATCH guard, `profTestRoutePolicy.ts`, integration tests, seed harness
- **Platform:** `PartnerTypeSettings.tsx`, `ProfileEditor.tsx`, `remcard-proxy.ts`, `partner-kind-ui.ts`, browser script, component test
