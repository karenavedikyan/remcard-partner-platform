# П3 → П2 / П5 / Root — handoff загрузки и personal persist

**Branch:** `cursor/remcard-p3-acceptance-20261113`  
**Read-only refs:** P2 `CONTRACT-DECISIONS.md`, `contracts.ts`, P1 BFF allowlist (no `referred-appeals*` today)

**K8 candidates (navigator, not release):** `remcard-navigator` branch `cursor/remcard-k8-acceptance-20261113` @ `fc33b4fae859fb692757807c3b27696b66d57558` — `src/lib/clientAppeals/HANDOFF.md`, `contract.ts` (handoff commit `16253b84` not fetched here; read at `fc33b4fa`).

## 1. GET list (load adapter owner: П3)

| | |
|---|---|
| **Client path** | `GET /api/pro/referred-appeals` via `remcardFetch` → `/api/remcard/api/pro/referred-appeals` |
| **Implementation** | `src/lib/clients-parity/fetch-observer-appeals.ts` |
| **BFF today** | **403 Path not allowed** until `remcard-proxy.ts` allowlist (P1/Root), **not** П3 |

### 1.1 GET list (K2 @ 72193c78 — actual)

```json
{
  "items": [/* observer appeal DTO */],
  "page": 1,
  "limit": 25,
  "total": 0,
  "hasMore": false,
  "empty": true,
  "receivingPartners": [/* optional; required for UI when total>0 */]
}
```

П3 `fetchObserverReferredAppeals` запрашивает страницы (`limit`≤100, `fetchAllPages` по `hasMore`). Без `receivingPartners` / embedded `receivingBranch` при `total>0` — **SERVER** (не пустой fake ready).

Legacy `{ appeals, partners }` ещё читается для тестов/перехода.

### 1.2 Response 200 (wire → UI)

**Wire (K2/K8 observer-safe slice)** — only these appeal fields may reach the adapter (see `OBSERVER_APPEAL_FORBIDDEN_WIRE_FIELDS` in `fetch-observer-appeals.ts`):

| K8 `contract.ts` | Partner UI `types.ts` |
|------------------|-------------------------|
| `clientDisplayName` | `clientName` |
| `receivingBranchId` | `receivingPartnerId` (branch id = card key) |
| `referrerProUserId` | `referrerPartnerId` (**pro user id** until P2 renames) |
| `stageKey` (`sys_*` / `ws_*`) | `stageId` via `mapK8AppealStageKey` |
| `createdAt` | `referralAt` when `referralAt` absent |
| `certificateId`, `interest`, `updatedAt` | same |

**Forbidden on observer wire (strip/ignore):** `privateNotes`, `clientContact`, purchase/finance projections (`paidAmountKopecks`, `purchaseOrderId`, `paidAt`, …), receiving CRM fields (`manualSourceKey`, `clientCity`, `budgetHint`, …).

**Personal overlay:** `personalMeta` record and/or `personalOverlays[]` (`ClientAppealPersonalOverlay` without `viewerUserId` in UI). K5 owns writes.

Types: `src/lib/clients-parity/types.ts`. Workspace rehydrates `displayPersonalMeta` after GET (read-only).

**GET must never write** (K8 HANDOFF).

### 1.2 Load result union (`ObserverAppealsFetchResult`)

| `code` | HTTP / cause | UI (`ObserverPartnersWorkspace`) |
|--------|----------------|----------------------------------|
| `BLOCKED_CONTRACT` | 403 proxy block, missing route inventory | `ObserverContractBlocked` |
| `UNAUTHORIZED` | 401 | error + no retry |
| `FORBIDDEN` | 403 (non-proxy) | error + no retry |
| `NOT_FOUND` | 404 | error + retry |
| `NETWORK` | status 0 / fetch failure | error + **retry** |
| `SERVER` | 5xx | error + **retry** |

No fake `ok: true` without a real 200 body. No hardcoded production dataset in product path.

## 2. Personal persist (mutation adapter owner: **П5**; parent wiring: **П3**)

П3 **does not** implement PATCH/POST. ListView accepts optional callbacks; workspace forwards props from П5 adapter when it lands.

### 2.1 Exported from `ObserverPartnersListView`

```ts
ObserverPersonalPersistenceCallbacks = {
  onSavePersonal?: (args: {
    mode: "single" | "bulk";
    ids: string[];
    draft: PersonalEditDraft; // from ObserverPersonalEditPanel export
  }) => Promise<ObserverPersonalPersistResult>;
  onBucketAction?: (args: {
    action: "archived" | "trash" | "restore";
    ids: string[];
  }) => Promise<ObserverPersonalPersistResult>;
};

ObserverPersonalPersistResult =
  | { ok: true; meta: Record<string, ObserverPersonalMeta>; failedIds?: string[] }
  | { ok: false; message: string; failedIds?: string[] };
```

**Parent merge:** `onPersonalMetaUpdated(nextMeta)` — workspace merges into state; filters/selection stay in ListView.

**Partial failure:** `failedIds` keep selection; confirmed ids merged into meta; filters unchanged.

**Fallback:** if callbacks absent → existing `BLOCKED_PERSISTENCE` notice (no localStorage).

### 2.2 K5 actual routes (navigator @ 86ac3e35)

| Method | Path | Notes |
|--------|------|-------|
| `PATCH` | `/api/pro/referred-appeals/:id/personal-meta` | body: `expectedVersion?, alias?, tag?, note?, action?, target?`; response `{ meta }` |
| `POST` | `/api/pro/referred-appeals/personal-batch` | `action: move \| restore \| setTag`, `mode`, `expectedVersions?`; response `processed[]`, `skipped[]` |

**Do not use** P5 draft paths `/api/pro/client-appeals/.../personal-overlay`.

П3 adapter: `src/lib/clients-parity/observer-personal-api.ts` → `createObserverPersonalPersistenceCallbacks` (workspace default).

### 2.3 P5 follow-ups (out of П3)

- Replace P5 `observer-personal-api.ts` invented routes with K5 paths or import П3 module.
- Enable save in `ObserverPersonalEditPanel` (still disabled in P5 UI).

## 3. Root-reported K8 gaps (do not propagate)

| # | Gap | Owner / note |
|---|-----|----------------|
| 1 | `access.ts` `canObserveOwnReferrals` ties to `canViewOwnOperations`; prod `ownerClientsAccess` allows eligible agent/specialist without employment | **K8** must align with **existing** eligibility (read-only reuse of server gates); П3 does not implement gates |
| 2 | Prototype `partnerSettings` stage CRUD vs `fc33b4fa` schema without settings persistence | **K8** additive storage + contract; not observer list |
| 3 | Active certificate uniqueness / `take:5` race | **K8** DB transaction + prototype `findActiveAppeal` predicate |
| 4 | `storeCertificateScan.ts` create hook outside allowlists | **Root** minimal integration proposal only; П3 does not edit scan |
| 5 | Strict observer DTO | **P2/K2** enforce on origin; **П3 adapter** maps + drops forbidden keys |

## 4. Unresolved for publication

| Dependency | Owner |
|------------|-------|
| K2 observer GET + P2 BFF DTO forward | K2/P2 |
| `referred-appeals` allowlist | P1/Root |
| Personal-meta routes + П5 adapter | K5/P5 |
| Production DB migrate | User separate approval |
| П4 detail stack on disk | Root cherry-pick |
| Profile pin `89fb8e073c39c8dbd329996940b85c6a86751868` (Timeweb) | Root publish |

**Section acceptance:** not claimed by this handoff.
