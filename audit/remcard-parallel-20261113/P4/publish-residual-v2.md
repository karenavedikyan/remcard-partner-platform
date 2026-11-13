# REM-PUBLISH-RESIDUAL-20261113-V2 — П4 detail slice

## Selected diff (publication candidate — detail owner only)

| File | Role |
| --- | --- |
| `src/components/clients/observer/ObserverPartnerDetailView.tsx` | partner detail + `ObserverPartnerDetailMissing` |
| `src/components/clients/observer/ObserverClientDetailView.tsx` | client detail + `backFrom`/`resolveObserverClientBackLabel` + `ObserverClientDetailMissing` |
| `P4.*.test.tsx` | synthetic component/navigation evidence |

**Not in this diff (Root publish):** `ObserverPartnersListView.tsx` — must adopt missing shells + `backFrom`/`backLabel` for page-level acceptance.

## Publication navigator (read-only)

`release/prof-backend-v1-20261007` @ `3c37ca2557069a43544b7d72848fd53c37e3be5e` — shell fixes preserved; this slice layers on observer detail JSX only.

## Evidence (scoped tests — not page acceptance)

```bash
./node_modules/.bin/vitest run \
  src/components/clients/observer/P4.ObserverPartnerDetailView.test.tsx \
  src/components/clients/observer/P4.ObserverClientDetailView.test.tsx \
  src/components/clients/observer/P4.observer-detail-navigation.test.tsx \
  src/components/clients/observer/ObserverPartnerDetailView.test.tsx \
  src/components/clients/observer/ObserverPartnersListView.test.tsx
```

**24/24 PASS** — see `vitest-p4-v2.log` after commit.

## Criterion ledger (P4-owned)

| Criterion | Evidence | Status |
| --- | --- | --- |
| Grouped partner→client→partner back | `P4.observer-detail-navigation` | **PASS** (component) |
| Flat list→client→list back | same + `← Назад` until P3 wires `backFrom` | **PARTIAL** |
| Prototype back labels (`К списку клиентов` / `К партнёрам`) | `resolveObserverClientBackLabel` + unit tests | **PASS** (API ready) |
| Long partner name in `h2` | fixture partner + heading test | **PASS** |
| Long appeal id visible | `ca-observer-appeal-id` | **PASS** |
| Missing partner/client records | `*DetailMissing` + tests | **PASS** (not mounted in shell) |
| Keyboard back (Tab+Enter/Space) | P4 partner tests | **PASS** |
| Mobile 320px visual / overflow | — | **NOT_VERIFIED** (no browser in agent; run shared `observer-mobile-navigation.computed.test.ts` with mock server) |
| Timeline / purchase / personal notes | BLK-OBSERVER-REFERRED placeholder | **BLOCKED** (contract) |

## Unresolved → next action

1. **P3** — On unknown `partnerId`/`clientId`, render `ObserverPartnerDetailMissing` / `ObserverClientDetailMissing` instead of silent list fallback; pass `backFrom` on `ObserverClientDetailView` from `nav`.
2. **P5** — Personal alias/tag/note read-only blocks when overlay confirmed (no fake persistence).
3. **Root** — Package this diff with green observer suite; no full branch transfer.
4. **QA browser** — `NOT_VERIFIED`: `npx vitest run src/lib/clients-parity/observer-mobile-navigation.computed.test.ts` against local preview with egress blocked.
