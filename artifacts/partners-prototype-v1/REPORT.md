# Отчёт: RemCard — раздел «Партнёры» (post independent review)

**Область:** Партнёры. Live-выпуск / deploy / SQL / production writes — **не выполнялись**.

## Branches / SHA

| Repo | Branch | SHA | Примечание |
| --- | --- | --- | --- |
| remcard-partner-platform (product) |  |  | mandatory FE fixes; push **403** |
| remcard-partner-platform (tip) | same |  | docs + incremental bundle; push **403** |
| remcard-navigator |  |  | prior product tip ; replay/labels P1 сохранены |
| reference |  |  | JS source приоритетнее исторических FLOWS |

Bundle: 
- prerequisite: 
- contains: 
- apply:  (on FE with prerequisite)

## Closed in this pass (mandatory)

1. **Custom conditions → POST :** review/share conditions (// + composition) persist via existing  when empty/custom path (no invented %). Published numeric terms still go in ; note stays message-only then.
2. **Link wizard all four audiences:** modal  always ; legacy dual  removed from modal and legacy .
3. **Own-list canonical kind:**  →  /  (COMPANY+[STORE,AGENT] → company, not agent). Shared BE search predicates **not** edited — see SHARED-CHANGE-REQUEST.
4. **Certificate error:**  keeps ; no false «нет опубликованных условий»; retry on review.
5. **Discussion subject ≤500:** FE mirrors  (clamp/paste/validator/counter/submit).
6. **Registered receiver URL:** / → AgentPartnersHub +; PartnersHub reads  as terms deep-link.

**Preserved:** replay different payload → 409; non-agent empty label «Предложить условия»;  agent-only;  .

## Shared ownership / gaps

- Type agent owns , canonical helpers, FE  — **not changed here**.
- Patch proposal:  (canonical search/facets predicates; types merge).
- Gates: BE type  ↔ partners search conflict; FE duplicate  — shared owner must resolve without dropping full-set facets/pagination.

## Verification (local, mocked)

| Check | Result |
| --- | --- |
| PartnerContract independent-latest (payload/error/500) | 3 pass |
| PartnerFlow independent-latest (4 entries + partnershipId) | 5 pass |
| Partners hub/wizard/filters/discussion-subject (+ related) | 69 pass / 18 files |
| FE  | 0 |
| BE invite + replay + search facets/query/pagination | 53 pass / 14 files |
| Real invite / notify / production | **не выполнялись** |

## Honest path note

Reference listing «Сотрудничать» still has old ; FE vitrine 3-step remains integration unification. Copy «Далее: проверить» matches current reference (not a product defect vs old «проверка» selector).
