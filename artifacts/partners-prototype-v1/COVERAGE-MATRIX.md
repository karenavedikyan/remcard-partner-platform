# Coverage matrix: прототип → компонент → API → проверка

| Прототип / сценарий | Компонент / модуль | API | Проверка | Статус |
| --- | --- | --- | --- | --- |
| Компактная строка поиска + Фильтры + list/cards | `AgentR04ListToolbar` | list client filters | `AgentR04ListToolbar.compact.test.tsx` | DONE |
| Тип / специализация / архив / сортировка | toolbar details + `AgentPartnerDiscoveryFilters` list-extra | list + prefs | unit + existing PartnersHub | DONE |
| Действующие / ожидающие / архив | `AgentPartnersHub` + `status-presentation` | `GET /api/partnership/list` | existing + helper | DONE (labels) |
| Имя → детали; actions без «глаза» | `AgentPartnerCollection` (base) | PATCH partnership | existing row-actions tests | REUSE |
| Найти: витрина + путь ремонта | `PartnerFindVitrine` + `PartnerRepairPathNav` | search + taxonomy | unit repair-path; component LOCAL FIXTURE | DONE / facets GAP |
| Счётчики этапов/направлений full set | `adaptDiscoveryFacets` | **нужны** `PartnerSearchResponse.facets` | repair-path.test | BLOCKED API |
| Этап сбрасывает направление | `stageSelectionResetsDirection` | — | repair-path.test | DONE |
| Честная недоступность этапа (count=0) | RepairPathNav disabled | facets | repair-path.test | DONE when facets |
| Приглашение 3 шага + шаблоны | `PartnerInviteWizard` | `POST /api/partnership/invite` | wizard tests (disableSubmit) | DONE |
| Взаимность vs agent one-way | `planPublishedInviteTerms` + wizard copy | invite rules | published-terms + wizard tests | DONE |
| Реальные категории / без выдуманных % | `published-terms` | search DTO (+ optional publishedTerms) | published-terms.test | PARTIAL (percents gap) |
| Idempotency финальной кнопки | wizard `idempotencyKey` | invite POST | wizard-state.test | DONE |
| Ссылка «Пригласить по ссылке» | existing link/discussion panels | link-invite / discussion-invite | regression reuse | REUSE |
| 4 типа партнёра | `partner-kind-adapter` | — | partner-kind-adapter.test | DONE |
| XSS/whitespace/1000 chars | `setInviteWizardMessage` | — | invite-wizard-state.test | DONE |
| 375/1440 light/dark | visual harness (planned) | LOCAL FIXTURE | screenshots folder | PENDING capture |
| Exact partners-redesign.js/css parity | — | reference worktree | — | BLOCKED no navigator access |

Reference SHA `4ba2f9e…` / `docs/prototype-reference/current/partner/*` — не прочитаны (repo 404).
