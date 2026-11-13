# П3 → П2 / П5 / Root — handoff загрузки и personal persist

**Branch:** `cursor/remcard-p3-acceptance-20261113`  
**Read-only refs:** P2 `CONTRACT-DECISIONS.md`, `contracts.ts`, P1 BFF allowlist (no `referred-appeals*` today)

## 1. GET list (load adapter owner: П3)

| | |
|---|---|
| **Client path** | `GET /api/pro/referred-appeals` via `remcardFetch` → `/api/remcard/api/pro/referred-appeals` |
| **Implementation** | `src/lib/clients-parity/fetch-observer-appeals.ts` |
| **BFF today** | **403 Path not allowed** until `remcard-proxy.ts` allowlist (P1/Root), **not** П3 |

### 1.1 Response 200 (agreed view-model)

```json
{
  "appeals": "ObserverReferredAppeal[]",
  "partners": "ObserverPartnerMeta[]",
  "personalMeta": "Record<appealId, ObserverPersonalMeta> (optional)"
}
```

Types: `src/lib/clients-parity/types.ts`. Rehydrate overlay on reload: workspace passes `personalMeta` into `ObserverPartnersListView` as `displayPersonalMeta`.

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

### 2.2 P5 follow-ups (out of П3)

- Enable save in `ObserverPersonalEditPanel` + `onSave(draft)` or call adapter with draft from panel.
- Ship `src/lib/clients-parity/*personal*` adapter using  
  `PATCH /api/pro/referred-appeals/:id/personal-meta`,  
  `POST /api/pro/referred-appeals/personal-batch` (per `contracts.ts`).

## 3. Unresolved for publication

| Dependency | Owner |
|------------|-------|
| `referred-appeals` on origin + BFF allowlist | P2/K8 + P1/Root |
| Personal-meta routes + П5 adapter module | P5 + same |
| Production DB migrate | User separate approval |
| П4 detail stack on disk | Root cherry-pick |

**Section acceptance:** not claimed by this handoff.
