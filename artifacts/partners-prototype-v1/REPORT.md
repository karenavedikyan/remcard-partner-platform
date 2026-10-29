# Отчёт: RemCard — раздел «Партнёры» (post independent review)

**Область:** Партнёры. Live-выпуск / deploy / SQL / production writes — **не выполнялись**.

## Branches / SHA

| Repo | Branch | SHA | Примечание |
| --- | --- | --- | --- |
| remcard-partner-platform (product) | feat/partners-prototype-v1-20261029 | 59c0f43dad9b6fa821b5719e6c4c31749df98a2b | mandatory FE fixes; push 403 |
| remcard-partner-platform (tip) | feat/partners-prototype-v1-20261029 | db32d60e6e61e6258fdd4b4faaa77cf06ea830b7 | docs + bundle after product; push 403 |
| remcard-navigator | feat/partners-prototype-v1-20261029 | 91d8b9cc8d6e079075751238ed0436fe5df99342 | prior product tip c77d15e2a996c80ecc0b9cf766997ae8a2f476b3; replay/labels P1 сохранены |
| reference | reference/prototype-20261029 | 4ba2f9e… | JS source приоритетнее исторических FLOWS |

Incremental FE bundle: artifacts/partners-prototype-v1/frontend-implementation.bundle

- prerequisite: 253ff59ec0c9a32b0b00c6f544486deae2942119
- contains HEAD: 2829147c0eea33183ac5ef1a6904ba02f4ada4f1 (clean REPORT; tip after bundle blob is db32d60e6e61e6258fdd4b4faaa77cf06ea830b7)
- apply on FE clone that already has the prerequisite: git fetch frontend-implementation.bundle HEAD:feat/partners-prototype-v1-20261029

## Closed in this pass (mandatory)

1. Custom conditions to POST note: review/share conditions (partnerAction / partnerBenefit / ownTerms + composition) persist via existing note when empty/custom path (no invented percents). Published numeric terms still go in terms[]; note stays message-only then.
2. Link wizard all four audiences: modal hub=link always PartnerLinkInviteWizard; legacy dual Wizard+Panel removed from modal and legacy tab=link.
3. Own-list canonical kind: resolvePublicPartnerType to adaptPartnerPrimaryKind / resolvePartnerKindUi (COMPANY+[STORE,AGENT] to company, not agent). Shared BE search predicates not edited — see SHARED-CHANGE-REQUEST.
4. Certificate error: applyPlan([], "error") keeps termsStatus=error; no false empty published terms; retry on review.
5. Discussion subject max 500: FE mirrors DISCUSSION_SUBJECT_MAX (clamp / paste / validator / counter / submit).
6. Registered receiver URL: partnershipId / terms open AgentPartnersHub invitations+incoming; PartnersHub reads partnershipId as terms deep-link.

Preserved: replay different payload to HTTP 409; non-agent empty label «Предложить условия»; cooperationRequest agent-only; acceptPartnership terms_required.

## Shared ownership / gaps

- Type agent owns search/route.ts, canonical helpers, FE src/lib/types.ts — not changed here.
- Patch proposal: artifacts/partners-prototype-v1/SHARED-CHANGE-REQUEST.md (canonical search/facets predicates; types merge).
- Gates: BE type af8959ee vs partners search conflict; FE duplicate partnerActivities — shared owner must resolve without dropping full-set facets/pagination.

## Verification (local, mocked)

| Check | Result |
| --- | --- |
| PartnerContract independent-latest (payload/error/500) | 3 pass |
| PartnerFlow independent-latest (4 entries + partnershipId) | 5 pass |
| Partners hub/wizard/filters/discussion-subject (+ related) | 69 pass / 18 files |
| FE tsc --noEmit | 0 |
| BE invite + replay + search facets/query/pagination | 53 pass / 14 files |
| Real invite / notify / production | не выполнялись |

## Honest path note

Reference listing «Сотрудничать» still has old directory-invite-form; FE vitrine 3-step remains integration unification. Copy «Далее: проверить» matches current reference (not a product defect vs old «проверка» selector).
