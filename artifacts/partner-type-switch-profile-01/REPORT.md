# REPORT — partner type switch in profile

## Status
READY FOR REVIEW (not DEPLOYED)

## Runtime bases (explicit)
- **Backend baseline (branch root):** `1267da4274826e06b7358f1a785fe275c9cec836`
- **Frontend baseline (branch root):** `f3b996714e2900a20a7ff1d99b8f2d45315a876b`

## Application SHAs (audit follow-up)
- **Backend (runtime):** `a81ded226fcdd823896d8a12792426a3981052b2`
- **Frontend (runtime):** see evidence tip commit below (application + `artifacts/`)
- **Prior blocked candidates (superseded):** backend `8072fe4e`, frontend `a7982c7f`

## Audit blockers addressed in `a81ded22` / frontend follow-up
1. **Atomicity & auth:** `SELECT … FOR UPDATE`, CAS `updateMany` on `updatedAt` + type/activities; in-tx role/blocked/employee checks; prof-test delegation + slot revalidation before write.
2. **Commercial context:** `resolveWalletContext` prefers UI kind over legacy `companyKind`; switch clears `companyKind` when leaving agent principal; profile PATCH guard allows compatible activity adds when UI kind unchanged.
3. **Catalog & prefill:** org `partnerType` not mutated when published / pending / approved; no default «Краснодар»; branch created only when real city exists; working display name/city from working profile helpers.
4. **Tests & UX evidence:** integration adds race (409), idempotent org count, suspended employment, published org immutability, wallet fixture; browser chain asserts `partner-type-current` (+ overview role when section visible), dialog choose/review captures light/dark 1440/390.

## UI ↔ server mapping
| UI kind | `partnerType` | `partnerActivities` |
|---------|---------------|---------------------|
| agent | COMPANY | AGENT |
| specialist | MASTER | SERVICE |
| store | STORE | STORE |
| company | COMPANY | STORE + SERVICE |

Active employment on another principal blocks switch; suspended / historical rows do not.

## API
- `GET /api/pro/partner-type/switch` — current kind, options, optional `?target=` preview
- `POST /api/pro/partner-type/switch` — `{ targetKind, expectedSourceKind }` (409 on stale / concurrent loss)
- Generic `PATCH /api/pro/profile` → **403** only when UI kind would change (`PARTNER_TYPE_USE_SWITCH_ENDPOINT`)

## Tests (commands / exit 0 on isolated PostgreSQL)
```bash
# Backend
pnpm exec vitest run src/lib/__tests__/partnerKindUi.test.ts
pnpm exec vitest run src/lib/__tests__/partnerTypeSwitchGuard.test.ts
pnpm exec vitest run src/lib/__tests__/partnerTypeSwitch.integration.test.ts
pnpm exec vitest run src/lib/__tests__/proWalletPartnerKind.test.ts

# Frontend
pnpm exec tsc --noEmit
pnpm run build
pnpm exec vitest run src/components/profile/PartnerTypeSettings.test.tsx

# Browser (isolated harness)
bash scripts/partner-type-switch-profile-01/run-browser-gate.sh
```

## Honest limitations (not claimed closed)
- Prof-test delegation revoked **between** HTTP read and write: covered in-tx for POST; not a full middleware re-audit of all pro routes.
- Staff-negative browser path and combining-owner principal edge cases: API/unit/integration only where noted.
- Full financial / catalog-wide regression gate — out of scope.
- Pure-agent compact overview hides `profile-overview-role`; browser asserts overview role only when that block is rendered.

## Changed files (summary)
- **Navigator:** `partnerTypeSwitch.ts`, `partnerTypeSwitchGuard.ts`, `proWallet.ts`, switch route, integration + guard + wallet tests
- **Platform:** `partner-kind-ui.ts`, `profile-overview-display.ts`, `ProfileOverviewSection.tsx`, `PartnerTypeSettings.tsx`, browser gate script + artifacts
