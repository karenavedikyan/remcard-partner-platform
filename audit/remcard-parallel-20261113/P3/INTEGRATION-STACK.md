# П3 selected-file stack (Root publication assembly)

**Requires P4 detail slice on disk before typecheck/vitest.**

| Order | Source tip | Paths |
| --- | --- | --- |
| 1 | `effd85f3` @ `cursor/remcard-p4-acceptance-20261113` | `src/components/clients/observer/ObserverClientDetailView.tsx`, `ObserverPartnerDetailView.tsx` |
| 2 | P3 branch tip | `src/components/clients/observer/ObserverPartnersListView.tsx`, `ObserverPartnerCard.tsx`, `ObserverFilterChips.tsx` |
| 3 | P3 tests | `src/components/clients/observer/P3.*.test.tsx` |

**P3 list imports (direct, no fallback):**

- `ObserverClientDetailMissing`, `ObserverClientDetailView`, `ObserverClientBackFrom`
- `ObserverPartnerDetailMissing`, `ObserverPartnerDetailView`
- `observerClientBackFrom(nav, layout)` → `backFrom` prop

**Transient verify (P4 files not committed on P3 branch):**

```bash
audit/remcard-parallel-20261113/P3/verify-p3-p4-stack.sh
```

**Blockers for whole «Клиенты» section publication:** referred-appeals API (P2), personal persist, П7 CSS, П6 workspace loading — not closed by P3 alone.
