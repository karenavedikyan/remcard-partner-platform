# R00 — техническая сверка (RemCard PROF → прототип)

**Дата аудита:** 14 октября 2026 (UTC)  
**Исполнитель:** Cloud Agent R00 (только чтение + безопасные проверки)  
**Версия документа:** `r00-20261014` (новый каталог; предыдущих файлов по этому пути не было)

---

## 1. Среда Cursor и доступ к репозиториям

| Репозиторий | Remote | Доступ из Cursor | Рабочая ветка (локальный checkout) | `HEAD` checkout | `git status` |
|-------------|--------|------------------|-------------------------------------|-----------------|--------------|
| `remcard-partner-platform` | `github.com/karenavedikyan/remcard-partner-platform` | ✅ | `cursor/m1-foundation-aa2d` | `e8f7e91e37aa8cc0d554e2a93fbaac961c219885` | clean |
| `remcard-navigator` | `github.com/karenavedikyan/remcard-navigator` | ✅ | `cursor/m4c-order-idempotency` | `44ab76e6b01a4ebf184f00c73b9c930c6beea3c6` | clean |

**Важно:** локальные checkout **не отражают** актуальный PROF-кабинет. Это снимок M1 / ранних веток (в platform фактически один маршрут `src/app/page.tsx`). Аудит кода PROF выполнен через **`git fetch origin` (read-only)** и чтение **`origin/release/*`**, **`origin/feat/prof-i-integration`**, **`origin/fix/*`** без `checkout`/`merge`/`pull`.

Cloud environment: personal env `bc47597d-c172-11f1-bb68-864e54d14197`, build `bld-20261013-c6a15abb`, egress unrestricted. **Hosting/deploy metadata Timeweb из Cursor недоступна** (NOT VERIFIED для live runtime SHA).

---

## 2. Ключевые remote refs (после `git fetch origin`)

### Platform (`remcard-partner-platform`)

| Ref | SHA | Роль |
|-----|-----|------|
| `origin/main` | `7e16136db57f4ff84efd55d8bf414ca3f6afb003` | upstream default |
| `origin/release/prof-v1-20261007` | `e245feea79d171976ebd8b7f2dea0ded00302a89` | **подготовленный / расширенный PROF V1 tip** (post-release fixes, team UX) |
| `origin/feat/prof-i-integration` | `40a009671873ae294b8d4f2a6d532e25be00a474` | интеграционный кандидат PROF-I (docs + theme/inbox/team caps); **отстаёт от release tip** |
| `origin/fix/prof-staff-partnership-access` | `195506637870572b79087537e76c781206f480f1` | незавершённый поток: партнёрства для CLIENT-с staff (не в release tip) |

Merge-base `release/prof-v1-20261007` ↔ `feat/prof-i-integration`: **`ad9349b2fa07d0b2cff387c8950c33cdc91fb94a`** — release **впереди** integration (на tip `e245fee` есть коммиты после `ad9349b`, напр. owner team removal UX).

### Navigator (`remcard-navigator`)

| Ref | SHA | Роль |
|-----|-----|------|
| `origin/main` | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | upstream default |
| `origin/release/prof-backend-v1-20261007` | `bf2081d89c3a334f1531e5bceff88464a4760309` | **PROF backend release tip** (в т.ч. PATCH guards сотрудников филиала) |
| `origin/feat/prof-i-integration` | `c8f660296ef2c98b34e757b076cb5d0461bde39a` | PROF-I migrations/tooling + `teamCapabilities`; merge-base с release: **`ecc798328e117394df52e4c0cf4ee246abf0b58c`** |
| `origin/fix/prof-staff-partnership-access` | `9c5a2acea6a7b67ebbb6bb76a16c2f2ffdee976c` | resolver партнёрств для org staff (не в release tip) |

### `feat/prof-i-integration` — существует и актуальна ли?

- **Существует** на обоих remotes.
- **Не является** лучшей единой основой для нового этапа: release-ветки **опережают** integration по продуктовым fix-pass; integration документирует immutable runtime **`ad9349b` / `ecc79832`**, тогда как release tips **`e245fee` / `bf2081d`**.
- Использовать integration как **источник идей и migration manifest**, не как автоматический deploy tip.

