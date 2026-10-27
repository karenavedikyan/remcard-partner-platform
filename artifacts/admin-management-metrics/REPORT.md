# ADMIN-MANAGEMENT-METRICS-20261027-R3 (PROF)

**Кандidat для повторной независимой приёмки. Не публикация.**

## Refs

| | SHA / ref |
|---|---|
| Проверенный R2 tip | `56463c492287ba884cd24c2ec8dd8d5c53d99450` |
| Backend R3 | `feat/admin-management-metrics-20261027` в `remcard-navigator` |
| Итоговый R3 tip | `feat/admin-management-metrics-20261027` (см. последний commit) |

## Три остатка R2 → R3

| Блок | Статус | Доказательство |
|---|---|---|
| 1. Реестр / URL | **unchanged (R2 closed)** | Регрессия 47 PROF-тестов |
| 2. BFF → consent | **closed** | `remcard-proxy`: `cookie-consent` только для `POST /api/pro/activity/session-visit`; `remcard-proxy.test.ts` (27 pass incl. consent forward) |
| 3. Сотрудник в кабинете | **closed** | `AppShell` монтирует `ProfPartnerSessionVisit` для CLIENT без staffRole; запись на backend привязана к employer PRO |

**Периоды/overview (R2):** без изменений; `AdminMetricsIndependentAcceptance` в регрессии.

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
| PROF регрессия + 3 independent UI | **47** | **0** | **0** |

BFF consent (node transport):

```bash
npx tsx --test src/lib/remcard-proxy.test.ts
```

**27 passed**, 0 failed.

`npm run build` — exit **0**.

## Согласие analytics в PROF

Браузер хранит `cookie-consent` (JSON, поле `analytics`). BFF пробрасывает **только** эту cookie на session-visit вместе с `remcard-token`; произвольные cookies не пересылаются. Без согласия backend возвращает `recorded: false`.

## Browser QA

Не подтверждена в этом прогоне (ограничение окружения).
