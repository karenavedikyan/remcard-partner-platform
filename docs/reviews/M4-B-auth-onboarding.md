# M4-B: вход, регистрация и согласия в PROF-кабинете

Дата: 7 октября 2026 (fix-pass #3 + browser 401 E2E).  
Navigator **Draft #676** · Partner **Draft #9** · branch `cursor/m4b-auth-onboarding-b3e3` · base M4-D.

Предшествующие проходы: `M4-B-backend-security.md`, fix-pass #1 (`62226b6`), fix-pass #2 (`4646f3f`).

---

## SHA / PR

| Repo | Branch | Base | PR | HEAD |
| --- | --- | --- | --- | --- |
| remcard-partner-platform | `cursor/m4b-auth-onboarding-b3e3` | M4-D | Draft **#9** | `36c6df9` |
| remcard-navigator | `cursor/m4b-auth-onboarding-b3e3` | M4-D | Draft **#676** | `15abd7c` (без изменений) |

---

## Исправления fix-pass #3

### 1. Поздний auth/me не затирает displayName

- `OnboardingForm`: `displayNameDirtyRef` — после любого пользовательского ввода (включая очистку) асинхронный `readSavedDisplayName()` не перезаписывает поле.
- Bootstrap-read только если `initialDisplayName` пуст; при SSR-значении чтение пропускается.

### 2. returnTo после повторного входа (401 на onboarding)

- `buildSessionRecoveryLoginHref(returnTo)`: ссылка «Войти снова» передаёт **конечный** адрес (`/scanner`, …), не `/onboarding?returnTo=…`.
- `sanitizeReturnTo` отклоняет внешние URL, `/login`, `/onboarding`.

---

## Browser E2E: 401 → re-login → /scanner

**Статус: PASS** (desktop + mobile, реальный HTTP 401, без fault injection).

| Параметр | Desktop | Mobile |
| --- | --- | --- |
| Viewport | 1280×800 | iPhone 13 (Playwright) |
| Fixture user | `m1fix-client-000000000001` | то же |
| HTTP 401 | `POST /api/account/consent` после `context.clearCookies()` | то же |
| «Войти снова» href | `/login?reason=session&returnTo=%2Fscanner` | то же |
| URL chain | `/login?returnTo=%2Fscanner` → `/onboarding?returnTo=%2Fscanner` → `/login?reason=session&returnTo=%2Fscanner` → `/scanner` | то же |
| Reload /scanner | PASS | PASS |
| Погашенный код повторно | `POST verify-code` → **401** | то же |
| Redirect-loop | нет | нет |

**Причина прошлого NOT VERIFIED:** `remcard-token` — **HttpOnly**; удаление через `document.cookie` не снимает сессию. Для приёмки нужен `Playwright context.clearCookies()`.

**Вход:** verify-code с одноразовыми кодами из тестовой БД (`BotLoginCode`, identifier `tg:777666555`). **Fixture-code login ≠ выдача кода ботом.**

**Воспроизведение** (partner :3000, navigator :3001, loopback `remcard_prof_test`):

```bash
export DATABASE_URL='…'   # из локального navigator .env.local; не коммитить
./scripts/local/run-m4b-browser-401.sh
```

Скрипт: **независимый reset + свежие коды перед каждым проходом** (desktop, затем mobile); любой сбой → exit ≠ 0.  
`DATABASE_URL` проверяется `validate-test-database-url.mjs` **до psql**: только `postgres:`/`postgresql:`, loopback (`127.0.0.1`, `localhost`, `::1` / `[::1]`), БД `remcard_prof_test` без лишнего path, без query/fragment. Отказ — generic message, без URL/пароля. SQL-защита в reset сохранена.

**Тесты валидатора:** `node --test scripts/local/validate-test-database-url.test.mjs` → **13/13 PASS** (автономно, без БД).

**Учётные данные:** ранний HEAD скрипта содержал захардкоженный пароль БД; пароль **ротирован локально** (только `remcard_prof_test` / loopback), обновлён navigator `.env.local` (не в Git). **История Git не переписывалась** — старый пароль может остаться в прошлых коммитах.

**Доказательства (без секретов):**

| Артефакт | Путь |
| --- | --- |
| Desktop JSON | `/opt/cursor/artifacts/m4b-browser-401/report_desktop.json` |
| Mobile JSON | `/opt/cursor/artifacts/m4b-browser-401/report_mobile.json` |
| Скриншоты | `/opt/cursor/artifacts/m4b-browser-401/screenshots/{desktop,mobile}_*.png` |

---

## Приёмка A–H

| ID | Ожидание | Статус | Доказательство |
| --- | --- | --- | --- |
| A | STORE skip consents → cabinet | **PASS** | prior |
| B | CLIENT: consents → onboarding → cabinet | **PASS** | fix-pass #2 + browser E2E |
| B2 | STORE displayName | **PASS** | fix-pass #2 |
| C–E, G–H | без изменений | **PASS** | unit/component |
| F | 401 onboarding → re-login → `/scanner` | **PASS** | browser E2E (desktop + mobile) |
| F2 | late auth/me не затирает ввод | **PASS** | component |

**Bot E2E:** **NOT VERIFIED** (fixture codes ≠ bot issuance).

---

## Тесты fix-pass #3 (без перезапуска после browser-only commit)

| Набор | Результат |
| --- | --- |
| Partner proxy | **163/163 PASS** |
| Partner component | **21/21 PASS** |
| Partner lint / typecheck / build | **PASS** |
| Browser 401 E2E | **PASS** (desktop + mobile) |
| `validate-test-database-url` | **13/13 PASS** |
| Navigator | **15abd7c** без изменений |

---

## Блокеры выпуска

1. Bot E2E NOT VERIFIED  
2. Next.js 14.2.28 CVE  
3. Merge PR chain / staging HTTPS / DNS  

Merge/deploy не выполнялись.
