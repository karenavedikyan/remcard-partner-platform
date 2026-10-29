# Отчёт: RemCard — раздел «Партнёры» (post independent review)

**Область:** Партнёры. Live-выпуск / deploy / SQL / production writes — **не выполнялись**.

## Branches / SHA

| Repo | Branch | SHA | Примечание |
| --- | --- | --- | --- |
| remcard-partner-platform | `feat/partners-prototype-v1-20261029` | `59c0f43dad9b6fa821b5719e6c4c31749df98a2b` | product tip (mandatory fixes); push **403**; prerequisite `253ff59ec0c9a32b0b00c6f544486deae2942119` |
| remcard-partner-platform (docs+bundle tip) | same | `002390e2832b6b3e05d9af9ebd62d76e308da68f` | bundle contains `ea181aab32f23c8f7429ffc4d8052d0becce86b6`; push 403 |
| remcard-navigator | `feat/partners-prototype-v1-20261029` | `0244924724cb67c3a8a79c0314a24b5053f7631e` | prior tip `c77d15e2a996c80ecc0b9cf766997ae8a2f476b3`; replay/labels P1 сохранены; docs+bundle sync |
| reference | `reference/prototype-20261029` | `4ba2f9e…` | JS source приоритетнее исторических FLOWS |

Bundle: `artifacts/partners-prototype-v1/frontend-implementation.bundle`  
- requires: `253ff59ec0c9a32b0b00c6f544486deae2942119`  
- contains HEAD: `ea181aab32f23c8f7429ffc4d8052d0becce86b6` (docs tip; repo tip after bundle blob commit `002390e2832b6b3e05d9af9ebd62d76e308da68f`)

## Closed in this pass (mandatory)

1. **Custom conditions → POST `note`:** review/share conditions (`partnerAction`/`partnerBenefit`/`ownTerms` + composition) persist via existing `note` when empty/custom path (no invented %). Published numeric terms still go in `terms[]`; note stays message-only then.
2. **Link wizard all four audiences:** modal `hub=link` always `PartnerLinkInviteWizard`; legacy dual `Wizard+Panel` removed from modal and legacy `tab=link`.
3. **Own-list canonical kind:** `resolvePublicPartnerType` → `adaptPartnerPrimaryKind` / `resolvePartnerKindUi` (COMPANY+[STORE,AGENT] → company, not agent). Shared BE search predicates **not** edited — see SHARED-CHANGE-REQUEST.
4. **Certificate error:** `applyPlan([], "error")` keeps `termsStatus=error`; no false «нет опубликованных условий»; retry on review.
5. **Discussion subject ≤500:** FE mirrors `DISCUSSION_SUBJECT_MAX` (clamp/paste/validator/counter/submit).
6. **Registered receiver URL:** `partnershipId`/`terms` → AgentPartnersHub `invitations`+`incoming`; PartnersHub reads `partnershipId` as terms deep-link.

**Preserved:** replay different payload → 409; non-agent empty label «Предложить условия»; `cooperationRequest` agent-only; `acceptPartnership` `terms_required`.

## Shared ownership / gaps

- Type agent owns `search/route.ts`, canonical helpers, FE `types.ts` — **not changed here**.
- Patch proposal: `artifacts/partners-prototype-v1/SHARED-CHANGE-REQUEST.md` (canonical search/facets predicates; types merge).
- Gates: BE type `af8959ee` ↔ partners search conflict; FE duplicate `partnerActivities` — shared owner must resolve without dropping full-set facets/pagination.

## Verification (local, mocked)

| Check | Result |
| --- | --- |
| PartnerContract independent-latest (payload/error/500) | 3 pass |
| PartnerFlow independent-latest (4 entries + partnershipId) | 5 pass |
| Partners hub/wizard/filters/discussion-subject (+ related) | 69 pass / 18 files |
| FE `tsc --noEmit` | 0 |
| BE invite + replay + search facets/query/pagination | 53 pass / 14 files |
| Real invite / notify / production | **не выполнялись** |

## Honest path note

Reference listing «Сотрудничать» still has old `directory-invite-form`; FE vitrine 3-step remains integration unification. Copy «Далее: проверить» matches current reference (not a product defect vs old «проверка» selector).
