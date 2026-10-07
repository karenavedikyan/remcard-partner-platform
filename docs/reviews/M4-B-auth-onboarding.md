# M4-B: вход, регистрация и согласия в PROF-кабинете

Дата: 7 октября 2026 (UI recovery + приёмка).  
Navigator **Draft #676** · Partner **Draft #9** · branch `cursor/m4b-auth-onboarding-b3e3` · base M4-D.

Предшествующий узкий backend/BFF-проход: `M4-B-backend-security.md` (сохранён без отката).

---

## SHA / PR

| Repo | Branch | Base | PR | HEAD (этот проход) |
| --- | --- | --- | --- | --- |
| remcard-partner-platform | `cursor/m4b-auth-onboarding-b3e3` | M4-D | Draft **#9** | *(после push)* |
| remcard-navigator | `cursor/m4b-auth-onboarding-b3e3` | M4-D | Draft **#676** | `15abd7c` (без UI-изменений) |

---

## Изменения (UI recovery)

### Partner (#9)

- **AuthFlow**: явные состояния — проверка сессии → код → readiness → согласия → onboarding/кабинет; `session_retry` / `blocked`; код погашается один раз (`codeConsumedRef`); ошибки auth/me и readiness **не** вызывают повторный verify-code; кнопка «Повторить проверку» при сети/5xx.
- **ConsentStep**: checkbox привязан к `kind:legalDocumentId`; сброс при смене ID; retry при пустом списке / отсутствии активного документа; 409 → reload readiness + новое подтверждение.
- **OnboardingForm**: выбор типа партнёра (MASTER / STORE / COMPANY); этапы строительства только для MASTER; категории товаров для STORE/COMPANY; город без скрытого дефолта; оферта с версией; после PATCH — auth/me + readiness (не HTTP 200 alone).
- **auth-session.ts**, **store-categories.ts**, **onboarding-partner-types.ts**; `resolveDestinationAfterAuth` без цикла `/login` для employee/unsupported.
- Тесты: +8 proxy (auth-consent/session), +6 component (AuthFlow/ConsentStep).

### Navigator (#676)

Без изменений в этом проходе. Сохранены: `claimBotLoginCode`, сериализация consent, BFF `legalDocumentId`, `assertCabinetProfAccess` на store order/preview.

---

## Матрица серверной границы (Stage D)

