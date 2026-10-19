# PARTNERS-SHARED-PROTOTYPE-01 — матрица поверхностей

| Поверхность | Ref (роль) | Компонент | Общее | Различие роли | API / capability | Сейчас |
| --- | --- | --- | --- | --- | --- | --- |
| Заголовок страницы | specialist / agent | `PageHeading` + `resolvePartnersHubPresentation` | layout | eyebrow: Специалист vs АГЕНТ | r06: `featureEnabled && eligible`; r04 agent priority | ✅ 01.1 eligible gate |
| Вкладки «Мои партнёры» / «Приглашения» | all shared roles | `AgentPartnersHub` | tabs + lead | — | list segment filters client-side | ✅ specialist + agent |
| Входящие / отправленные | specialist / agent | `AgentPartnersHub` + `PartnersHub` | invitation flow | — | `/api/partnership/list` | ✅ MOCK |
| Toolbar / поиск / фильтры списка | specialist / agent | `AgentR04ListToolbar`, discovery filters | UI | default search role: agent vs `defaultSearchRoleForUser` | `/api/partnership/search` role param | ✅ |
| Список / карточки | specialist / agent | `AgentPartnerCollection` | row/card | actions via `partnership-rules` | list + preferences PATCH | ✅ prefs NOT_RUN live |
| Find / link modal | specialist / agent | `AgentPartnerHubModal` + `PartnersHub` | modal shell | search role default | search + link-invite GET | ✅ MOCK |
| Legacy tabs hub | store/company without gates | `PartnersHub` variant legacy | data layer shared internally | old tab UX | unchanged | ✅ unchanged |
| STORE/COMPANY shared r04 shell | store/company ref | — | — | org/employee actions differ | not proven same as specialist | BLOCKED |
| r04 eligible gate | agent only | `resolvePartnersHubPresentation` | — | must not set specialist r04 eligible | `/api/pro/r04/status` | ✅ |
| Employee org partners | employee ref | — | — | read-only terms | scope checks | BLOCKED (not in scope) |
