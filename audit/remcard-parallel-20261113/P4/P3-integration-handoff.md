# P3 ← P4 integration handoff (observer detail)

**P4 source tip:** see latest on `cursor/remcard-p4-acceptance-20261113` (`resolveObserverClientBackFrom` added after `effd85f3`).  
**Branch:** `cursor/remcard-p4-acceptance-20261113`  
**P3 file (do not edit from P4):** `src/components/clients/observer/ObserverPartnersListView.tsx`

## Imports (P3)

```ts
import {
  ObserverClientDetailView,
  ObserverClientDetailMissing,
  resolveObserverClientBackFrom,
} from "./ObserverClientDetailView";
import {
  ObserverPartnerDetailView,
  ObserverPartnerDetailMissing,
} from "./ObserverPartnerDetailView";
```

## Named exports

| Export | File | Purpose |
| --- | --- | --- |
| `ObserverPartnerDetailView` | Partner | Partner drill-in |
| `ObserverPartnerDetailMissing` | Partner | `nav.view === "partner"` && `!partnersById.get(nav.partnerId)` |
| `ObserverClientDetailView` | Client | Client drill-in |
| `ObserverClientDetailMissing` | Client | `nav.view === "client"` && `!appeal` |
| `ObserverClientBackFrom` | Client | `"partner-clients" \| "partners-list" \| "flat-list"` |
| `resolveObserverClientBackLabel` | Client | Maps `backFrom` → visible `← …` string |
| `resolveObserverClientBackFrom` | Client | Maps P3 `nav` slice → `backFrom` |

## `resolveObserverClientBackFrom` (P3 callsite)

```ts
const clientBackFrom = resolveObserverClientBackFrom({
  navPartnerId: nav.view === "client" ? nav.partnerId : undefined,
  layout,
});
```

Rules (mirrors prototype `clientAppealsSubpageBack`):

| Context | `backFrom` | Visible back (no `backLabel` override) |
| --- | --- | --- |
| Opened via `openClientPage(id, partnerId)` | `partner-clients` | `← К списку клиентов` |
| Flat layout, no `nav.partnerId` | `flat-list` | `← Назад к списку` |
| Otherwise | `partners-list` | `← К партнёрам` |

`backLabel` prop remains optional override; prefer `backFrom` for consistency.

## P3 wiring sketch (partner branch)

Replace silent fall-through when partner missing:

```tsx
if (nav.view === "partner") {
  const partner = partnersById.get(nav.partnerId);
  if (!partner) {
    return (
      <ObserverPartnerDetailMissing
        partnerId={nav.partnerId}
        onBack={() => setNav({ view: "partners" })}
      />
    );
  }
  // existing ObserverPartnerDetailView …
}
```

## P3 wiring sketch (client branch)

```tsx
if (nav.view === "client") {
  const clientBackFrom = resolveObserverClientBackFrom({
    navPartnerId: nav.partnerId,
    layout,
  });
  const appeal = appeals.find((a) => a.id === nav.clientId);
  if (!appeal) {
    return (
      <ObserverClientDetailMissing
        clientId={nav.clientId}
        backFrom={clientBackFrom}
        onBack={backFromSubView}
      />
    );
  }
  return (
    <ObserverClientDetailView
      appeal={appeal}
      partner={partnersById.get(appeal.receivingPartnerId)}
      backFrom={clientBackFrom}
      onBack={backFromSubView}
    />
  );
}
```

## Test ids (page / browser)

| Control | `data-testid` |
| --- | --- |
| Partner page root | `ca-observer-partner-page` (`data-ca-state="missing"` when 404) |
| Client page root | `ca-observer-client-page` (`data-ca-state="missing"` when 404) |
| Back | `ca-clients-back` |
| Partner 404 body | `ca-observer-partner-missing` |
| Client 404 body | `ca-observer-client-missing` |

## Not P4 / still BLOCKED

- Timeline, purchase amount, personal alias UI — `BLK-OBSERVER-REFERRED` / P5
- Page-level mobile acceptance — Root browser matrix (component tests ≠ page acceptance)
