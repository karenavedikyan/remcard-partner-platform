# П2 — Контракты и сохранение Клиентов

**Роль:** read-only аудит контрактов (без product-правок).  
**База отчёта:** `9fa6cc4251780fbc20b887fcd66da1b7ecc32fa0` (ветка `cursor/remcard-p2-acceptance-20261113`).  
**Production pin (инвентарь):** `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`.  
**Прототип (ссылка команды):** `3dc31836cd18d9209c20097f18b906dd276f7af6` — объект **не** присутствует в локальном git данного репозитория; семантика UI сверена с `src/lib/clients-parity/` и матрицей `element-state-matrix.*` (источники `client-appeals.js`, `observer-personal-list.js`).

## 1. Вывод (decision summary)

| Область | Вердикт | Основание |
|--------|---------|-----------|
| Список / деталь **направленных обращений** (observer) | **КОНТРАКТ ОТСУТСТВУЕТ** в partner BFF | Нет маршрутов `referred-appeals*` в `remcard-proxy.ts`; адаптер всегда `BLOCKED_CONTRACT` |
| **Personal overlay** (alias / tag / note / archive / trash) по appeal id | **КОНТРАКТ ОТСУТСТВУЕТ** | Нет `personal-meta` / `personal-batch` в allowlist; UI явно `BLOCKED_PERSISTENCE` |
| **AgentClient CRUD** | **КОНТРАКТ ЕСТЬ** (другой домен) | Прокси + `src/lib/agent-r03/api.ts` |
| **Partnership list preferences** | **КОНТРАКТ ЕСТЬ** (другой домен) | `PATCH /api/pro/partnership-list-preferences/:id` |
| Prisma / handler бэкенда RemCard | **НЕ ДОСТУПЕН** в этом репозитории | Только BFF catch-all `src/app/api/remcard/[...path]/route.ts` |

**Итог секции observer:** целиком **BLOCKED** до появления backend-маршрутов и их включения в allowlist. **Нельзя** считать `patchAgentClient` / `batchAgentClients` заменой personal overlay.

---

## 2. Требуемый контракт (inventory, не реализация)

Источник перечня: `src/lib/clients-parity/contracts.ts` (`CLIENTS_CONTRACT_BLOCKERS`).

### 2.1 BLK-OBSERVER-REFERRED (C26–C34, C39–C41)

| Метод | Путь (proposal) | Request | Response (view-model) | Статус в репозитории |
|-------|-----------------|---------|----------------------|----------------------|
| `GET` | `/api/pro/referred-appeals` | query: фильтры TBD | `{ appeals: ObserverReferredAppeal[], partners: ObserverPartnerMeta[] }` | **ABSENT** (allowlist + client) |
| `GET` | `/api/pro/referred-appeals/:id` | — | `{ appeal: ObserverReferredAppeal, partner?: ObserverPartnerMeta }` | **ABSENT** |
| `GET` | `/api/pro/referred-appeals/by-partner/:partnerId` | — | `{ appeals: ObserverReferredAppeal[] }` | **ABSENT** |

**Фактическое поведение UI:** `fetchObserverReferredAppeals()` (`src/lib/clients-parity/fetch-observer-appeals.ts`) **никогда** не вызывает сеть — возвращает:

```ts
{ ok: false, code: "BLOCKED_CONTRACT", blockerId: "BLK-OBSERVER-REFERRED", missingRoutes: [...] }
```

`ObserverPartnersWorkspace` переводит workspace в `loadState: "blocked"` и показывает контрактный блокер.

Типы view-model: `src/lib/clients-parity/types.ts` (`ObserverReferredAppeal`, `ObserverPartnerMeta`).

### 2.2 BLK-OBSERVER-PERSONAL-PERSIST (C35–C38)

