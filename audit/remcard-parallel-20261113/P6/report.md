# П6 — Роли и принимающая сторона

## Идентификация

| Поле | Значение |
|------|----------|
| **Base (candidate)** | `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` |
| **Branch** | `cursor/remcard-p6-acceptance-20261113` |
| **Commit** | _(после push — см. вывод git)_ |
| **Prototype SHA** | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| **Production pin (read-only)** | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |

## Изменённые product-файлы (allowlist)

- `src/components/clients/direction/ClientsDirectionTabs.tsx` — `aria-controls`, id вкладок
- `src/components/clients/direction/ClientsDirectionWorkspace.tsx` — `tabpanel`, условный монтаж панелей (без преждевременной загрузки observer)
- `src/components/clients/direction/ReceivingAppealsBlocked.tsx` — переиспользование `ObserverContractBlocked`, отдельный `data-testid`
- `src/components/clients/observer/ObserverContractBlocked.tsx` — опциональные `testId` / `titleId` для различения receiving vs observer

## Новые тесты

- `src/components/clients/direction/P6.ClientsDirectionWorkspace.test.tsx`
- `src/components/clients/direction/P6.ClientsDirectionTabs.test.tsx`
- `src/components/clients/direction/P6.ReceivingAppealsBlocked.test.tsx`
- `src/components/clients/observer/P6.ObserverContractBlocked.test.tsx`

**Лог:** `audit/remcard-parallel-20261113/P6/vitest-p6.log` — **9/9 PASS**

## Аудит композиции роль → режим

| Требование | Статус | Доказательство |
|------------|--------|----------------|
| Агент: только observer, без вкладок направлений и без принимающего CRM | **PASS** | `P6.ClientsDirectionWorkspace` agent case; `OwnerClientsGate` → `accessMode="agent"` (read-only) |
| Агент: не путать с AgentClientsList / личным CRM | **PASS** | Нет `clients-page-add`; маршрут минует `ClientsDirectionTabs` |
| Специалист/бизнес: вкладки «Клиенты у меня» / «Мои клиенты у партнёров» | **PASS** | `ClientsDirectionTabs` + `page-matrix` p.79/88/97 |
| Вкладка «Клиенты у меня»: честный BLOCKED `BLK-RECEIVING-APPEALS`, не фейковый список | **PASS** | `ReceivingAppealsBlocked` → inventory из `contracts.ts` |
| Вкладка «Мои клиенты у партнёров»: observer shell + `BLK-OBSERVER-REFERRED` | **PASS** | Переключение вкладки в тесте; `fetch-observer-appeals.ts` (read-only) |
| Различие blocked receiving vs blocked observer в UI | **PASS** | `ca-receiving-appeals-blocked` vs `clients-parity-contract-blocked` |
| Переходы вкладок (tab → tabpanel) | **PASS** | userEvent + `role="tabpanel"` |
| Gate loading / error / empty (нет роли) | **BLOCKED (browser)** | `OwnerClientsGate.tsx` — read-only; component tests не покрывают сетевые сценарии |
| Пустой список / ready observer data | **BLOCKED** | Нет подтверждённого API `referred-appeals`; адаптер всегда `ok: false` |
| Employee / иные роли в page-matrix | **EXCLUDED** | `OwnerClientsGate` не выдаёт employee mode (`page-matrix` p.115) |
| Принимающий CRM C07–C24 | **BLOCKED** | Целый раздел за `BLK-RECEIVING-APPEALS` |
| Наблюдатель C26–C41 persistence/API | **BLOCKED** | Команда: whole section BLOCKED; личный overlay ≠ AgentClient CRUD |
| C02, C03, C06 (matrix) | **IN_PROGRESS → PASS (composition only)** | Композиция ролей подтверждена тестами; общая приёмка секции **не заявлена** |

## Cross-owner зависимости (не редактировались)

| Владелец | Файл / зона | Зависимость |
|----------|-------------|-------------|
| Gate | `OwnerClientsGate.tsx`, `OwnerClientsModeContext.tsx` | Резолв `agent` \| `specialist` \| `business` |
| Observer UI | `ObserverPartnersListView.tsx` | При `dataContract.blocked` фильтры/чипы остаются видимыми под блокером — честность empty/error требует правки вне allowlist П6 |
| Adapter | `fetch-observer-appeals.ts` | Всегда BLOCKED до production API |
| Contracts | `contracts.ts`, `acceptance-matrix.ts` | Источник id маршрутов |
| Shell | `ClientsListWorkspace.tsx` | Заголовки по роли |
| QA | Скриншоты C45–C48, overflow C49 | Не в scope П6 |

## Оставшаяся работа

1. Подтвердить server contract `referred-appeals` и `client-appeals` — до этого принимающий и observer data остаются BLOCKED.
2. После API: заменить blockers на реальные workspace, не localStorage.
3. Убрать или скрыть интерактивные observer-фильтры при `dataContract.status === "blocked"` — **ObserverPartnersListView** (другой агент).
4. E2E: gate error/retry и «раздел недоступен» — mocked fetch only.

## Browser QA

**BLOCKED** — мутации и production egress запрещены; покрытие component/vitest только.
