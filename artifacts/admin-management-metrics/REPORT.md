# ADMIN-MANAGEMENT-METRICS-20261027 (PROF)

**Кандидат для независимой приёмки. Не публикация.**

## Refs

| | SHA / ref |
|---|---|
| База задачи | `8ed8ac3e79af912f81653b777c20dc6d5880fa3d` (`fix/admin-account-controls-20261027`, admin account controls сохранены) |
| Опубликованный PROF до задачи | `e7ca0b92b9cc51b01ae596f40124ee3dd777c65b` |
| Backend-зависимость | ветка `feat/admin-management-metrics-20261027` в `remcard-navigator` (overview + facets + session-visit) |
| Итоговая ветка | `feat/admin-management-metrics-20261027` (tip после push) |

## UI

- `/admin/partners` — `AdminPartnersMetricsBar`: типы (все/агент/…/unknown), компактные LIVE/демо/каталог/архив; «Найдено по фильтрам: N»; клик = фильтр.
- `/admin/overview` — 8 карточек + период 1d/7d/30d, MSK timestamp, ссылки в реестр/модерацию.
- `AdminHeader` — пункт «Обзор»; account controls **без изменений** (кандидат `4c577650`).
- `ProfAdminSessionVisit` — один POST session-visit при входе в `/admin/*` (mock в тестах через API client).

## Proxy

Добавлены: `GET /api/pro/admin/management/overview`, `POST /api/pro/activity/session-visit`.

## Тесты

```bash
npx vitest run \
  src/app/admin/AdminPlatformControls.test.tsx \
  src/components/account-session/AccountSessionMenu.acceptance.test.tsx \
  src/components/layout/ThemeToggle.test.tsx \
  src/app/admin/partners/AdminPartnersRegistryDisplay.test.tsx \
  src/app/admin/partners/AdminPartnersIndependentR3.test.tsx \
  src/app/admin/partners/AdminPartnersIndependentR4.test.tsx \
  src/components/auth/LoginExperience.admin-session.test.tsx
```

**44 passed**, 0 failed, 0 skipped.

`npm run build` — exit 0.

## Не проверялось здесь

Playwright 1440/375, две темы, ручной logout. Browser E2E overview с live backend — только через BFF к тестовому navigator.

## Запреты

Deploy, Timeweb, production env, PR — **нет**.
