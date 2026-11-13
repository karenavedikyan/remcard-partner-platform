# П3 observer residual (REM-DUAL-FRONT-RESIDUAL)

**Base/tip:** `origin/cursor/remcard-cabinet-nav-r5-final-20261103` → `b85efb54` (+ working tree this turn)  
**Role:** agent observer-only «Мои клиенты у партнёров»

## Frozen backend pins (read-only)

| Owner | SHA (short) | Role |
|-------|-------------|------|
| K8 | `8f4d336ad` | DTO `receivingPartnerUserId`, strict observer allowlist |
| K2 | `c49d71dc` | GET `{ appeals, partners, personalMeta, page… }` |
| K5 | `6c444487` | personal-meta / personal-batch |
| P5 HTTP | `a7b111d2` (partner-platform branch tip) | `applyObserverPersonalEdit`, `runObserverPersonalConfirmAction` |

## Owned product files (П3)

- `src/lib/clients-parity/fetch-observer-appeals.ts`
- `src/lib/clients-parity/filter-observer.ts`
- `src/lib/clients-parity/observer-stats.ts`
- `src/components/clients/observer/ObserverPartnersWorkspace.tsx`
- `src/components/clients/observer/ObserverPartnersListView.tsx`
- `src/components/clients/observer/createObserverPersonalPersistenceBridge.ts`
- Cards/rows/chips/tools/panels under `src/components/clients/observer/` (not P4 detail views)

## User-visible status (not FINISHED)

| Area | Status | Notes |
|------|--------|-------|
| Load / error / retry | **Ready in UI** | Honest codes; BLOCKED_CONTRACT only on proxy path block |
| Grouped / flat / partner+client nav | **Ready in UI** | Back labels depend on P4 stack @ `ad7b0824` |
| Search / period / bucket / reset | **Ready in UI** | Client-side filter after full GET merge; server `q`/`period` not wired from Workspace |
| Personal overlay persist | **Blocked until integrate** | Bridge expects P5 `observer-personal-api.ts`; branch still carries legacy P3 stub |
| Strict observer DTO on wire | **Adapter** | Forbidden fields stripped; K2 still may emit purchase fields until BFF hardens |
| Visual parity (CSS) | **NOT_VERIFIED** | P7 `observer.module.css` not owned; no browser pass this turn |
| Real navigator + DB | **NOT_AUTHORIZED** | Synthetic/mocked only |

## Receiving-trash independence

Observer confirm copy (`ObserverPersonalConfirmPanel`) states partner data unchanged; trash is **viewer personal bucket** only (K5), not receiving CRM delete.

## Client site (К)

**NOT_IN_SCOPE / NOT_VERIFIED on this agent:** workspace is `remcard-partner-platform` only; no К client-site checkout here. Root dual-front residual for wallet/profile/etc. must be reported by К UI owners on client repository — not re-derived in П3 audit.

## Integrate blockers

1. Root selects P5 `observer-personal-api.ts` @ `a7b111d2` + P3 bridge (no P3 edits to P5 file).  
2. P1 proxy allowlist for GET + K5 routes.  
3. P4 detail views for back-label stack tests.  
4. Prod migrate — user approval only.

**Whole Clients section acceptance:** not claimed.
