# Coverage matrix: прототип → компонент → API → проверка

| Прототип | Компонент / lib | API | Проверка |
| --- | --- | --- | --- |
| Компактная строка поиска/фильтров/вида | AgentR04ListToolbar | partnership/list | unit + prior harness |
| Путь ремонта vertical quest | PartnerRepairPathNav | partnership/search `facets` | unit repair-path; visual harness |
| Витрина карточки + Подробнее | PartnerFindVitrine, PartnerVitrineDetails | search + certificate-program-summary | unit wizard; component wiring |
| Шаблоны Коротко/По-деловому/По-дружески | invite-message-templates | — | exact reference text unit |
| Wizard 3 шага existing target | PartnerInviteWizard | partnership/invite (+ requestPartnerTerms) | PartnerInviteWizard.test |
| Free-name link invite | PartnerLinkInviteWizard | discussion-invite | wiring PartnersHub |
| Опубликованные условия / poolPercent | published-terms + cert program | certificate-program-summary / search publishedTerms | published-terms.test |
| Канонический тип | partner-kind-adapter → resolvePartnerKindUi | search partnerActivities | partner-kind-adapter.test |
| Facets full set | adaptDiscoveryFacets | GET search facets | backend facets test + FE adapter |
| Idempotent replay | markInviteSubmitPending + backend unique pair | invite replayed | backend request-partner-terms.test |
| Share recipient path | buildInviteShareText + created.previewPath | invite / discussion previewPath | wizard share step |
| Staff invite | не менялся | — | out of scope |

## Не выдаём за live
- Isolated component screenshots = LOCAL FIXTURE / reference static, не whole PROF auth session.
- Full 4-type integrated browser against production — запрещён; локальные unit/component + reference render.
