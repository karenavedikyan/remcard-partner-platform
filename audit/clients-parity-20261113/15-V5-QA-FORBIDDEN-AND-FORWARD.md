# V5 — packaging vs `57ca4680` + prop-forward check

**Audited tip:** `e4ddc09813b5d06909a166a4d1190f79bf6918fb`  
**Correcting KPI commit:** `5c7db88744825e33cc68bc5210b11185f1aa5c8d` (CSS + computed tests only for cascade; also touched `vitest.config.ts` include — still forbidden churn)

## Forbidden surfaces (must remain EXACT `57ca4680`)

| File | Tip vs `57ca4680` | Verdict |
|---|---|---|
| `OwnerClientsGate.tsx` | Still manual R03/R06 rewrite; `{ children }` only | **FORBIDDEN_DELTA** |
| `OwnerClientsModeContext.tsx` | `canLink` field/hook still removed | **FORBIDDEN_DELTA** |
| `src/app/clients/page.tsx` | Still `(cabinet)/clients/page.tsx` without helper/prop | **FORBIDDEN_ROUTE_MOVE** |
| `src/lib/onboarding-step/history-link-eligibility.ts` | Still deleted | **FORBIDDEN_HELPER_TOUCH** |
| `vitest.config.ts` | Still diverged (+ computed test include) | **FORBIDDEN_CONFIG** |

KPI CSS fix does **not** restore packaging. Section delivery still **not accepted**.

## Prop-forward patch (verify only)

`ClientsListWorkspace` still cast-forwards:

```tsx
<Gate canLinkOnboardingHistory={canLinkOnboardingHistory}>
```

- Route still omits the prop
- Gate runtime still ignores it
- No further Gate/Context rewrite in `5c7db887` beyond pre-existing R5 delta

## UI vs persistence

Partner → client → back, edit/cancel, disabled save: **UI-only OK** on tip.  
**Not** server persistence acceptance. No fake successful save / CRM mapping.  
Personal meta / referred / receiving contracts remain **BLOCKED_CONTRACT / BLOCKED_PERSISTENCE**.