| Страница / операция | API | Сессия | Роль | Login consents | Профиль / оферта | Guard |
| --- | --- | --- | --- | --- | --- | --- |
| `/login` | verify-code, auth/me, cabinet-readiness | — / cookie | любая | UI-only | — | rate limit verify-code |
| `/onboarding` | pro/profile PATCH, consent POST | cookie | CLIENT→PRO | redirect если pending login consents | PUBLIC_OFFER_PRO + partnerType/city/specs | employee → redirect home |
| `/`, `/scanner`, `/history`, … | BFF proxy | cookie | PRO (UI gate) | readiness redirect | needsProfileOnboarding → onboarding | `requireProPageUser` |
| Store preview/order | POST store/order/preview, POST store/order | cookie | PRO | **403 CABINET_NOT_READY** | **403** если profile incomplete | `assertCabinetProfAccess` |
| Partnership CRUD | /api/partnership/* | cookie | PRO | **не проверяет readiness** | **не проверяет** | proAuth only |
| Pro wallet/orders | /api/pro/* | cookie | PRO | **не проверяет readiness** | context-based | getProContext |
| Account consent/readiness/logout | /api/account/* | cookie | любая auth | readiness/logout доступны | — | — |

**Вывод:** guard readiness **точечный** (store order/preview + UI session gates). Общие preview/order основного сайта для неготового PROF → 403 с `CABINET_NOT_READY`. Partnership/wallet без readiness — **известная частичная граница**, не расширялась и не ослаблялась в M4-B.

---

## Приёмка A–H

| ID | Ожидание | Факт | Доказательство | Статус |
| --- | --- | --- | --- | --- |
| A | PROF/STORE: вход → та же учётка → consents skip → returnTo | Код → scanner, «M1 Магазин» | Browser desktop screenshot; API readiness `nextStep=ready` для store | **PASS** |
| B | CLIENT: code → consents → onboarding по типу → cabinet → reload | MASTER: consents UI + API PATCH → `canAccessCabinet=true`; STORE UI — см. B2 | Browser consents mobile/desktop; API chain client→PRO MASTER | **PASS** (MASTER API + UI consents); **PARTIAL** (полный STORE onboarding UI — NOT VERIFIED this pass) |
| C | Staff: userId/org/branch, без owner onboarding | `isEmployee` → onboarding redirect home | unit `cabinetReadiness.test`; onboarding page server redirect | **PASS** (unit + server logic) |
| D | verify ok → readiness 503 → retry без verify-code | `session_retry` + «Повторить проверку»; не «Неверный код» | `AuthFlow.test` + component | **PASS** (component); browser partial (session redirect) |
| E | stale checkbox → 409 → новая версия без галочки | ConsentStep reset on doc id change; 409 reload | `ConsentStep.test`; API 409 contract (navigator unit) | **PASS** (component + API contract); browser version labels seen in B |
| F | 401 на consents/profile → понятный re-login | `session_lost` → «Войти снова» | AuthFlow design + consent 401 message | **PASS** (component/logic); browser NOT VERIFIED |
| G | Purchase attempt restore same userId | sessionStorage + idempotency | `store-order-attempt.test`, M4-C PG | **PASS** (unit/proxy); UI→BFF chain NOT re-run this pass |
| H | Защита: no session, blocked, returnTo, bypass, double-click | sanitizeReturnTo; submitLock; blocked state | unit auth-flow + proxy + component | **PASS** (automated); browser spot-check A |

### Browser / bot

| Контур | Результат |
| --- | --- |
| Browser A (store → scanner) | **PASS** — `m4b-a-store-desktop.png` |
| Browser B consents (desktop/mobile) | **PASS** — `m4b-b-client-mobile.png`, desktop scanner after consents |
| Browser B full onboarding UI (master/store) | **PARTIAL** — API MASTER path PASS; UI onboarding form NOT fully exercised in browser after consents (prior session state) |
| Bot E2E | **NOT VERIFIED** |

---

## Тесты

| Набор | Результат |
| --- | --- |
| Partner proxy | **156/156 PASS** |
| Partner component | **14/14 PASS** |
| Partner lint + production build | **PASS** |
| Navigator targeted unit (consent, readiness, claim) | **23/23 PASS** |
| Navigator PG security (prior pass) | **9/9 PASS** (не перезапускались в UI-проходе; regression по unit) |

Локальный стек: `remcard_prof_test` @ 127.0.0.1:5432; partner :3000, navigator :3001; `pnpm seed:legal`.

---

## Скриншоты

- Desktop store scanner (A): `/opt/cursor/artifacts/screenshots/m4b-a-store-desktop.png`
- Client consents mobile (B): `/opt/cursor/artifacts/screenshots/m4b-b-client-mobile.png`
- Client desktop after consents (B partial): `/opt/cursor/artifacts/screenshots/m4b-b-client-master-desktop.png`

---

## Готовность

| Область | Статус |
| --- | --- |
| UI AuthFlow recovery | **Готов** (component + browser A; retry/consent deadlock устранены) |
| Consent version binding UI | **Готов** (kind+legalDocumentId, 409 flow) |
| Onboarding by partner type | **Готов** (form + API MASTER; STORE browser UI — доработать приёмку) |
| Server boundary | **Частично** — store order/preview guarded; partnership/wallet без readiness (документировано) |
| Real bot E2E | **NOT VERIFIED** |

---

## Блокеры выпуска

1. Bot E2E NOT VERIFIED  
2. Next.js 14.2.28 known vulnerability (не обновлялось в M4-B)  
3. Merge PR chain M1→M4-B  
4. Staging HTTPS cookie policy / DNS pro.remcard.ru  
5. Полная browser-приёмка onboarding STORE + сценарии F/G/H в UI (опционально до merge)

Merge/deploy не выполнялись.