---

## 3. Что опубликовано / подготовлено / устарело

### 3.1 Production и hosting (документ vs live)

| Утверждение | Источник | Степень доказательства |
|-------------|----------|------------------------|
| Кабинет: `https://prof.remcard.ru`, BFF → `REMCARD_API_BASE_URL=https://remcard.ru` | `docs/reviews/PROF-V1-release.md` @ `e245fee` (SHA-256 файла: `d8eea470…`) | **HISTORICAL** (7 окт 2026) |
| Runtime SHA кабинета **`418aac7fcf2cd7e899de65d7652271f660901e73`**, backend **`94636ab4…`**, ветки release | тот же документ | **HISTORICAL** — **не совпадает** с текущим tip `e245fee` / `bf2081d` |
| Timeweb app `266285`, autodeploy **выключен** | тот же документ | **HISTORICAL** |
| Live `prof.remcard.ru` отдаёт Next.js HTML (HTTP 200) | `curl -sI` 2026-10-14 09:51 UTC | **NOT VERIFIED** business flows |
| Live HTML SHA-256 (`GET /`) | `6c5ed965bb8dd6842d91465c25e194b6e43ff13f8a862c18f4241d4106b6a19f` | **LIVE SAMPLE** (не привязан к git SHA) |
| Какой **git SHA** сейчас на Timeweb | — | **NOT VERIFIED** (нужен dashboard deploy / build label) |

### 3.2 Безопасные live-probes (2026-10-14)

| Probe | Результат |
|-------|-----------|
| `GET https://prof.remcard.ru/api/remcard/api/auth/me` + Origin `https://prof.remcard.ru` | `{"user":null}` — **CODE REVIEW** BFF жив |
| `POST …/auth/logout` + Origin `https://evil.example` | **403** — origin gate работает |
| `GET https://prof.remcard.ru/login` | 200, Next chunks (без форм login) |
| `https://pro.remcard.ru/style.css` | пустое тело, SHA-256 `e3b0c442…` (empty) — **прототип static demo недоступен или сменил URL** |

### 3.3 Подготовленные релиз-кандидаты (код)

| Контур | Где | Статус |
|--------|-----|--------|
| PROF V1 screens (partners, profile, scanner, history, settlements, recommendations) | platform `origin/release/prof-v1-20261007` | **EXISTS** — CODE REVIEW |
| Theme + AppShell + notification bell slot | `src/components/layout/AppShell.tsx`, `ThemeToggle.tsx` @ release | **EXISTS** — CODE REVIEW; browser **HISTORICAL** (PROF-I reports) |
| PROF-I SQL + controlled apply scripts | navigator `feat/prof-i-integration`, `docs/PROF-I-RELEASE-MANIFEST.json` | **EXISTS** — rehearsal **HISTORICAL** на synthetic DB; production **NOT VERIFIED** |
| Staff partnership access fix | `fix/prof-staff-partnership-access` both repos | **PREPARED** — integration tests **HISTORICAL** (другой agent run), не в release tip |

### 3.4 Устаревшая документация в локальном checkout

| Path | Проблема |
|------|----------|
| `docs/STATUS.md`, `docs/SCOPE.md`, `docs/REUSE-MAP.md` @ `cursor/m1-foundation-aa2d` | дата **6 окт 2026**, M1-only; **не описывает** PROF V1 |
| `docs/SCOPE.md` @ release всё ещё заголовок «M1 → релиз» | частично устарел текстом, но release code шире |

---

## 4. Материалы эталона (прототип)

