# STORE-COMPANY-TEST-WORKING-PROFILE-SAVE-01 / SAVE-02

## Branches and SHAs

| Repo | Branch | Checkpoint (не публиковать повторно) | SAVE-01 tip | **SAVE-02 code tip** |
|------|--------|--------------------------------------|-------------|----------------------|
| remcard-navigator | `fix/store-company-test-working-profile-save-01` | `cadb77e5d1834a6c45f778e49e9f23469eb62b46` | `780f2cdb` | **`15b296352c3a82691682e665a250e306b3f06db9`** |
| remcard-partner-platform | same | `6a70eb1bdce37ddda86f4004ecc725a40807a5d2` | `22d7a4be` (tests) | **`32d15af231d1f8639bf9ab9bfe0eb8a6892f9fb9`** (tests + wizard) |

Evidence-only commit (этот REPORT) следует за code tip после push.

Нет merge/PR/release/deploy, SQL/schema/env, production-записей.

---

## SAVE-01 (кратко)

Prof-test **GET** `/api/pro/organization` работал; **POST/PATCH** резались `profTestRoutePolicy` → ложный **401** на шаге 1 wizard. Добавлен узкий guard + allowlist методов на exact path + handler для STORE/COMPANY.

---

## SAVE-02 — fail-closed и приёмка

### Блокирующий дефект (исправлен)

**Было:** `getProUser` уже проверял delegation; затем `if (resolveProfTestContext)` — при **null** на второй проверке запрос проваливался в **ordinary** POST/PATCH (опасно с расширенным allowlist).

**Стало:** `resolveOrganizationWriteSession` (`profTestOrganizationRouteSession.ts`) повторно вызывает `verifySessionFromRequest`. Test-marked principal при `null` → **401**, **без записей** и без ordinary handler.

**Регрессия:** `route.prof-test-fail-closed.test.ts` — spy на `resolveProfTestContext`: 1-й вызов OK, 2-й `null` → POST/PATCH **401**, `organization.create/update` **0**; отдельно stable session + `inn` → **403**, **0** writes.

### Файлы backend (SAVE-02 delta)

- `src/lib/profTestOrganizationRouteSession.ts` — gate
- `src/app/api/pro/organization/route.ts` — POST/PATCH через gate
- `src/lib/profTestOrganizationWorkingProfile.ts` — non-object body, typed string fields
- `src/app/api/pro/organization/__tests__/route.prof-test-fail-closed.test.ts`
- `src/app/api/catalog/__tests__/route.prof-test-org-visibility.test.ts` — `GET /api/catalog` `organization.findMany` with `catalogPublished: true`
- `src/lib/__tests__/profTestOrganizationRouteSession.test.ts`

### Файлы frontend (SAVE-02)

- `src/lib/prof-test-org-transport.fixture.ts` — stateful GET/POST/PATCH/GET profile
- `src/lib/profile-working-save.prof-test-org.test.ts` — **два** последовательных save (STORE POST→PATCH, COMPANY clear contacts)
- `src/components/profile/business/BusinessWorkingProfileWizard.prof-test-org-flow.test.tsx` — **4 шага**, real `persistWorkingProfileDraft`, reload через `initialProfile`, 403 banner на шаге 1

Runtime prod-кода partner-platform **не менялся** (только тесты/fixture).

---

## Матрица STORE / COMPANY (автотесты)

| Шаг | STORE | COMPANY | Тест |
|-----|-------|---------|------|
| create (no org) | POST | POST | `profile-working-save.prof-test-org.test.ts` |
| update | PATCH после refresh profile | PATCH + clear website/telegram | same |
| 4 шага wizard | ✓ summary + reload | ✓ summary | `BusinessWorkingProfileWizard.prof-test-org-flow.test.tsx` |
| 403 UI | banner, остаётся шаг 1 | — | wizard test |
| fail-closed | 401, 0 writes | — | `route.prof-test-fail-closed.test.ts` |
| public catalog | draft hidden; published control visible | same | `route.prof-test-org-visibility.test.ts` |

---

## Security coverage (синтетика, без production)

| Case | HTTP | Writes | Test |
|------|------|--------|------|
| Context lost between checks | 401 | 0 | fail-closed |
| Forbidden `inn` / `action` | 403 | 0 | route prof-test write + parser |
| MASTER / partnerType mismatch | 403 | 0 | route prof-test write |
| Published / INN org | 403 | 0 | route prof-test write |
| Malformed body / bad types | 400 | 0 | parser unit |
| Valid STORE/COMPANY delegation | 201/200 | 1 | route mocks + transport |

Не покрыто в интеграции с реальной PG: полная матрица expired/revoked/disabled admin (нет `remcard_prof_test` в CI VM — `DATABASE_URL=remcard_r01_test`). Поведение делегирования — через `profTestSessionValidator` unit tests + fail-closed route test.

---

## Команды и результаты (SAVE-02 code SHA)

**Navigator** — 7 files, **35 passed**, exit 0:

```bash
pnpm exec vitest run \
  src/lib/__tests__/profTestOrganizationWorkingProfile.test.ts \
  src/lib/__tests__/profTestOrganizationRouteSession.test.ts \
  src/lib/__tests__/profTestRoutePolicy.test.ts \
  src/lib/__tests__/profTestSessionValidator.test.ts \
  src/app/api/pro/organization/__tests__/route.prof-test-organization-write.test.ts \
  src/app/api/pro/organization/__tests__/route.prof-test-fail-closed.test.ts \
  src/app/api/catalog/__tests__/route.prof-test-org-visibility.test.ts
pnpm run build   # exit 0
```

**Partner-platform** — 6 passed, exit 0:

```bash
pnpm exec vitest run \
  src/lib/profile-working-save.prof-test-org.test.ts \
  src/components/profile/business/BusinessWorkingProfileWizard.prof-test-org-flow.test.tsx
pnpm run build   # exit 0
```

`pnpm run typecheck` в navigator: **не gate** (baseline на checkpoint уже с unrelated errors); **build** — источник истины.

---

## Browser / screenshots — BLOCKER

Локальный browser smoke с **настоящей** prof-test delegation (admin login + return slot + navigator API) в изолированной VM **не поднят**: нет пары platform+navigator с валидными prof-admin флагами и test delegation без production cookie/API.

Замена: component/wizard tests с stateful transport (см. выше). **Скриншоты desktop/mobile после save+reload в реальном ЛК — не приложены.**

---

## Release manifest

| Application | Deploy needed? | Why |
|-------------|----------------|-----|
| **remcard-navigator** | **Да** (после приёмки) | Fail-closed gate + org write handler |
| **remcard-partner-platform** | **Нет** | Только tests/fixture/report; runtime unchanged |

---

## Проверка владельцем (инструкция, не выполнять агентом)

1. Войти под admin → тестовые ЛК **магазин `RC-TEST-8IWU-XC68`**, **компания `RC-TEST-W5VC-XGFA`** (существующие записи, не менять агентом).
2. Профиль → рабочий профиль (4 шага): шаг 1 — название, представитель, город → **Продолжить** (должно сохраниться без «вылета» на login).
3. Пройти шаги 2–4, **Сохранить профиль**; F5 — данные и прогресс на месте.
4. Изменить название/сайт/Telegram, сохранить снова; очистить сайт/Telegram — после reload пусто.
5. Негатив: при отозванной delegation — **нет** silent save; при forbidden field — **403**, форма с введёнными данными.

---

## Rollback (не выполнялся)

1. **Единственная безопасная исходная цель:** production checkpoint **`cadb77e5d1834a6c45f778e49e9f23469eb62b46`** (после сверки с фактическим production).
2. **`780f2cdb` НЕ rollback-цель:** в SAVE-01 остаётся fail-open между двумя проверками delegation.
3. Откат на **`15b29635`** (SAVE-02 runtime) снимает fail-closed gate; применять только после осознанной приёмки фикса.
4. На `cadb77e5` prof-test POST/PATCH снова blocked → wizard step 1 снова 401.

---

## SAVE-02 gates (дополнение turn108)

| Gate | Доказательство |
|------|----------------|
| Route session unit | `profTestOrganizationRouteSession.test.ts` — real JWT, spy `verifySessionFromRequest`, test/real/401 |
| Security matrix | `route.prof-test-organization-security-matrix.test.ts` — real session stack, 12 cases, 0 writes; delegation/slot state |
| Race | `route.prof-test-fail-closed.test.ts` — `revokeDelegationAfterRead: 2` |
| Catalog | `route.prof-test-org-visibility.test.ts` — draft+published fixture, predicate, IDs |
| Frontend transport | `prof-test-org-transport.fixture.ts` — auth/me + profile PATCH |
| Wizard remount | `BusinessWorkingProfileWizard.prof-test-org-flow.test.tsx` — unmount/mount, 403 STORE+COMPANY |

**Runtime release SHA (неизменен):** navigator **`15b296352c3a82691682e665a250e306b3f06db9`**. **Final backend test tip:** **`c25521dece68dcc05f0d293aac58ce067dd696d2`**. Frontend production **`6a70eb1bdce37ddda86f4004ecc725a40807a5d2`**; evidence **`f7d019fc`**.

**Команды (exit 0):** navigator vitest **8 files / 50 passed** (full SAVE-02 backend suite); frontend **7 passed**; `pnpm run build` navigator runtime **`15b29635`** exit 0.

**Typecheck baseline:** `pnpm run typecheck` → **52** ошибки (как на `cadb77e5` и `15b29635`; на `d145aa1f` было **56** из‑за TS2556 в persistence doubles — исправлено в test tip без изменения runtime).

**BLOCKED:** browser E2E + скриншоты в реальных test LK.

---

## Итог

**READY FOR REVIEW** для release backend **`15b29635`** после owner smoke в test LK.

**BLOCKED:** browser/screenshots (`RC-TEST-8IWU-XC68`, `RC-TEST-W5VC-XGFA`) — не выполнялись.
