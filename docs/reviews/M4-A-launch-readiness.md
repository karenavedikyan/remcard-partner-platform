# M4-A: аудит готовности RemCard PROF к запуску

Дата: 6 октября 2026.  
**Тип работ:** read-only аудит + документация. Код, schema и миграции **не менялись**.

## Контрольные точки

| Репозиторий | Ветка / SHA | PR |
| --- | --- | --- |
| `remcard-partner-platform` M3-C (base аудита) | `cursor/m3c-history-b3e3` → `e88f80b22598e5a69b3da1ff2e070d47a05ae4d6` | Draft **#5** |
| PR #1 M1 | `cursor/m1-foundation-aa2d` → `e8f7e91e` | #1 → `main` |
| PR #2 M2 | `cursor/m2-prof-partners-b3e3` → `0f1fa2c5` | #2 → M1 |
| PR #3 M3-A | `cursor/m3a-certificates-b3e3` → `0960f776` | #3 → M2 |
| PR #4 M3-B | `cursor/m3b-scanner-b3e3` → `ecc2fbd4` | #4 → M3-A |
| PR #5 M3-C | `e88f80b` | #5 → M3-B |
| `remcard-navigator` (read-only) | `main` → `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | — |

**Границы проверки:** loopback `:3000` → `:3001` с fixture JWT и синтетическими данными (M3-C A/B/C). Реальный бот, production webhook, OAuth round-trip и камера **не проверялись**. Staging navigator с `REMCARD_DEPLOYMENT=staging` блокирует webhooks (503).

---

## Вердикт

**К запуску на pro.remcard.ru не готов.** Функциональный каркас M1–M3-C согласован и протестирован на fixture-сессии, но до безопасного production-запуска остаются **обязательные блокеры**: вход/регистрация через бота в кабинете, серверная идемпотентность покупки, минимальные доработки history API для магазина и сотрудников. Архитектура «один backend, один учёт пользователей и финансов» — **корректна** и не требует переписывания.

**Объём до запуска (качественно):** 4 блокера — **средний** каждый; интеграция входа — **средний**; порядок слияния PR — **небольшой**; infra/DNS — **небольшой** (настройка, не разработка).

---

## 1. Каркас и цепочка PR

### Совместимость M1 → M2 → M3-A → M3-B → M3-C

Stacked PR (#1→#5) построен последовательно: каждый этап расширяет BFF allowlist, UI и тесты без конфликтов merge-base.

| Этап | Тесты `test:proxy` | Lint (HEAD ветки) | Build (`NODE_ENV=production`) |
| --- | --- | --- | --- |
| M1 `e8f7e91` | 23/23 | — | не перепроверялся в M4-A |
| M2 `0f1fa2c5` | 47/47 | — | — |
| M3-A `0960f776` | 68/68 | — | — |
| M3-B `ecc2fbd4` | 99/99 | — | — |
| M3-C `e88f80b` | **118/118** | **PASS** | **PASS** |

**BFF и env (M3-C):**

- Прокси: `/api/remcard/*` → `REMCARD_API_BASE_URL`; allowlist method+path; mutating — `Origin === NEXT_PUBLIC_APP_URL`; cookie upstream — только `remcard-token`.
- Обязательные env кабинета: `NEXT_PUBLIC_APP_URL`, `REMCARD_API_BASE_URL`; опционально `REMCARD_API_BASIC_*` для staging Basic Auth.
- Navigator env: `JWT_SECRET`, `DATABASE_URL` — общая сессия; без совпадения `JWT_SECRET` fixture/реальная сессия не работает.

### Порядок будущего слияния (сохранить все изменения)

1. **#1** `cursor/m1-foundation-aa2d` → `main`
2. **#2** → обновить base на `main`, merge
3. **#3** → base после M2, merge
4. **#4** → base после M3-A, merge
5. **#5** → base после M3-B, merge

После каждого merge: rebase следующего PR на новый base **до** merge следующего. Альтернатива — squash-merge всей цепочки одним PR после финального rebase на `main` (риск: потеря поэтапной истории review).

**Критерий:** `main` содержит все маршруты из `remcard-proxy.ts` M3-C; `npm run test:proxy` на `main` ≥ 118 PASS.

### Публичный репозиторий (секреты и данные)

| Проверка | Результат |
| --- | --- |
| `.env`, `.env.local` в git | **Не tracked** (`.gitignore`: `.env.*`, кроме `.env.example`) |
| Секреты в tracked файлах | **Не обнаружены** (только placeholders в `.env.example`, тестовые строки в `remcard-proxy.test.ts`) |
| SQL dumps / production data | **Не tracked** (`*.sql` в gitignore; seed — `*.sql.example` с синтетическими id) |
| Приватный код navigator | **Не скопирован** (только ссылки на пути и read-only SHA) |
| PII в seed | Только синтетические имена («M1 Магазин», «M1 Мастер PROF») |

**Замечание:** локальный `.env.local` на VM агента может содержать credentials — не коммитить, не публиковать.

---

## 2. Вход и регистрация

Владелец отложил подключение входа. Минимальный путь — **переиспользование bot verify-code** основного сайта (не обязательно VK/Yandex OAuth).

### Действующий поток на remcard.ru (navigator)

```text
UI (LoginModal) → согласия PERSONAL_DATA + TERMS (клиент)
→ Telegram/MAX /login → BotLoginCode (6 цифр, TTL 10 мин)
→ POST /api/auth/verify-code { code }
→ Set-Cookie remcard-token (httpOnly, 30d)
→ GET /api/auth/me
→ (новый пользователь) /pro/setup + POST /api/account/consent PUBLIC_OFFER_PRO
→ PATCH /api/pro/profile → role PRO
```

**Ключевые файлы navigator:**  
`src/lib/bots/commands.ts`, `src/app/api/telegram/webhook/route.ts`, `src/app/api/auth/verify-code/route.ts`, `src/app/api/account/consent/route.ts`, `src/app/api/pro/profile/route.ts`, `src/components/auth/LoginModal.tsx`.

### Состояние partner-platform (M3-C)

| Компонент | Статус |
| --- | --- |
| BFF `POST /api/auth/verify-code` | Allowlisted, transport-тесты PASS |
| BFF `GET /api/auth/me`, `POST /api/auth/logout` | Allowlisted |
| UI входа | **Отсутствует** — `SessionGate` + fixture JWT (`docs/local-dev/README.md`) |
| BFF `POST /api/account/consent` | **Не в allowlist** — PRO-регистрация через кабинет невозможна |
| BFF `PATCH /api/auth/me` | **Не в allowlist** |
| Role gate | `role !== PRO` → блок всех экранов |
| OAuth VK/Yandex | Не в allowlist; temp cookies не проксируются |

### Пробелы для production-входа через бота

1. **UI:** адаптировать `LoginModal` (код + чекбоксы + deep link в бота).
2. **BFF allowlist:** `POST /api/account/consent`; при необходимости `PATCH /api/auth/me`.
3. **Navigator (минимально):** verify-code **не сохраняет** consents из body — нужна запись `recordConsentsForNewUser` (сейчас только OAuth paths).
4. **PRO onboarding:** либо экран `/pro/setup` в кабинете (profile PATCH уже allowlisted), либо redirect на remcard.ru/setup до первого входа в кабинет.
5. **Cookie domain:** сессия на `pro.remcard.ru` через BFF Set-Cookie — **отдельная** от remcard.ru (by design).

### Staging / webhook ограничения

При `REMCARD_DEPLOYMENT=staging` (`src/middleware.ts`):

- Webhooks `/api/telegram/webhook`, `/api/max/webhook`, OAuth callbacks → **503**
- Site-wide Basic Auth

**Следствие:** E2E bot login на staging **невозможен** без снятия isolation или теста против production backend с webhook. Mock/fixture **не доказывают** реальный вход.

### Новый партнёр (не fixture)

| Шаг | Где сегодня | Кабинет M3-C |
| --- | --- | --- |
| Bot /login → User (CLIENT) | navigator | N/A |
| verify-code → session | navigator + BFF transport | **Нет UI** |
| PUBLIC_OFFER_PRO consent | remcard.ru | **BFF blocked** |
| PRO profile onboarding | remcard.ru `/pro/setup` | PATCH profile allowlisted, consent — нет |
| Catalog moderation | navigator admin | вне scope кабинета |

### Что потребуется от владельца (без секретов в чате)

| Настройка | Назначение |
| --- | --- |
| `JWT_SECRET` (общий navigator ↔ prod backend) | Валидация `remcard-token` |
| `NEXT_PUBLIC_APP_URL=https://pro.remcard.ru` | Origin check BFF |
| `REMCARD_API_BASE_URL` | Upstream (production или dedicated staging **без** webhook block) |
| Telegram bot webhook → navigator `/api/telegram/webhook` | Выдача кодов (production path; relay `telegram-gateway.remcard.ru`) |
| `PLATFORM_INN/OGRN/NAME` + seed legal docs | Audit trail consents |
| Решение: onboarding в кабинете vs redirect на remcard.ru | UX нового PROF |

**OAuth VK/Yandex — не обязателен** при выборе bot verify-code.

---

## 3. Защита покупки от дублей

### Текущее поведение (`POST /api/store/order`)

**Файл:** `remcard-navigator/src/app/api/store/order/route.ts`

| Аспект | Факт |
| --- | --- |
| Idempotency-Key | **Отсутствует** |
| Транзакция | Order + items + cert increment + Bonus/AgentBonus — **внутри** `$transaction` |
| maxUsages | Pre-check **вне** tx; increment **без** conditional WHERE → race при параллельных POST |
| nextStatus cert | Вычисляется из stale `usageCount` до tx |
| Уведомление бота | После commit, без dedup |
| UI | `submitting` блокирует кнопку — **не серверная защита** |

**Клиент (M3-B):** uncertain state при 5xx/битом 201; **не** повторяет POST автоматически — но пользователь/вторая вкладка может.

### Минимальная серверная идемпотентность (предложение, без реализации)

**Объём: средний** (navigator: таблица + handler; partner-platform: header в scanner submit).

1. **Header:** `Idempotency-Key: <uuid>` обязателен на POST order.
2. **Таблица** `StoreOrderIdempotency`: unique `(storeUserId, idempotencyKey)`, fingerprint тела (cert + sorted items).
3. **Внутри tx:**
   - lookup key → replay order / 409 при mismatch fingerprint
   - conditional `Certificate` update: `usageCount < maxUsages OR maxUsages=0`
   - create Order + Bonus; insert idempotency row
4. **Parallel same key:** unique violation → re-read → replay.
5. **Новая покупка по тому же документу:** новый key; лимит только conditional cert update.
6. **Notify:** только при first insert.

**Критерии приёмки:** см. таблицу блокеров ниже.

**Прецедент в codebase:** `BotUpdate` (`@@unique([provider, externalUpdateId])`) — `prisma/schema.prisma`.

---

## 4. История и права

### Текущее состояние (M3-C `e88f80b`)

Клиент корректен: связь purchase↔accrual **только** `bonusId === accrual.id`; promoCode — только поиск/фильтр; не unique ID.

### Gaps navigator API

| Gap | Route | Launch-critical? |
| --- | --- | --- |
| **G1** bonus-list без `orderId` | `GET /api/store/bonus-list` | **Да** — store scanner deep link `/history/purchases/{orderId}` → not-found |
| **G2** pro/orders без `bonusId` | `GET /api/pro/orders` | V1 допустимо (fallback «по документу») |
| **G3** AgentBonus не в bonus-list/store wallet | bonus-list, wallet/transactions | **Да**, если agent-сертификаты в production |
| **G4** self-scan / zero-bonus не в bonus-list | bonus-list | V1 допустимо (UI предупреждает) |
| **G5** staff scan: `storeUserId = staff.id`, owner bonus-list miss | order route L180 | **Да** для org со staff |
| **G6** preview: `storeUserId === user.id` only | preview L52 vs order L94–108 | **Да** — staff не может preview |
| **G7** нет GET by id | — | V1 допустимо при G1+G5 |
| **G8** cap 200, client filters | pro/orders | V1 допустимо |
| **G9** issued без line items | pro/orders | V1 допустимо |

### Минимальные API-дополнения для безопасного запуска

**Объём: небольшой–средний** (navigator only, 3–5 точечных правок):

1. `bonus-list`: добавить `orderId` в каждый bonus row.
2. `order/preview`: parity с order route для branch staff (`acceptableStoreUserIds`).
3. `order` + history filters: нормализовать `storeUserId` на owner **или** расширить bonus-list/wallet filter на org.
4. (Если agents live) AgentBonus в store-facing lists **или** явный scope-out agents в V1.
5. (Отдельно, launch-critical) Idempotency — см. §3.

### Права (проверено кодом + M3-C fixture)

| Actor | Scanner | History accepted | History issued | Утечки |
| --- | --- | --- | --- | --- |
| Store owner | OK | bonus-list | pro/orders if issuer | — |
| Branch staff | preview **broken** | owner miss (G5) | filtered pro/orders | foreign cert → 400 |
| MASTER PROF | N/A | 403 (expected) | pro/orders | — |
| Foreign PRO | 400 partner | no access | own certs only | **PASS** (unit + curl) |

---

## 5. База, окружение, развёртывание

### Baseline / FK (из M1 diagnosis, актуально)

| Проблема | Доказательство |
| --- | --- |
| `migrate deploy` на пустой PG | Падает: `relation "User" does not exist` (нет init migration) |
| `db push` на пустой PG | FK `BranchService.serviceId` text vs `Service.id` uuid |
| Patched bootstrap (FK skipped) | Только loopback test; **не** production baseline |

**Файл:** `docs/reviews/M1-schema-bootstrap-diagnosis.md`. Исправление — **отдельная задача private navigator** (объём: **крупный** если squash 96 migrations).

### Минимальный безопасный тест

1. **Не** пересоздавать production DB.
2. Loopback: patched bootstrap + `scripts/local/seed-*.sql.example` + fixture JWT.
3. Pre-launch: smoke на **staging-копии** schema (не blind baseline на prod).
4. Partner-platform CI: `test:proxy` + `NODE_ENV=production build`.

### Целевая архитектура

```text
pro.remcard.ru (partner-platform, Next.js BFF)
    → HTTPS → remcard.ru API (navigator, единая PostgreSQL)
    → User / Order / Bonus / Partnership — один источник истины
```

Дублирования пользователей и финансового учёта **нет**. Прототип `pro.remcard.ru` (static demo) — **не** backend; при запуске заменяется или coexists с redirect (решение владельца).

### Порядок запуска pro.remcard.ru (без выполнения в M4-A)

| Фаза | Действие | Откат |
| --- | --- | --- |
| 0 | Merge PR #1–#5 → `main`; tag pre-release | Revert merge commit |
| 1 | Deploy partner-platform на pro.remcard.ru (preview/staging slot) | Previous deploy slot |
| 2 | Env: `NEXT_PUBLIC_APP_URL`, `REMCARD_API_BASE_URL`, Basic Auth if needed | — |
| 3 | Smoke: BFF `/api/remcard/api/auth/me` 401; allowlisted GET с fixture | — |
| 4 | Enable bot login UI + consent allowlist (M4-B) | Feature flag / hide login |
| 5 | Idempotency on order (navigator deploy) | Disable header requirement |
| 6 | History API patches (navigator) | UI limitation notes remain |
| 7 | DNS cutover / traffic to new app | DNS → static prototype или maintenance page |
| 8 | Monitor: duplicate orders, 403 origin, cookie issues | Rollback deploy + DNS |

**Cookies / origin / HTTPS:**

- Mutating BFF: `Origin` must match `NEXT_PUBLIC_APP_URL` exactly (HTTPS in prod).
- `remcard-token`: Secure flag in production (navigator `createToken`).
- Cross-origin: cabinet cookie **не** видна remcard.ru и наоборot.

**Защита прототипа:** до cutover сохранить static demo на отдельном path или subdomain; не удалять до приёмки нового кабинета.

---

## 6. Сквозная матрица приёмки

Legend: **PASS** = подтверждено ранее на fixture/loopback; **AUDIT** = проверено кодом в M4-A; **NOT VERIFIED** = не проверено / нужен real bot+camera+prod.

### Магазин (STORE owner)

| Шаг | Статус | Примечание |
| --- | --- | --- |
| Регистрация/вход | **NOT VERIFIED** | SessionGate; bot flow AUDIT only |
| Профиль | **PASS** (M2) | fixture |
| Партнёрство | **PASS** (M2) | fixture |
| Согласование условий | **PASS** (M2 + M3-C C) | term-change immutability |
| Рекомендация | **PASS** (M3-A) | fixture |
| Ссылка/PDF | **PASS** (M3-A) | public cert API |
| Сканирование | **PASS** (M3-B) | manual code; **NOT VERIFIED** camera |
| Покупка | **PASS** (M3-B/C) | fixture POST; idempotency **AUDIT gap** |
| История | **PASS** (M3-C) | accepted + issued; orderId deep link **ограничение API** |

### PROF issuer (MASTER)

| Шаг | Статус |
| --- | --- |
| Вход | NOT VERIFIED |
| Профиль / партнёрство / terms | PASS (M2) |
| Рекомендация / PDF | PASS (M3-A) |
| Сканирование чужого cert | PASS (negative, M3-B) |
| Покупка у партнёра | N/A (issuer scans at store) |
| История issued + accruals | PASS (M3-C) |

### Сотрудник филиала (BRANCH_EMPLOYEE)

| Шаг | Статус |
| --- | --- |
| Вход | NOT VERIFIED |
| Сканирование preview | **NOT VERIFIED** — G6 AUDIT: preview 403 expected |
| Покупка | **AUDIT**: order route allows; preview broken |
| История owner view | **AUDIT gap** G5 |

### Посторонний PRO

| Шаг | Статус |
| --- | --- |
| Чужой cert scan/order | PASS (M3-B, 400) |
| Чужая история | PASS (server filters, M3-C) |
| term-change чужого partnership | PASS (M2, 404) |

---

## Таблица блокеров

| # | Блокер | Доказательство | Минимальное исправление | Репозиторий | Критерий приёмки | Объём |
| --- | --- | --- | --- | --- | --- | --- |
| **B1** | Нет входа/регистрации в кабинете | `SessionGate` на всех routes; нет LoginModal | UI bot login + allowlist consent (+ fix verify-code consents upstream) | partner-platform + navigator | Новый user: bot → code → session на pro.remcard.ru → PRO onboarding → dashboard | **Средний** |
| **B2** | Нет server idempotency order | `order/route.ts` no key; maxUsages race | `StoreOrderIdempotency` + conditional cert update + client header | navigator (+ scanner header) | Retry/parallel same key → 1 order; mismatch → 409; lost response → replay | **Средний** |
| **B3** | Store history by orderId | bonus-list без orderId; M3-C A test | Add `orderId` to bonus-list response | navigator | Store `/history/purchases/{orderId}` opens accepted purchase | **Небольшой** |
| **B4** | Branch staff scanner/history | preview L52 vs order L94–108; storeUserId staff | Preview parity + owner-visible orders | navigator | Staff: preview OK → order → owner sees in history | **Небольшой–средний** |
| **B5** | Schema bootstrap для новых env | M1 diagnosis | Baseline migration / FK fix in private repo | navigator | `migrate deploy` on empty PG passes | **Крупный** (не блокер prod DB уже live) |

---

## Допустимые ограничения V1

- Self-scan и покупки без Bonus отсутствуют в «Принято у меня» — с явными UI notes (M3-C).
- Issued-order ↔ accrual без ID-link — «Все операции по документу» по promo (не как unique ID).
- Client-side filters, cap 200 orders — hub note.
- Issued detail без line items — explicit empty state.
- OAuth VK/Yandex — не в V1 при bot login.
- Выплаты, CRM, аналитика — вне scope (`SCOPE.md`).
- MASTER без bonus-list — by design.

---

## Последовательность заданий M4-B+

| ID | Задание | Зависимости | Объём |
| --- | --- | --- | --- |
| **M4-B** | Bot login UI + BFF consent + verify-code consents fix | B1 | Средний |
| **M4-C** | Order idempotency (navigator) + scanner Idempotency-Key | B2 | Средний |
| **M4-D** | History API: orderId, staff preview/owner visibility | B3, B4 | Небольшой–средний |
| **M4-E** | Launch runbook: env checklist, smoke on staging slot, DNS cutover plan | M4-B–D | Небольшой |
| **M4-F** | (Optional) AgentBonus in store history or V1 scope doc | product decision | Небольшой |
| **M5** | Navigator schema baseline for fresh envs | B5, private | Крупный |

---

## Что требуется от владельца

1. **Решение по входу:** bot-only confirm; OAuth отложен.
2. **Onboarding:** в кабинете vs redirect remcard.ru `/pro/setup`.
3. **Branch staff:** launch must-have или V2?
4. **Agent certificates:** in production? (G3)
5. **Cutover:** replace static prototype vs parallel.
6. **Доступы (без передачи в чат):** bot webhook admin, JWT_SECRET rotation policy, staging without webhook block for E2E, legal docs seeded.
7. **Merge approval** PR #1–#5 после review.

---

## Порядок слияния, запуска и отката

### Merge (pre-launch code)

```text
main ← #1 ← #2 ← #3 ← #4 ← #5
```

После merge: tag `v0.1.0-rc1` (optional).

### Launch (post M4-B/C/D)

```text
Deploy navigator patches (idempotency, history API)
→ Deploy partner-platform (login UI)
→ Staging smoke (HTTPS, origin, cookie, one synthetic purchase)
→ Production cutover pro.remcard.ru
→ Monitor 48h (duplicate orders, auth errors)
```

### Rollback

- **App:** revert partner-platform deploy to previous artifact; DNS to maintenance/static.
- **Navigator:** idempotency backward-compatible if header optional during transition.
- **Data:** duplicate orders from pre-idempotency — manual reconciliation (no auto-fix in M4).

---

## Связанные документы

- `docs/STATUS.md` — текущий SHA и краткий статус M4-A
- `docs/REUSE-MAP.md` — карта API
- `docs/reviews/M1-schema-bootstrap-diagnosis.md`
- `docs/reviews/M1-auth-verify-code.md`
- `docs/SCOPE.md`