| Материал | Путь / URL | Найден в workspace? | SHA-256 / версия |
|----------|------------|---------------------|------------------|
| Perplexity Computer (актуальная ссылка от заказчика) | `https://www.perplexity.ai/computer/a/remcard-profile-copy-EYiz.5jWR6qh5jnqi7oQ_Q` | ❌ не скачан | **NOT VERIFIED** — нужен export/zip + checksum |
| Perplexity (в серии PROF-I) | другой id в `PROF-I-Cursor-implementation-series.md` | в git @ release | doc SHA-256: `30977fcf9b4fee859dcb7d05dfbd73bc4757f92a78d37e930f4d3dfea4e474cc` |
| Static demo `pro.remcard.ru` | CSS/JS из `docs/STATUS.md` (M1) | live CSS пустой 2026-10-14 | **NOT VERIFIED** как эталон |
| `RemCard-plan-realizatsii-LK.md` | — | **NOT FOUND** | — |
| `CURSOR-PROFILE-HANDOFF.md` | — | **NOT FOUND** | — |
| `QA-PROFILE.md` | — | **NOT FOUND** | — |
| User ZIP прототипа | — | **NOT FOUND** | не назначать эталоном без diff |

**Артеfact store** (`/cursor/stores/self/artifacts/`): скриншоты/smoke **HISTORICAL** (prof-i-e, team-prototype-smoke, profile-directions, partnership-access). Не переносить как TEST PASS текущего production.

---

## 5. Фактическая архитектура (release tips, CODE REVIEW)

```text
Browser (prof.remcard.ru)
  → Next.js App Router (remcard-partner-platform)
  → BFF GET/POST /api/remcard/[...path]
  → remcard-proxy allowlist (method + RegExp)
  → REMCARD_API_BASE_URL (production: https://remcard.ru)
  → Cookie: remcard-token (+ remcard-pro-branch для staff context)
  → Navigator API routes + Prisma + PostgreSQL
```

Ключевые файлы (platform @ `e245fee`):

- BFF: `src/app/api/remcard/[...path]/route.ts`, `src/lib/remcard-proxy.ts`
- Session: `src/lib/session.ts`, `src/lib/remcard-server.ts`
- Shell: `src/components/layout/AppShell.tsx`, `CabinetShell.tsx`, `CabinetAppShellClient.tsx`
- Auth UI: `src/app/login/page.tsx`, `src/app/onboarding/page.tsx`

Navigator @ `bf2081d`: auth `src/lib/proAuth.ts`, cabinet gate `src/lib/cabinetAccess.ts`, staff context `src/lib/proBranchContext.ts`, `src/lib/proContextRequest.ts`.

---

## 6. Auth, контекст, сохранённые части (owner lock)

### 6.1 Модель (NOT VERIFIED E2E на production)

- Сессия: JWT cookie **`remcard-token`**, BFF проксирует только allowlisted cookies.
- Mutating: **`Origin` === `NEXT_PUBLIC_APP_URL`** (проверено live 403 на чужой origin).
- SSR pages: `requireProPageUser` / `CabinetShell` → upstream `cabinet-readiness`, consents, onboarding gates (`src/lib/session.ts` @ release).

### 6.2 EXCLUDED из переработки (R00–Rxx по решению владельца)

**Не менять сценарии и серверные полномочия** (только аудит + регресс-план):

| Область | Platform (release paths) | Navigator API (release) |
|---------|--------------------------|-------------------------|
| Команда / приглашения / права | `ProfileTeamSection.tsx`, `ProfileTeamInviteWizard.tsx`, `ProfileTeamPermissionMatrix.tsx`, `ProfileTeamMemberEditor.tsx` | `/api/pro/invites`, `/api/pro/organization/employees-overview`, `/api/pro/organization/team-members/*`, permission-templates |
| Филиалы | `ProfileBranchesSection.tsx`, `ProfileBranchDetail.tsx`, `ProfileBranchContextSwitcher.tsx` | `/api/pro/organization/branches`, `/api/pro/context` PATCH |
| Уведомления (inbox + настройки) | `ProfNotificationBell`, `/notifications`, `NotificationSettingsPanel.tsx` | `/api/pro/notifications/*`, `/api/pro/notification-settings/*` |

Регрессионный минимум (для будущих релизов каркаса): owner invite wizard, HEAD_OFFICE + N филиалов scope headline, branch switch + reload, inbox mark read, **без** изменения матрицы прав.

---

## 7. Данные и финансы (NOT VERIFIED end-to-end)

