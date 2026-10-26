# REPORT — partner type switch in profile (audit pass 2)

## Status
READY FOR REVIEW (not DEPLOYED)

## Runtime SHAs
| Role | SHA |
|------|-----|
| Backend application | `e2e295f4d937d425f27a23b56cb3cc403423177b` |
| Frontend application | `892d64f6ba88efacd7776409877b3e9013810082` |
| Evidence tip | `a80a8a11ad5533876cc69f6589b3430ce2398d37` |

Baselines unchanged: backend `1267da4274826e06b7358f1a785fe275c9cec836`, frontend `f3b996714e2900a20a7ff1d99b8f2d45315a876b`.

## Pass-2 blockers — closure matrix

| Blocker | Fix | Verified by (command / exit) |
|---------|-----|------------------------------|
| Prof-test POST fail-open when second `resolveProfTestContext` null | Reject test-marked tokens without valid ctx before mutation; delegation `FOR UPDATE` + pre/post in-tx revalidation | `vitest run …/route.post.prof-test-fail-closed.test.ts` → 403, 0 switch calls; `partnerTypeSwitchProfTest.integration.test.ts` → revoked delegation, 0 user writes |
| Wallet: specialist + retained agent org → AGENT | Own-principal resolution returns MASTER before org companyKind fallback | `proWalletPartnerKind.test.ts` specialist+org OTHER_AGENT → MASTER |
| Wallet: legacy COMPANY [] + companyKind → STORE regression | `isLegacyCompanyAgentWallet` before UI company kind | same file legacy fixture → AGENT |
| Wallet: branch staff overrides own store principal | Own principal resolved before branch staff; staff wallet only if owner ≠ user | same file owner+staff → STORE self |
| POST ok / profile GET fail UX | Separate catch; recovery copy + refresh without second POST | `PartnerTypeSettings.test.tsx` recovery case |
| Specialist wizard dirty not wired | `onDirtyChange` from R06 wizard → `hasUnsavedBasicsChanges` | `PartnerTypeSettings.test.tsx` unsaved guard (no POST) |

## Preserved from pass 1 (not reimplemented)
Row lock + CAS, compatible-activity PATCH guard, catalog org immutability, working-profile prefill, 12/12 matrix integration, choose/review browser captures.

## Commands (isolated PostgreSQL where noted)
```bash
# Backend
pnpm exec vitest run src/app/api/pro/partner-type/switch/__tests__/route.post.prof-test-fail-closed.test.ts
pnpm exec vitest run src/lib/__tests__/partnerTypeSwitch.integration.test.ts
pnpm exec vitest run src/lib/__tests__/partnerTypeSwitchProfTest.integration.test.ts
pnpm exec vitest run src/lib/__tests__/proWalletPartnerKind.test.ts
pnpm exec vitest run src/lib/__tests__/partnerTypeSwitchGuard.test.ts

# Frontend
pnpm exec vitest run src/components/profile/PartnerTypeSettings.test.tsx
pnpm exec tsc --noEmit

# Narrow browser (after servers up)
bash scripts/partner-type-switch-profile-01/run-browser-gate.sh
```

## Honest limitations
- Mid-transaction cross-session revoke race: delegation row lock + double assert; not a full prof-test middleware audit.
- Staff-negative and every cancel/back/stale path: covered by targeted unit tests above, not full Playwright matrix.
- Wallet/browser end-to-end on real payout rows: resolver + API read only, no financial replay.
