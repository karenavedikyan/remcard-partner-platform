# PROF-F — приёмка (fix-pass)

## Ветки и база

| Репозиторий | Release base | Feature branch |
|-------------|--------------|----------------|
| remcard-navigator | `release/prof-backend-v1-20261007` @ `072ebfd` | `feat/prof-f-profile-catalog-team` |
| remcard-partner-platform | `release/prof-v1-20261007` @ `6afc65d` | `feat/prof-f-profile-catalog-team` |

| Репозиторий | HEAD feature (после fix-pass) |
|-------------|-------------------------------|
| remcard-navigator | `2908914` |
| remcard-partner-platform | `7b7502c` |

Карта переиспользования: [PROF-F-REUSE-MAP.md](./PROF-F-REUSE-MAP.md).

## Fix-pass: navigator

- **Каталог / черновик:** миграция `20261008193000_catalog_publication_draft` (`User`/`Organization`/`Branch`.`catalogDraft`). Для solo PRO: при `APPROVED && isPublic` правки публичных полей пишутся в `catalogDraft`, live-колонки не затираются; flush при submit; `unpublishFromCatalog`, `discardCatalogDraft`.
- **`PATCH /api/pro/profile`:** рабочий PATCH — только `city`, `partnerType`, `areas`; публичные поля — через catalog/draft; GET отдаёт `catalogPublication` и merged edit fields.
- **Readiness / partnership:** `soloWorkingProfileIncomplete`; `canAccessCabinet` для сотрудников; **REJECTED каталога не блокирует** частное партнёрство; inviter blocked / target deleted+blocked на invite.
- **Staff invite accept:** redirect на `/profile` при PROF origin.
- **Branch:** `PATCH .../branches/[id]` — `isActive` для владельца.
- **Тесты:** `catalogPublicationDraft.test.ts`, обновлены profile route mocks, `privatePartnershipEligibility`, `route.network` (branchId на partner row).

Production SQL / деплой: **не выполнялись**. Миграция только в репозитории + unit-тест парсинга черновика.

## Fix-pass: platform

- **Формы:** `ProfileEditor` — layout на `div`; `<form>` только у «Основных данных»; каталог, филиалы, команда — отдельные формы/секции (нет вложенных submit).
- **Сохранения:** `profile-working-save.ts` — PATCH только `city`/`partnerType` (+ org); публичные поля в каталоге; `unpublish` / `discardCatalogDraft`.
- **Каталог UI:** предпросмотр, снятие с публикации, черновик vs live, честная подсказка про `showFullName`.
- **Onboarding:** без обязательных специализаций/категорий; org POST без скрытых категорий.
- **Команда:** `employees-overview-types` + контрактный тест; `ProfileTeamSection` под реальный DTO (`myRole`, `summary.pendingInvites`, `branches[].pendingInvites`, `viewer`); invite URL + copy + revoke; роли по-русски.
- **StaffInviteAccept:** без owner-onboarding; mapping redirect PROF; 401 + retry preview/readiness.
- **Филиалы:** `ProfileBranchDetail` (legacy id через BFF); BFF `remcard-proxy-ids` + тесты CUID / `br_*` / traversal.
- **Session:** `isProfCabinetAllowed` учитывает `readiness.isEmployee`.

## Команды проверки (fix-pass, 2026-10-08)

```bash
# remcard-navigator
cd remcard-navigator
pnpm typecheck
pnpm exec vitest run --exclude '**/*.integration.test.ts'
pnpm exec vitest run src/lib/__tests__/catalogPublicationDraft.test.ts \
  src/lib/__tests__/privatePartnershipEligibility.test.ts
PLATFORM_INN=7707083893 PLATFORM_OGRN=1027700132195 NODE_ENV=production pnpm build
pnpm lint

# remcard-partner-platform
cd remcard-partner-platform
npm run test
npm run lint
NODE_ENV=production npm run build
```

Синтетические `PLATFORM_INN` / `PLATFORM_OGRN` — **только** для локальной production-сборки navigator в изолированном окружении, не для production env.

## Регрессии PROF-F (целевой прогон)

| # | Сценарий | Результат |
|---|----------|-----------|
| 1 | employees-overview DTO с филиалами — UI не падает | **PASS** (контрактный тест + переписанный `ProfileTeamSection`) |
| 2 | Независимые формы / рабочий PATCH без публичных полей | **PASS** (код + unit); браузерный DOM — **NOT VERIFIED** |
| 3 | Минимальная регистрация; private invite при REJECTED каталога | **PASS** (eligibility + onboarding tests); PG invite — **NOT VERIFIED** |
| 4 | Публичная карточка vs черновик / unpublish | **PASS** (server draft logic + unit); moderation E2E — **NOT VERIFIED** |
| 5 | StaffInvite: ссылка → новый CLIENT → accept без owner onboarding | **PASS** (код + component paths); полный browser — **NOT VERIFIED** |
| 6 | Legacy branch id BFF + proxy tests | **PASS** (`remcard-proxy.test.ts`); API с live DB — **NOT VERIFIED** |
| 7 | Старый кабинет remcard.ru | **NOT VERIFIED** (не поднимался параллельно в этой сессии) |

| Прочее | Результат |
|--------|-----------|
| PG integration (`remcard_prof_test`) | **NOT VERIFIED** |
| Браузер smoke 1440/390 | **NOT VERIFIED** |
| E2E moderation approve | **NOT VERIFIED** |
| Real bot E2E Telegram/MAX | **NOT VERIFIED** |

## Скриншоты

Не снимались: полный стек с `remcard_prof_test` в этой сессии не поднимался. Для staging: профиль (раздельные секции), публикация (черновик/предпросмотр), карточка филиала `br_*`, команда (ссылка приглашения), `/invite/accept` (guest + 401).

## Публикация / откат

1. Merge feature → release только после smoke на staging с тестовой БД и прогона миграции `catalogDraft` там же.
2. Откат: revert на `feat/prof-f-profile-catalog-team`; production не трогали.
3. Старый кабинет remcard.ru остаётся включён.

## Оставшиеся пробелы этапа (не «намеренные ограничения»)

- Полный transfer / редактирование permissions сотрудника в PROF UI — частично (revoke/suspend через существующие DELETE; расширенные экраны ещё на remcard.ru).
- Изоляция черновика каталога для **Organization/Branch** на всех PATCH-маршрутах — schema готова, основная логика на solo `User` profile.
- Parity smoke remcard.ru ↔ PROF и browser E2E — не закрыты в этой сессии.