| Тема | Находка @ release backend | Статус |
|------|---------------------------|--------|
| Источник обязательств | `Bonus` / store orders / partnerships — `src/lib/proSettlements.ts`, `bonusPayout.ts` | **CODE REVIEW** |
| UI взаиморасчётов | `SettlementsHub` → `GET /api/pro/wallet/settlements` | **EXISTS**; gate **`UserRole.PRO`** в route | **BLOCKED** для CLIENT staff без отдельного решения |
| Агент «только мне должны» | требует сверки с `authorizeSettlementWalletRead` / UI filters | **NOT VERIFIED** |
| XLSX полного отбора, multi-order payout, partial payout | в прототипе «планируется» (PROF-I series) | **NEW / product decision** |
| Бонусная программа vs кошелёк | bonus API отдельно от settlements UI | **ADAPT** — не смешивать с новым wallet-only UX |

Production migration state: **NOT VERIFIED**. Navigator `docs/PROF-I-RELEASE-MANIFEST.json` (@ integration) требует подтверждения PROF-H migrations on target DB.

---

## 8. Миграции и тестовый контур

| Проверка | Результат R00 |
|----------|----------------|
| `prisma migrate` / `db push` на любой БД | **NOT RUN** (запрещено) |
| PROF-I controlled apply rehearsal | **HISTORICAL** (integration docs) |
| Локальный stack (synthetic `remcard_prof_test`) | **NOT RUN** в R00 (checkout M1); команды — `docs/local-dev/README.md` @ release |
| `npm ci` / install | **NOT RUN** (не менять lockfiles) |

Рекомендуемый безопасный контур для R01+ (без выполнения здесь):

1. Checkout **`release/prof-v1-20261007`** + **`release/prof-backend-v1-20261007`** в чистых worktrees.
2. `DATABASE_URL` → **`remcard_prof_test`** only; отключить cron/delivery в env.
3. Navigator `:3001` + Platform `:3030`, `REMCARD_API_BASE_URL=http://127.0.0.1:3001`, `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3030`.

---

## 9. Доступные проверки R00

| Check | Result |
|-------|--------|
| `git fetch origin` both repos | **PASS** |
| Read release/integration/fix branches via `git show` / `ls-tree` | **PASS** |
| Live HTTP headers + BFF auth/me + origin 403 | **PASS** (limited) |
| Full browser auth, purchases, payouts | **NOT RUN** |
| Unit/integration test suite | **NOT RUN** |
| Perplexity prototype parity | **NOT VERIFIED** |
| Production deploy SHA | **NOT VERIFIED** |

---

## 10. Конкретные блокеры

1. **Нет зафиксированного эталона** (zip/export + SHA-256) — Perplexity URL alone не воспроизводим.
2. **Production runtime SHA** не подтверждён — doc `418aac7` vs git tip `e245fee`.
3. **Локальный checkout M1** — любая реализация R01 должна начинаться с checkout release tips, не с `cursor/m1-foundation-aa2d`.
4. **Расхождение release vs feat/prof-i-integration** — нельзя «просто merge integration».
5. **Settlements / wallet PRO-only** vs сотрудники и агенты — продуктовое решение + API scope.
6. **pro.remcard.ru static prototype** недоступен для checksum (пустой CSS) — визуальный diff NOT VERIFIED.
7. **Handoff/plan markdown** из списка заказчика не найдены — уточнить путь или приложить файлы.

---

## 11. Рекомендуемая основа для R01+

| Слой | Рекомендация | Почему |
|------|--------------|--------|
| Platform | **`origin/release/prof-v1-20261007` (`e245fee`)** | полный PROF UI, post-release fixes; впереди integration |
| Navigator | **`origin/release/prof-backend-v1-20261007` (`bf2081d`)** | согласованный backend tip |
| Cherry-pick кандидаты | `fix/prof-staff-partnership-access`, другие `fix/prof-*` по матрице | подготовленные потоки, не в release |
| Не использовать как tip | `feat/prof-i-integration` без rebase на release | отстаёт; migration docs — справочно |
| Прототип | pinned export после получения от владельца | блокирует визуальный sign-off |

---

## 12. Связанные документы R00

- `docs/prototype-migration/PARITY-MATRIX.md` — матрица функций
- `docs/prototype-migration/R01-SCOPE.md` — минимальный следующий выпуск
