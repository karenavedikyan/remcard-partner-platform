# ADMIN-MANAGEMENT-METRICS-20261027-R4 (PROF)

**Кандидат для независимой приёмки. Не публикация.**

## Refs

| | SHA / ref |
|---|---|
| Проверенный R3 tip | `a419bdfa8b57d3094a4a70b65e8a6c40df47b672` |
| Backend R3/R4 | `feat/admin-management-metrics-20261027` в `remcard-navigator` |
| Итоговый R4 tip | `feat/admin-management-metrics-20261027` (последний commit) |

## Два пункта R4

| Пункт | Статус | Доказательство |
|---|---|---|
| 1. Получение analytics consent пользователем | **closed** | `CookieConsentProvider` + `ProfAnalyticsConsentBanner` («Разрешить» / «Не сейчас») + `ProfAnalyticsConsentManage` (вкл/выкл); host-only `cookie-consent`; `ProfPartnerSessionVisit` реагирует на `state.analytics`/`decidedAt`, не one-shot при mount |
| 2. Штаб live-reg ссылка | **closed в backend** | Карточка в navigator admin → `/admin/partners?registration=active` (см. backend REPORT) |

### Поведение согласия (PROF)

- До выбора: баннер, `recordProfSessionVisit` не вызывается.
- «Не сейчас»: analytics=false, кабинет работает, записи нет.
- «Разрешить аналитику»: localStorage + `cookie-consent` cookie, BFF пробрасывает на session-visit, вызов `recordProfSessionVisit`.
- Смена через manage «Включить/Отключить» повторно триггерит/прекращает сигнал.
- Marketing opt-in не добавлялся; регистрационные согласия не считаются analytics.

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
  src/app/admin/overview/AdminMetricsIndependentAcceptance.test.tsx \
  src/components/consent/ProfAnalyticsConsentUserPath.test.tsx \
  src/components/layout/AppShell.test.tsx
```

| Набор | Passed | Failed | Skipped |
|---|---:|---:|---:|
| R3 регрессия + R4 consent UI (53) | **53** | **0** | **0** |

BFF: `npx tsx --test src/lib/remcard-proxy.test.ts` — **27 passed**.

`npm run build` — exit **0**.

## Browser QA

Не подтверждена (ограничение окружения). User-path покрыт component-тестами с реальными кнопками баннера/manage.