| Метод | Путь (proposal) | Request body (proposal) | Response (proposal) | Статус |
|-------|-----------------|-------------------------|---------------------|--------|
| `PATCH` | `/api/pro/referred-appeals/:id/personal-meta` | `{ alias?: string, tag?: string, note?: string, bucket?: "active" \| "archived" \| "trash" }` | `{ appealId, meta: ObserverPersonalMeta }` | **ABSENT** |
| `POST` | `/api/pro/referred-appeals/personal-batch` | `{ ids: string[], tag?: string, bucket?: ObserverPersonalBucket, action?: "archive" \| "trash" \| "restore" }` | `{ updated: string[], meta: Record<string, ObserverPersonalMeta> }` | **ABSENT** |

**Фактическое поведение UI:**

- `ObserverPartnersListView`: `personalMeta = displayPersonalMeta` (prop, по умолчанию `{}`); **нет** `useState` / fetch / localStorage для meta.
- Save: кнопка `disabled` + `title="BLOCKED_PERSISTENCE"` (`ObserverPersonalEditPanel.tsx`).
- Confirm archive/trash/restore: `notifyPersistenceBlock()` — toast `BLOCKED_PERSISTENCE`, **без** изменения данных.

Прототипная семантика overlay: поля `ObserverPersonalMeta` в `types.ts`; фильтрация по bucket в `filter-observer.ts`.

---

## 3. Существующие контракты, которые **не** покрывают observer

### 3.1 AgentClient (агентский CRM «свои клиенты»)

**Allowlist:** `GET|POST /api/pro/agent-clients`, `POST /api/pro/agent-clients/batch`, `GET|PATCH|DELETE /api/pro/agent-clients/:id` (`src/lib/remcard-proxy.ts`).

**Client:** `src/lib/agent-r03/api.ts`

| Операция | Метод | Путь | Тело / query (из client) |
|----------|-------|------|---------------------------|
| List | `GET` | `/api/pro/agent-clients` | `?archived=&q=&cursor=&page=&limit=&sort=` |
| Create | `POST` | `/api/pro/agent-clients` | `{ displayName, phone?, email?, city?, need?, note? }` |
| Read | `GET` | `/api/pro/agent-clients/:id` | — |
| Patch | `PATCH` | `/api/pro/agent-clients/:id` | `displayName`, контакты, `note`, `need`, или `{ action: "archive" \| "restore" }` |
| Delete | `DELETE` | `/api/pro/agent-clients/:id` | — |
| Batch | `POST` | `/api/pro/agent-clients/batch` | `{ action: "archive" \| "restore" \| "delete", ids: string[] }` |

**Модель:** `AgentClientRow` — глобальная запись агента (`displayName`, `archivedAt`, …), **не** привязана к `receivingPartnerId` / referred appeal id.

**Расхождение с observer personal:**

| | AgentClient | Observer personal overlay |
|--|-------------|---------------------------|
| Ключ сущности | `agentClient.id` | `referredAppeal.id` (направленное обращение) |
| Alias | `displayName` (CRM) | `alias` (только для себя, имя у партнёра не меняется) |
| Archive/trash | `archivedAt` / delete CRM | `bucket` per appeal в личном слое |
| Scope | Владелец CRM | Наблюдатель (referrer), без accepting CRM |

### 3.2 Partnership list preferences (партнёры в витрине)

`PATCH /api/pro/partnership-list-preferences/:partnershipId` — `personalAlias`, `archived`, `hidden` (`src/lib/agent-r04/api.ts`).  
Сущность — **partnership**, не referred client appeal.

### 3.3 Order receiving-client (связь покупки)

`PATCH /api/store/orders/:orderId/receiving-client` (`src/lib/history-receiving-client-api.ts`) — link/unlink `agentClientId` к заказу; не список observer appeals.

---

## 4. BFF / schema call sites

