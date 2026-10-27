# ADMIN-MANAGEMENT-METRICS-20261027-R2 (PROF)

**Кандидат для повторной независимой приёмки. Не публикация.**

## Refs

| | SHA / ref |
|---|---|
| Проверенный кандидат R1 | `1ad78052718ef31dfc3b336676264be560fd86b7` |
| Итоговый tip R2 | `fb08a319` (`feat/admin-management-metrics-20261027`) |
| Backend-зависимость | `feat/admin-management-metrics-20261027` в `remcard-navigator` |
| Release PROF | **не изменялся** (`e7ca0b92b9cc51b01ae596f40124ee3dd777c65b`) |

## Четыре блока приёмки

| Блок | Статус | Доказательство |
|---|---|---|
| 1. Счётчики / переходы | **closed** | `AdminPartnersClient` читает `registration`/`partnerType` из URL при первом рендере; independent test `registration=active` |
| 2. Периоды и графики | **closed** | Карточка «Завершённые регистрации» использует `selectedPeriod`; `MiniBars` + `seriesDaily.total`; подписи типов через `PARTNER_KIND_UI_LABELS` |
| 3. Активность кабинета | **closed** | `ProfPartnerSessionVisit` в `AppShell` для `user.role === "PRO"`; убран вызов из `/admin` layout |
| 4. «Штаб» | **closed (частично)** | UI не дублирует legacy stats; подписи coverage/historical demo; aligned counts приходят с backend overview/BFF |

## UI R2

- `/admin/overview` — период 1d/7d/30d, дневные мини-графики регистраций и PROF-активности, карточка публичного remcard.ru с честным статусом «нет учёта».
- `/admin/partners?registration=active` — фильтр применяется к первому запросу реестра.
- Account controls / admin header — без изменений относительно `8ed8ac3e`.

## Тесты

```bash
npx vitest run \
  src/app/admin/AdminPlatformControls.test.tsx \
  src/components/account-session/AccountSessionMenu.acceptance.test.tsx \
  src/components/layout/ThemeToggle.test.tsx \
  src/app/admin/partners/AdminPartnersRegistryDisplay.test.tsx \
  src/app/admin/partners/AdminPartnersIndependentR3.test.tsx \
  src/app/admin/partners/AdminPartnersIndependentR4.test.tsx \
  src/components/auth/LoginExperience.admin-session.test.tsx \
  src/app/admin/overview/AdminMetricsIndependentAcceptance.test.tsx
```

| Набор | Passed | Failed | Skipped |
|---|---:|---:|---:|
| Релевантные PROF + 3 independent UI | **47** | **0** | **0** |

`npm run build` — exit **0** (2026-10-27, cloud agent).

## Browser QA

Playwright/Comet 1440/375, две темы на поднятом локальном stack — **не подтверждено** в этом прогоне (ограничение sandbox → loopback). Не заменялось DOM-тестами за полную визуальную приёмку.

## Запреты

Deploy, Timeweb, production env, PR — **нет**.
