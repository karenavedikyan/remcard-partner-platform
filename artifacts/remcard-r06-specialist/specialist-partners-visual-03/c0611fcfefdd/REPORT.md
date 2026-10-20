# SPECIALIST-PARTNERS-VISUAL-03

| | |
|--|--|
| Frontend code SHA (UI) | `5d02690ccacb` |
| Frontend evidence tip | `c0611fcfefdd` (+ evidence commits on branch) |
| Backend SHA (unchanged) | `7ad879731534ded81ba0603975dfac79f4de7798` |
| BUILD_ID (MOCK evidence run, `.next-r06-visual-03`) | `9eBmvDmCczByGaRvZPxux` |
| BUILD_ID (`npm run build` on branch tip) | `72qxC7NOQXO10P4_HrSlI` |
| Ref pins | `7818ba6ebd68` (+ live prototype for refine ref on re-run) |

## Checks

| Check | Result |
|-------|--------|
| `npm run build` | PASS |
| `partners-hub-presentation.test.ts` | 9/9 PASS |
| PG integration | NOT_RUN (unchanged) |
| Agent shared list/find smoke | `impl-agent-*-smoke.png`, `AGENT-SMOKE.json` |

## Visual parity table (reviewed impl vs ref / prototype)

| # | Area | Changed | Fresh pair | Remainder |
|---|------|---------|------------|-----------|
| 1 | Full-width tabs / header / close | `AgentPartnerHubModal.module.css`: tabs grid 1fr 1fr, header padding, 40×40 bordered close (focus-visible kept) | `ref-specialist-find-1440-light.png` ↔ `impl-specialist-find-1440-light.png` | Global app shell (sidebar, breadcrumbs, persona chrome) not in parity scope; tab label copy matches product strings, not every prototype sentence |
| 2 | Search field / helpers / refine | `PartnersHub.tsx` + `.module.css`: full-width keyword field, helper stack, «Найти» on own row (right-aligned); `AgentPartnerDiscoveryFilters` summary «Уточнить: город и тип партнёра» + bordered disclosure | `impl-specialist-find-refine-1440-light.png` (ref re-capture on next evidence run uses open prototype state) | **Explicit «Найти» button** required by current search handler — not removed; field no longer squeezed. Intro/helper text follows approved product copy where it differs from static prototype PNG. MOCK shows 1 demo hit vs 7 in ref — not a layout defect |
| 3 | Toolbar / select-page | `AgentR04ListToolbar`: visible «Поиск» / «Показывать» labels, «Ещё фильтры…» link styling, selection hint; count still `visiblePartnerships.length` | `ref-specialist-list-1440-light.png` ↔ `impl-specialist-list-1440-light.png` | Specialist page shows attention banner + single MOCK row vs ref’s two demo partners; «Найдено» count reflects filtered list (1), not server bucket |
| 4 | Rows / actions / cards | `AgentPartnerCollection`: «Выбрать страницу (N)» row, footer/pagination grid, shared list/card rhythm | `impl-specialist-cards-1440-light.png`, list 1440/375 | Status labels stay semantic (`Активно` vs ref «Условия согласованы» where meanings differ). Eye/hide only when handler exists. Row action set depends on MOCK permissions |
| 5 | Pagination | Footer: «На странице» + size select, «Страница X из Y», «Назад»/«Далее» alignment in `.module.css` — logic unchanged | Same list 1440 pair | Disabled buttons on single page match ref behavior |

## Captures (MOCK specialist)

- 1440 light: list, cards, find (after search), find refine open
- 375 light: list, find
- 375 dark: find
- 320 smoke: list + find modal (overflow control, no ref)

Agent: `impl-agent-list-1440-light-smoke.png`, `impl-agent-find-1440-light-smoke.png`.

**Note:** Pairs are CAPTURED and visually compared in-session; not claimed as pixel-perfect 1:1 where called out above.
