# PROF-H — progress

## Git (H2)

| Repo | Base | Branch | HEAD (after H2) |
|------|------|--------|-----------------|
| remcard-partner-platform | `bb60c60` (`release/prof-v1-20261007`) | `feat/prof-h-profile-redesign` | _(see commit)_ |
| remcard-navigator | `9523dcd` (`release/prof-backend-v1-20261007`) | `feat/prof-h-profile-redesign` | _(see commit)_ |

H1 accepted: `49118cd` (docs), `96285e8` (overflow CSS).

## H2 — реализовано

- Отдельное хранение рабочих направлений и видимости на `User` (миграция `20261009_prof_h2_working_profile`).
- `GET/PATCH /api/pro/profile` → блок `workingProfile`; catalog PATCH не затрагивает working-поля (`splitProfilePatchBody`).
- `GET /api/pro/partner-taxonomy` — единый read-only справочник.
- Внутренний поиск: opt-in + legacy до первого explicit; фильтры `q`, `city`, `product`, `service`, `stage` (AND между группами).
- Platform: форма «Основные данные» (6 секций), picker, PartnersHub filters, overview «Поиск партнёров».
- Контракт: [PROF-H2-CONTRACT.md](./PROF-H2-CONTRACT.md)

## H1 mobile overflow (сохранено)

Метрики fixture 390×844: `innerWidth/clientWidth/scrollWidth/bodyScroll` = **390**.

## Проверки H2

| Команда | Exit | Результат |
|---------|------|-----------|
| platform `npm run test` | 0 | 66 tests PASS |
| platform `NODE_ENV=production npm run build` | 0 | PASS |
| navigator `npm run test` (workingProfile, partnershipSearchQuery, profH2 integration) | 0 | PASS (integration без seed users — см. NOT VERIFIED) |
| test DB migration execute | 0 | applied on `remcard_prof_test` |

## Browser (fixture UI)

| Файл | Viewport | Примечание |
|------|----------|------------|
| `/opt/cursor/artifacts/screenshots/prof-h2-basics-1440.png` | 1440×900 | layout + секции H2 |
| `/opt/cursor/artifacts/screenshots/prof-h2-basics-390.png` | 390×844 | overflow metrics 390/390/390/390 |

## NOT VERIFIED

- Сквозной сценарий A→B на test DB (нет пользователей `m2fix-master-search-0001` в текущей БД).
- Authenticated save/reload + partnership search с живым upstream на стенде.
- Partners `/partners` browser без сессии (403/upstream).

## H3+

Не начат.
