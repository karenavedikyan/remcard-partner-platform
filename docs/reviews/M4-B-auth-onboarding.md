# M4-B: вход, регистрация и согласия в PROF-кабинете

> Последующее узкое исправление безопасности и фактические проверки:
> `M4-B-backend-security.md`. Приведённые ниже PASS из прошлого отчёта
> не заменяют незавершённую браузерную приёмку всего M4-B.

Дата: 7 октября 2026 года (fix-pass).

Navigator **Draft #676** · Partner **Draft #9** · branch `cursor/m4b-auth-onboarding-b3e3` · base M4-D.

---

## Контракт обязательных шагов

| Шаг | Проверка сервером | Где |
| --- | --- | --- |
| Сессия (verify-code) | cookie `remcard-token` + `GET /api/auth/me` | `proAuth`, BFF |
| PERSONAL_DATA + TERMS (активная версия) | `GET /api/account/cabinet-readiness`; POST consent с `legalDocumentId` | `cabinetReadiness`, `recordConsentIfMissing` |
| PUBLIC_OFFER_PRO + профиль (только CLIENT) | readiness + `PATCH /api/pro/profile` + `getValidConsentForActiveDocument` | profile route |
| PROF-операции (сканер/заказ) | `assertCabinetProfAccess` → 403 `CABINET_NOT_READY` | store/order, store/order/preview |

Cookie после verify-code **не означает** завершение согласий/onboarding. UI шаги: code → consents (только missing) → profile → returnTo.

---

## M4-B fix: изменения

### Navigator
- `recordConsentIfMissing`: valid consent = active `legalDocumentId`, не любое неотозванное; `$transaction` против дублей
- `GET /api/account/cabinet-readiness`: missing/stale/withdrawn, nextStep, canAccessCabinet
- `POST /api/account/consent`: optional `legalDocumentId`, 409 `DOCUMENT_VERSION_MISMATCH`
- `verify-code`: atomic `updateMany` claim (PG concurrency test PASS)
- `assertCabinetProfAccess` на POST store/order + preview
- `pro/profile`: PUBLIC_OFFER_PRO через active document version

### Partner
- `AuthFlow`: code → readiness → consents (only missing) → redirect/onboarding
- Consent errors не маскируются под «неверный код»
- `OnboardingForm`: city без дефолта, stages из navigator pro/setup, offer только если readiness требует
- `session.ts` / pages: readiness redirects, без циклов /login ↔ /onboarding
- BFF: `GET /api/account/cabinet-readiness`

---

## Матрица приёмки A–G

| ID | Ожидание | Факт | Доказательство | Статус |
| --- | --- | --- | --- | --- |
| A | PRO/STORE: same userId, актуальные consents не спрашиваются | readiness `nextStep=ready`, AuthFlow skip consents | unit `cabinetReadiness.test`, `AuthFlow.test` | PASS |
| B | CLIENT: code → consents → profile → cabinet | readiness + onboarding PATCH | unit + API contract | PASS (browser onboarding — см. ниже) |
| C | Staff: без owner onboarding | `isEmployee`, `needsProfileOnboarding=false` | unit `cabinetReadiness.test` | PASS |
| D | Stale consent → re-accept active version | status `stale`, POST with new doc id | unit + consent tests | PASS |
| E | verify-code ok, consent fail → retry без нового кода | AuthFlow step=consents after session | `AuthFlow` design + component test | PASS |
| F | API bypass без readiness → 403 | store/order preview/order | `assertCabinetProfAccess` in routes | PASS (unit); API smoke — restart stack |
| F2 | Concurrent code → one session | 200+401 | PG test `concurrency.test.ts` | PASS |
| G | Purchase attempt restore same userId | sessionStorage keyed by userId | `store-order-attempt.test` | PASS |

**Browser (A/B/E):** требует `pnpm seed:legal` + running stack. Предыдущий прогон login/consents PASS; после fix — AuthFlow sequential (перезапуск stack для повторного browser прогона).

**Bot E2E:** NOT VERIFIED (test bot + env).

---

## Тесты

| Набор | Результат |
| --- | --- |
| navigator unit (consent, readiness, verify-code PG) | 12/12 PASS |
| partner proxy + component | 146 + 8 PASS |
| lint + typecheck + build (оба repo) | PASS |

---

## Bot E2E (NOT VERIFIED)

Env: `TELEGRAM_BOT_TOKEN`, `DATABASE_URL`, `JWT_SECRET`, partner BFF vars — отдельный test bot, не production.

---

## Блокеры запуска

1. Bot E2E NOT VERIFIED
2. Merge PR chain M1→M4-B
3. Staging HTTPS cookie policy
4. DNS pro.remcard.ru
