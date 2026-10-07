# M4-B: вход, регистрация и согласия в PROF-кабинете

Дата: 7 октября 2026 (fix-pass #2: consents order, displayName, 401 recovery).  
Navigator **Draft #676** · Partner **Draft #9** · branch `cursor/m4b-auth-onboarding-b3e3` · base M4-D.

Предшествующие проходы: `M4-B-backend-security.md`, UI recovery (`62226b6`).

---

## SHA / PR

| Repo | Branch | Base | PR | HEAD |
| --- | --- | --- | --- | --- |
| remcard-partner-platform | `cursor/m4b-auth-onboarding-b3e3` | M4-D | Draft **#9** | *(после push fix-pass #2)* |
| remcard-navigator | `cursor/m4b-auth-onboarding-b3e3` | M4-D | Draft **#676** | `15abd7c` (без изменений) |

---

## Исправления fix-pass #2

### 1. Согласия раньше onboarding (CLIENT)

- `resolveAuthFlowFromReadiness`: login-consents (PERSONAL_DATA, TERMS) **всегда** перед `needsProfileOnboarding`.
- `AuthFlow.applyReadiness`: consents step до redirect на `/onboarding`.
- Регрессии: `auth-flow.test`, `AuthFlow.test` (CLIENT с обоими типами missing consents).

### 2. displayName для STORE/COMPANY

- `displayName` сохраняется через `PATCH /api/auth/me` (navigator validation), не через `pro/profile`.
- BFF allowlist: `PATCH /api/auth/me` добавлен в `remcard-proxy.ts`.
- После PATCH — повторное чтение `auth/me` для подтверждения названия.
- `pro/profile` PATCH отправляет только `city`, `partnerType`, `specializations` / `storeCategories`.

### 3. Восстановление onboarding после 401 / partial save

- `onboarding-save.ts`: пошаговое сохранение (offer → displayName → profile → verify).
- 401 → «Войти снова» с `returnTo=/onboarding?...` (без localStorage черновиков).
- Сеть/5xx после успешного PATCH → «Повторить проверку» (только auth/me + readiness, без повторного PATCH).
- Юридические галочки не восстанавливаются автоматически; offer checkbox сбрасывается только при смене `legalDocumentId`.

---

## Приёмка A–H (fix-pass #2)

| ID | Ожидание | Факт | Доказательство | Статус |
| --- | --- | --- | --- | --- |
| A | STORE skip consents → cabinet | без изменений | prior pass | **PASS** |
| B | CLIENT: code → **consents** → onboarding → cabinet | consents UI → onboarding → scanner/profile | Browser fix-pass #2; API chain | **PASS** |
| B2 | STORE displayName сохранён | «Тст агазин M4B» в /profile UI + DB | Browser + `SELECT displayName` | **PASS** |
| C | Staff без owner onboarding | без изменений | unit + server | **PASS** |
| D | readiness fail без re-verify-code | без изменений | component | **PASS** |
| E | 409 consent version | без изменений | component | **PASS** |
| F | 401 onboarding → re-login | link `/login?returnTo=/onboarding...` | `OnboardingForm.test` | **PASS** (component); browser NOT VERIFIED |
| G | Purchase idempotency | без изменений | unit | **PASS** |
| H | Protection / double-click | без изменений | unit | **PASS** |

**Bot E2E:** **NOT VERIFIED** (fixture codes ≠ bot issuance).

---

## Тесты fix-pass #2

| Набор | Результат |
| --- | --- |
| Partner proxy | **159/159 PASS** (+3 onboarding-save, +1 PATCH auth/me allowlist) |
| Partner component | **18/18 PASS** (+3 OnboardingForm, +1 AuthFlow) |
| Partner lint + production build | **PASS** |
| Navigator | **15abd7c** без изменений; targeted unit 23/23 (prior) |

---

## Browser fix-pass #2 (fixture login, NOT bot)

| Сценарий | Статус | Скриншот |
| --- | --- | --- |
| CLIENT code → consents → onboarding (не /login loop) | **PASS** | — |
| STORE onboarding → cabinet → profile displayName | **PASS** | `m4b-fix-client-onboarding-desktop.png` |
| Mobile profile | **PASS** | `m4b-fix-client-mobile.png` |
| 401 → re-login → continue onboarding | **NOT VERIFIED** (browser) | component only |
| MASTER onboarding full UI | **NOT VERIFIED** (browser this pass) | API MASTER path PASS prior |

---

## Блокеры выпуска

1. Bot E2E NOT VERIFIED  
2. Next.js 14.2.28 CVE (не обновлялось)  
3. Browser 401→continue onboarding  
4. Merge PR chain / staging HTTPS / DNS  

Merge/deploy не выполнялись.
