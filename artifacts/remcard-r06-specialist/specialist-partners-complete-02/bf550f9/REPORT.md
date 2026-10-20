# SPECIALIST-PARTNERS-COMPLETE-02 — evidence (initial)

| | |
|---|---|
| Frontend code SHA | `bf550f9` (branch `fix/r06-profile-catalog-prefill-01`) |
| Backend code SHA | `c857523f` (branch `feat/specialist-partners-complete-02`, feature `d909f1e6`) |
| Prior frontend base | `4e2167599b6dd64548ddd76e7a2e5f7765e67c9e` / evidence `11c0b04` |
| Backend production base | `9a5bced4513f15a95790be7c85813b185beadd10` |

## Scenario map

| Prototype scenario | UI | API | Persisted | Verified |
|---|---|---|---|---|
| Убрать из списка | Row/bulk «Убрать из списка», confirm dialog; filter «Скрытые» | PATCH `hidden: true/false` on `/api/pro/partnership-list-preferences/[id]` | `PartnershipListPreference.hiddenAt` | Unit (navigator mock upsert); MOCK functional **pending runner**; PG integration **NOT_RUN** (no `remcard_prof_test` URL) |
| Восстановить скрытое | Filter «Скрытые» + bulk/restore | PATCH `hidden: false` | `hiddenAt=null`, alias/archive preserved | Same as above |
| Приглашение к обсуждению | Link modal tab «К обсуждению», fields name + subject | POST `/api/partnership/discussion-invite` | `PartnershipDiscussionInvite` row + token hash | MOCK POST in dev; PG **NOT_RUN** |
| Preview / join | `/invite/discussion/[token]` | GET public, POST join | `status=ACCEPTED`, `joinedByUserId` (no Partnership) | Component wired; PG **NOT_RUN** |
| Legacy link + terms | Tab «С условиями», existing panel | Unchanged link-invite API | Unchanged | Inherited from 01.1 |

## Checks run this turn

- `remcard-navigator`: vitest `partnershipListPreference.hidden`, `partnershipDiscussionInvite` limits — **PASS**
- `remcard-partner-platform`: vitest `PartnersHub.test.tsx` — **PASS**
- Isolated PG integration (`remcard_prof_test`): **NOT_RUN** — `DATABASE_URL` is `remcard_r01_test`, not prof test gate
- Full visual evidence runner / BUILD_ID: **NOT_RUN** (next iteration)

## Migration / release

See backend `docs/r06/PARTNERS-COMPLETE-02-MIGRATION-PLAN.md`. Migration file prepared; **not applied** to any DB in this task.

## Remaining product work

- Full prototype visual pass (find modal rhythm, cards, dark/320 captures) on COMPLETE-02 runner.
- Expand MOCK runner assertions for `hidden` + `discussion_invite_create`.
- Implement PG integration tests when prof test DB available.
