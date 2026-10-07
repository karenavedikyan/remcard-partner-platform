# M4-B: вход, регистрация и согласия в PROF-кабинете

Дата: 7 октября 2026 года.

Navigator backend PR: **Draft (base M4-D #675)** · Partner UI PR: **Draft (base M4-D #8)** · branch `cursor/m4b-auth-onboarding-b3e3`.

---

## 1. Аудит контракта основного сайта (navigator)

| Компонент | Статус | Примечание |
| --- | --- | --- |
| Выдача кода Telegram-ботом `/login` | **Готовое — переиспользуем** | Deep link `https://t.me/RemCardBot?start=login`; создаёт `BotLoginCode`, stub user при первом входе; **согласия не записывает** |
| MAX-бот `/start login` | **Готовое — не подключаем в UI** | Backend принимает `max:` коды; в partner UI показываем только Telegram (путь MAX не подтверждён для кабинета) |
| `POST /api/auth/verify-code` | **Готовое — переиспользуем** | Тело: **только `{ code }`** (6 цифр); игнорирует consents; rate limit 10 req/min/IP+UA; одноразовый код + `expiresAt`; 401 неверный/истёкший; 404 user not found |
| `GET /api/auth/me` | **Готовое — переиспользуем** | `{ user: null }` без cookie; полный профиль с `role`, `partnerType`, `isBlocked` (через deletedAt) |
| `POST /api/auth/logout` | **Готовое — переиспользуем** | Очищает `remcard-token` |
| `POST /api/account/consent` | **Расширено минимально (M4-B)** | Было: только `PUBLIC_OFFER_PRO`. Стало: + `PERSONAL_DATA`, `TERMS`; idempotent через `recordConsentIfMissing` |
| PRO onboarding (CLIENT→PRO) | **Готовое — переиспользуем** | `POST /api/account/consent` (`PUBLIC_OFFER_PRO`) → `PATCH /api/pro/profile` (city, specializations); сервер выставляет role/partnerType |
| Хранение согласий / версий | **Готовое — переиспользуем** | `Consent` + active `LegalDocument`; проверка на сервере при PATCH profile (`PUBLIC_OFFER_PRO_REQUIRED`) |
| Существующий PRO / STORE | **Готовое — переиспользуем** | verify-code находит user по telegramId/maxId; role/partnerType не меняются при входе |
| Сотрудник (staff) | **Готовое — переиспользуем** | Тот же userId; `staffRole` в `/api/auth/me`; onboarding не навязывается (role уже PRO) |
| Новый CLIENT (stub после /login) | **Готовое — переиспользуем** | После verify-code сессия есть; UI направляет на `/onboarding` |
| OAuth VK/Yandex | **Не подключаем** | Вне scope M4-B |
| Consent status в `/api/auth/me` | **Действительно отсутствует** | UI не полагается на localStorage; consents пишутся явными POST после сессии |
| Проверка PERSONAL_DATA/TERMS на verify-code | **Действительно отсутствует** | Клиентский gate + POST `/api/account/consent` после успешного `auth/me` |

### Защита verify-code

- Rate limit: `auth:verify-code` — 10/min (navigator `rate-limit-auth.ts`)
- Одноразовость: `BotLoginCode.used = true`
- Срок: `expiresAt > now()`
- **Пробелов для замены frontend-delay не выявлено**

---

## 2. Partner-platform: что сделано

| Область | Реализация |
| --- | --- |
| Экран входа | `/login`, `LoginForm`: Telegram deep link, OTP 6 цифр, paste/leading zeros, anti double-submit |
| BFF | `POST /api/auth/verify-code`, `POST /api/account/consent` в allowlist |
| Сессия | После verify-code — обязательный `GET /api/auth/me`; закрытые страницы через `requireProPageUser` / `requireProSession` |
| Согласия входа | Checkbox PERSONAL_DATA + TERMS (не pre-checked); POST consent после сессии |
| Onboarding | `/onboarding` для `role !== PRO`: PUBLIC_OFFER_PRO + PATCH profile |
| returnTo | Whitelist внутренних путей (`sanitizeReturnTo`); без внешних redirect |
| Scanner attempt | `store-order-attempt` keyed by `userId` в sessionStorage — переживает logout/login того же user; другому userId не показывается |

---

## 3. Матрица пользователей и согласий

| Пользователь | verify-code | PERSONAL_DATA + TERMS | PUBLIC_OFFER_PRO | PATCH profile | Итог |
| --- | --- | --- | --- | --- | --- |
| Существующий PRO/STORE | same userId | POST idempotent (skip if exists) | не требуется | не требуется | → returnTo или `/` |
| Сотрудник (staff, role PRO) | same userId | POST idempotent | не требуется | не требуется | → кабинет, права сохранены |
| Новый CLIENT (stub) | создаёт сессию | POST после login | на onboarding | city + specs | → PRO после сервера |
| Заблокированный | 403 / me gate | — | — | — | сообщение «Аккаунт заблокирован» |
| Без согласий (отказ checkbox) | не вызывается | client block | — | — | «Примите обязательные соглашения» |

---

## 4. Результаты проверок

### Unit / API (автоматические)

| Набор | Результат |
| --- | --- |
| partner `npm run test:proxy` | см. CI / локальный прогон (auth-flow, remcard-proxy consent allowlist) |
| partner `npm run test:component` | LoginForm: consents gate + verify-code + auth/me routing |
| navigator `pnpm test` | consent: `recordConsentIfMissing` idempotent |
| lint + build (оба repo) | см. прогон агента |

### Browser (локальный stack, fixture DB)

**Предусловие:** `pnpm seed:legal` в navigator (иначе `POST /api/account/consent` → 503 `NO_ACTIVE_DOCUMENT`).

| Сценарий | Результат |
| --- | --- |
| Login form UI (desktop/mobile) | PASS (screenshots) |
| Consent gate без checkbox | PASS — «Примите обязательные соглашения» |
| verify-code + auth/me + consent + redirect /scanner | PASS (код fixture DB, не bot) |
| returnTo=/scanner после входа PRO | PASS |
| Закрытая страница без сессии | SessionGate на `/scanner` |
| Onboarding CLIENT→PRO | API-ready; browser — не прогонялся отдельно |
| Scanner attempt restore после re-login | unit PASS (`store-order-attempt`) |

### Bot E2E (production/test bot)

**NOT VERIFIED** — полный путь «бот выдаёт код → кабинет → onboarding» требует отдельного тестового бота.

Необходимые env (владелец, **не присылать секреты в чат**):

| Repo | Переменная | Назначение |
| --- | --- | --- |
| navigator | `TELEGRAM_BOT_TOKEN` | webhook/polling **только test bot** |
| navigator | `TELEGRAM_WEBHOOK_SECRET` | webhook test |
| navigator | `DATABASE_URL`, `JWT_SECRET` | backend |
| partner | `REMCARD_API_BASE_URL`, Basic Auth | BFF → backend |
| partner | `NEXT_PUBLIC_APP_URL` | origin check |
| partner | `NEXT_PUBLIC_TELEGRAM_BOT_LOGIN_URL` | optional override deep link |

Безопасные шаги: отдельный Telegram bot + staging DB; не трогать production webhook/polling.

---

## 5. Блокеры запуска (после M4-B)

1. **Bot E2E NOT VERIFIED** — нужен test bot + staging
2. Merge цепочки PR M1→M4-B
3. DNS / `pro.remcard.ru` → partner-platform (вне scope агента)
4. Cookie domain: BFF origin ≠ remcard.ru — сессия через proxy Set-Cookie на origin кабинета (проверить на staging HTTPS)

---

## 6. Порядок внедрения

1. Merge navigator M4-B (consent kinds) → M4-D base
2. Merge partner M4-B → M4-D base
3. Staging: test bot + env + smoke login/onboarding
4. Production cutover с мониторингом rate limit / consent 503 (нет active legal doc)
