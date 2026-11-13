# P4 detail export contract (stable — reconcile P3 @ 9c3221ad)

**P4 tip (detail):** `eb4592fd64f33763f705bfda564b4988a8267c2b`  

**No-mock stack evidence:** ephemeral `f7198e9d` + `9c3221ad` → `P3.ObserverPartnersListView.back-label.test.tsx` **5/5 PASS** (log: `p3-p4-stacked-vitest.log`). Not committed merge on P4 branch.

**P3 integration tip:** `9c3221adb336f783d173c92a3408af18522aa35c`  
**Publication base (partner, read-only):** `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`  
**Navigator (read-only):** `8137ddd1ae5bad880fa28df34bab04e460bf2bdd`

## Selected paths for Root assembly

```
src/components/clients/observer/ObserverPartnerDetailView.tsx
src/components/clients/observer/ObserverClientDetailView.tsx
```

Tests (evidence, not page acceptance):

```
src/components/clients/observer/P4.*.test.tsx
```

## Single import surface (P1 routes / P3 shell)

From `./ObserverClientDetailView`:

| Export | Kind |
| --- | --- |
| `ObserverClientBackFrom` | type union |
| `ObserverClientDetailView` | component |
| `ObserverClientDetailMissing` | component |
| `resolveObserverClientBackLabel(backFrom?, backLabel?)` | string |
| `resolveObserverClientBackFrom({ navPartnerId?, layout? })` | `ObserverClientBackFrom` |
| `observerClientBackFrom({ partnerId? }, layout)` | `ObserverClientBackFrom` — **P3 should import this** instead of duplicating in list view |

From `./ObserverPartnerDetailView`:

| Export | Kind |
| --- | --- |
| `ObserverPartnerDetailView` | component |
| `ObserverPartnerDetailMissing` | component |

`ObserverClientDetailView` props: `{ appeal, partner?, onBack, backFrom?, backLabel? }`.

## P3 reconciliation (no P4 edits to list view)

P3 @ 9c3221ad uses `import * as ClientDetailModule` + optional `ObserverClientDetailMissing`. Signatures match when P4 ≥ `effd85f3` + `resolveObserverClientBackFrom` / `observerClientBackFrom` @ post-`f7198e9d`.

**P3 follow-up (owner P3):** replace shell-local `observerClientBackFrom` body with `export { observerClientBackFrom } from "./ObserverClientDetailView"` re-export to avoid drift.

## Remaining gap (honest)

| Gap | Owner | Action |
| --- | --- | --- |
| Stacked shell not on P4-only branch tip | Root | Assemble `9c3221ad` + P4 detail paths |
| Referred appeals / timeline / purchase | P2 + API | Prove contract — not working endpoint |
| Personal meta persistence | P5 | No fake save |
| Page/mobile browser | Root | After stack green — not component-only |
