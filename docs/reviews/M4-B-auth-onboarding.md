# M4-B: вход, регистрация и согласия в PROF-кабинете

Дата: 7 октября 2026 (fix-pass #3: displayName dirty guard, returnTo после re-login).  
Navigator **Draft #676** · Partner **Draft #9** · branch `cursor/m4b-auth-onboarding-b3e3` · base M4-D.

Предшествующие проходы: `M4-B-backend-security.md`, fix-pass #1 (`62226b6`), fix-pass #2 (`4646f3f`).

---

## SHA / PR

| Repo | Branch | Base | PR | HEAD |
| --- | --- | --- | --- | --- |
| remcard-partner-platform | `cursor/m4b-auth-onboarding-b3e3` | M4-D | Draft **#9** | `8214ad3` |
| remcard-navigator | `cursor/m4b-auth-onboarding-b3e3` | M4-D | Draft **#676** | `15abd7c` (без изменений) |

---

## Исправления fix-pass #3

### 1. Поздний auth/me не затирает displayName

- `OnboardingForm`: `displayNameDirtyRef` — после любого пользовательского ввода (включая очистку) асинхронный `readSavedDisplayName()` не перезаписывает поле.
- Bootstrap-read только если `initialDisplayName` пуст; при SSR-значении чтение пропускается.
- Проверка названия через `PATCH /api/auth/me` + повторное чтение `auth/me` после сохранения — без изменений.

### 2. returnTo после повторного входа (401 на onboarding)

- Новый `buildSessionRecoveryLoginHref(returnTo)` в `auth-flow.ts`: в ссылку «Войти снова» передаётся **конечный** безопасный адрес (`/scanner`, `/history`, …), не `/onboarding?returnTo=…`.
- `sanitizeReturnTo` по-прежнему отклоняет внешние URL, `/login`, `/onboarding` (защита от redirect-loop).
- Необходимость onboarding после re-login определяет readiness в `AuthFlow` / `resolveDestinationAfterAuth`.

---

## Приёмка A–H (fix-pass #3)

| ID | Ожидание | Факт | Доказательство | Статус |
| --- | --- | --- | --- | --- |
| A | STORE skip consents → cabinet | без изменений | prior pass | **PASS** |
| B | CLIENT: consents → onboarding → cabinet | без изменений | fix-pass #2 browser | **PASS** |
| B2 | STORE displayName сохранён | без изменений | fix-pass #2 | **PASS** |
| C | Staff без owner onboarding | без изменений | unit + server | **PASS** |
| D | readiness fail без re-verify-code | без изменений | component | **PASS** |
| E | 409 consent version | без изменений | component | **PASS** |
| F | 401 onboarding → re-login → исходный адрес | href `/login?reason=session&returnTo=%2Fscanner`; unsafe returnTo отклонён | `OnboardingForm.test`, `auth-flow.test` | **PASS** (component); browser E2E **NOT VERIFIED** |
| F2 | Поздний auth/me не затирает ввод | delayed read + user edit → значение сохраняется | `OnboardingForm.test` (2 кейса) | **PASS** (component) |
| G | Purchase idempotency | без изменений | unit | **PASS** |
| H | Protection / double-click | без изменений | unit | **PASS** |

**Bot E2E:** **NOT VERIFIED** (fixture codes ≠ bot issuance).

---

## Тесты fix-pass #3

| Набор | Результат |
| --- | --- |
| Partner proxy (`npm run test:proxy`) | **163/163 PASS** |
| Partner component (`npm run test:component`) | **21/21 PASS** (+3 OnboardingForm, +2 auth-flow) |
| Partner lint | **PASS** |
| Partner typecheck (`tsc --noEmit`) | **PASS** |
| Partner production build | **PASS** |
| Navigator | **15abd7c** без изменений |

---

## Browser fix-pass #3

| Сценарий | Статус | Примечание |
| --- | --- | --- |
| 401 → «Войти снова» → re-login → `/scanner` | **NOT VERIFIED** | Не удалось воспроизвести session_lost UI в браузере (API onboarding не вернул 401 при invalid cookie); component-регрессии на href и dirty guard — **PASS** |
| STORE onboarding → `/scanner` (happy path) | **PASS** | fixture login, URL `/scanner` |
| CLIENT consents → onboarding | **PASS** (fix-pass #2) | — |

Component-проверки **не** засчитываются как browser E2E.

---

## Блокеры выпуска

1. Bot E2E NOT VERIFIED  
2. Browser 401→re-login→continue (session_lost UI) NOT VERIFIED  
3. Next.js 14.2.28 CVE (не обновлялось)  
4. Merge PR chain / staging HTTPS / DNS  

Merge/deploy не выполнялись.
