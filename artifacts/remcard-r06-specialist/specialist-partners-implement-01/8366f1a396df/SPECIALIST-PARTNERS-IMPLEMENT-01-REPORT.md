# SPECIALIST-PARTNERS-IMPLEMENT-01

## Code / evidence

| | |
|---|---|
| **Branch** | `fix/r06-profile-catalog-prefill-01` |
| **Code SHA** | `8366f1a396dfdaa9836c1f980e6c0781ba7f008b` |
| **Prior (01.1)** | `4e38659beb41d79ed0f35757fe77697b72060079` |
| **BUILD_ID** | `byP2qjmgGFd4fzgtOfNAn` (`.next-r06-specialist-partners-implement-01`, runtime verified) |
| **Manifest** | `SPECIALIST-PARTNERS-IMPLEMENT-01.json` |

## 1. Изменения в интерфейсе и поведении

- Ролевые тексты специалиста/агента (`partners-shared-ui-copy`): lead, footnote, заголовки модалки «Найти партнёра» / «Пригласить партнёра».
- Модалка **«Название для себя»** вместо `window.prompt`; PATCH preferences, ошибка и повтор в UI.
- **Групповой архив/восстановление** выбранных записей (последовательные PATCH, сообщение о частичном результате).
- Поиск в hub: **«Повторить»** при ошибке в modal surface.
- MOCK BFF: invite PATCH, link-invite POST/DELETE для локальных сценариев.
- Proxy: при `REMCARD_PROXY_TRUST_LOOPBACK_ORIGIN=1` допуск origin на том же loopback-хосте с другим портом (MOCK/evidence).

Eligible gate **не менялся** (01.1).

## 2. Прототип → UI → API (MOCK)

| Сценарий | UI | API | Проверка |
|----------|----|-----|----------|
| Мои партнёры | shared `AgentPartnersHub` + list/cards | `GET /api/partnership/list` | PASS |
| Фильтры / list↔cards | `AgentR04ListToolbar`, collection | list client-side | PASS |
| Приглашения in/out | вкладки | list + segment rules | PASS |
| Найти партнёра | modal, role=pro | `GET /api/partnership/search` | PASS + visible result after retry |
| Alias | rename dialog | `PATCH .../partnership-list-preferences/{id}` | PASS patch=200, reload UI |
| Агент контроль | audience agent-r04 | search role=agent | PASS |

## 3. Переиспользование агента

Общие: `PartnersHub` (`variant="agent-r04"`), `AgentPartnerCollection`, discovery filters, hub modal, invite/link panels. Отличия — copy config и отсутствие `defaultSearchRole="agent"` у специалиста. Изменения proxy и rename/bulk затрагивают обе роли одинаково.

## 4. Остатки / NOT_RUN

| Тема | Статус |
|------|--------|
| **«Удалить из списка»** (прототип) | **Backend gap**: в navigator есть только `personalAlias` + `archivedAt` (`partnershipListPreference`). Нет поля/endpoint для персонального удаления без архива и без расторжения. Минимум: PATCH `removedAt` или явный `hidden` с GET list merge — семантика «скрыть только у себя», как архив но отдельное действие. UI не показывает кнопку. |
| Link-invite полный UX vs прототип | Backend требует поля/роли для реального invite; UI сохраняет validation. Полный MOCK POST link проверен частично (mock добавлен; отдельный UI PASS не в manifest). |
| Preferences GET отдельно от list | Alias проверен PATCH→reload list; отдельный GET-only сценарий NOT_RUN в manifest. |
| Pixel parity / расширенная visual matrix | CAPTURED subset в manifest; не заявляется 1:1. |
| STORE/COMPANY shared shell | Не подключались (как 01.1). |

Functional: **28 PASS / 0 FAIL**. Unit + `partnership-rules` tsx: PASS.
