# PROF-F — приёмка (этап 1)

## Ветки и база

| Репозиторий | Release base | Feature branch |
|-------------|--------------|----------------|
| remcard-navigator | `release/prof-backend-v1-20261007` @ `072ebfd` | `feat/prof-f-profile-catalog-team` |
| remcard-partner-platform | `release/prof-v1-20261007` @ `6afc65d` | `feat/prof-f-profile-catalog-team` |

Коммиты этапа — см. `git log -1` на feature-ветках после push.

Карта переиспользования: [PROF-F-REUSE-MAP.md](./PROF-F-REUSE-MAP.md).

## Изменения API / правил (navigator)

- `privatePartnershipEligibility.ts` — допуск к **частному** партнёрству без `catalogStatus === APPROVED` (блок: REJECTED, не PRO, нет города/имени/типа, isBlocked).
- `partnershipLinkInviteShared.resolvePartnershipSides` — проверка accepter через eligibility.
- `POST /api/partnership/invite` — target через `canParticipateInPrivatePartnership`.
- Link-invite accept — без блокировки по PENDING каталога; интеграционный тест обновлён.

Схема БД / production-миграции: **не применялись**.

## Изменения UI / BFF (platform)

- `/profile` — секции: основные данные, филиалы, команда, публикация, уведомления.
- `profile-working-save.ts` — сохранение рабочего минимума без модерации.
- `ProfileCatalogSection` — добровольная публикация, черновик и отдельная отправка.
- `InviteLanding` — частное приглашение без требования модерации каталога.
- `/invite/accept` — принятие StaffInvite на PROF.
- BFF allowlist: branches `[id]`, employees-overview, invites, submit-for-moderation, `/api/invite/*`.

## Проверки

| Проверка | Результат |
|----------|-----------|
| platform `npm run test` (proxy + component) | **PASS** |
| platform `tsc --noEmit` | **PASS** |
| platform `npm run lint` | **PASS** (предупреждение react-hooks в AuthFlow — было) |
| platform `NODE_ENV=production npm run build` | **PASS** |
| navigator `pnpm test` privatePartnershipEligibility | **PASS** |
| navigator `pnpm typecheck` | **PASS** |
| navigator `pnpm lint` | **PASS** |
| navigator production `pnpm build` | **NOT VERIFIED** — `check-legal-env` требует PLATFORM_INN/PLATFORM_OGRN (синтетические legal-env в production не использовались) |
| PG integration link-invite | **NOT VERIFIED** — нужна `remcard_prof_test` на 127.0.0.1 |
| Браузер smoke 1440/390 (profile, catalog, branch, team) | **NOT VERIFIED** — нет поднятого полного стека с тестовой БД в этой сессии |
| E2E moderation API (черновик → approve) | **NOT VERIFIED** |
| E2E Telegram/MAX bot bind | **NOT VERIFIED** (не bot E2E) |

## Скриншоты

Не снимались в этой сессии (нет рабочего backend smoke). После деплоя на staging: профиль «Основные данные», CTA «Подготовить профиль к публикации», InviteLanding с «Заполнить профиль», `/invite/accept`.

## Публикация / откат

1. Merge feature → release только после PASS smoke на staging с тестовой БД.
2. Откат: revert коммитов на `feat/prof-f-profile-catalog-team` или не мержить в release; данных/миграций на production нет.
3. Старый кабинет remcard.ru остаётся включён — отключение отдельным этапом.

## Что мешает полностью отключить старый кабинет

- Полное управление сотрудниками (права, transfer, suspend) в PROF — пока список + invite; расширенные экраны на remcard.ru `/pro/organization`.
- Редактирование филиала `[id]`, архивирование, публичные контакты филиала — API allowlist частично; UI филиала на PROF — создание/список, без карточки филиала.
- Программы, сертификаты, лиды, проекты, лимиты — только в legacy `/pro/*`.
- Партнёрский поиск/каталог remcard.ru и модерация штаба — без переноса админки.
- Дублирующие URL входа и deep links в старые письма/боты на remcard.ru.
- Пока не доказан parity smoke, редирект всего PRO-трафика с remcard.ru на prof.remcard.ru рискован.