| Слой | Файл | Observer referred | Personal persist |
|------|------|-------------------|------------------|
| Allowlist | `src/lib/remcard-proxy.ts` | Нет паттернов | Нет паттернов |
| BFF entry | `src/app/api/remcard/[...path]/route.ts` | Проксирует только allowlist | — |
| Load adapter | `fetch-observer-appeals.ts` | Stub BLOCKED | — |
| UI workspace | `ObserverPartnersWorkspace.tsx` | Вызывает stub | — |
| UI list | `ObserverPartnersListView.tsx` | Read-only appeals prop | `displayPersonalMeta` only |
| Inventory | `contracts.ts` | Документировано | Документировано |

**Prisma / server handlers:** в репозитории **нет** `prisma/schema.prisma`; подтверждение persistence на стороне origin API **вне области** данного аудита (UNCONFIRMED backend).

---

## 5. Минимальные contract decisions (для backend/BFF owners)

1. **Ввести отдельный ресурс** `referred-appeals` (или эквивалент с явной спецификацией), scoped к referrer / observer, **не** переиспользуя `AgentClient` id без mapping.
2. **Personal meta** — отдельная подресурсная модель на `appealId` + `observerUserId` (или эквивалент), поля `alias`, `tag`, `note`, `bucket`; batch endpoint для tag/bucket операций.
3. **После** появления origin routes — **обязательно** добавить паттерны в `remcard-proxy.ts` и реализовать `fetchObserverReferredAppeals` с реальным `remcardFetch` (сейчас stub).
4. **Запрет** на подмену: `PATCH agent-clients` не удовлетворяет C35–C38 и не загружает C26–C34.

`patch-manifest-57ca4680.json` явно запрещает ложные claims: `fetchObserverReferredAppeals ok:true`, persistence C35–C37.

---

## 6. Требования: PASS / FAIL / BLOCKED

| ID | Требование | Вердикт |
|----|------------|---------|
| BLK-OBSERVER-REFERRED | API list/detail referred appeals | **FAIL** (контракт absent, stub подтверждён) |
| BLK-OBSERVER-PERSONAL-PERSIST | API personal-meta + reload persistence | **FAIL** (контракт absent; UI honest block) |
| C26–C34, C39–C41 | Данные observer из API | **BLOCKED** → зависит от BLK-OBSERVER-REFERRED |
| C35–C38 | Save / bulk / archive / trash persistence | **BLOCKED** → зависит от BLK-OBSERVER-PERSONAL-PERSIST |
| Equivalence AgentClient ≠ overlay | Аудит семантики | **PASS** (разведены в коде и в этом отчёте) |
| Backend schema proof | Prisma/handlers | **BLOCKED** (repo scope) |

---

## 7. Оставшаяся работа и зависимости

| Owner | Задача |
|-------|--------|
| Backend (вне repo) | Спецификация и реализация `referred-appeals` + `personal-meta` |
| BFF / proxy owner | Allowlist + типизированный client adapter вместо `fetch-observer-appeals` stub |
| Product UI (observer) | Wire fetch/save после контракта (файлы `src/components/clients/observer/*`, `fetch-observer-appeals.ts`) |
| П2 | Только повторный read-only аудит после появления маршрутов |

---

## 8. Сверка с handoff

- `author-handoff-v6.json` / `contracts.ts` — согласованы с данным аудитом.
- Устаревший claim `fetchObserverReferredAppeals production ok:true` в `patch-manifest` — **FORBIDDEN** (`persistenceClaimsForbidden`).

---

## 9. Тесты (фактически выполненные)

| Тест | Результат | Лог |
|------|-----------|-----|
| `audit/.../P2.proxy-allowlist-audit.mjs` | **PASS** (exit 2 = ожидаемые gaps зафиксированы) | `test-log.txt` |
| `src/lib/clients-parity/contracts.test.ts` (vitest) | **BLOCKED** | Нет `node_modules` в среде |
| Browser E2E observer API | **BLOCKED** | Нет mock egress + нет контракта |

Статический обзор: `contracts.test.ts` логически **PASS** при наличии deps (3 assertions на blockers + blocked fetch).
