# Калькулятор дверей в кабинете партнёра (lk)

**Итоговый коммит (HEAD ветки):** `8e5ec672` (ветка `cursor/remcard-ebd7`, база `ref/door-calculator-lk-proto-20261126`, патч от `4fa0c751`).

## Что сделано

1. **Модуль расчёта** `src/lib/doorCalculator/` — перенос 1:1 с эталона; на проде каталог пуст, демо-модели только в тестах.
2. **Мастер и PDF** — `/doors-calculator`, `/doors-calculator/offer` в `CabinetShell`; на странице предложения нет демо-метки «Макет PDF · RemCard».
3. **Доступ** — калькулятор для любого пользователя в рабочем контексте организации типа магазин/компания с категорией «Двери» (владелец и сотрудник, без отдельных прав). Условие: `navMode` business-store|company и `doors` в `organization.storeCategories` (или `partnershipPrincipalSide.storeCategories`).
4. **Навигация и главная** — пункт меню и строка на главной (`showDoorCalculatorEntry`) в том числе для `org-staff-view`; вход вынесен над блоком метрик/пустого состояния, чтобы сотрудник видел его сразу.
5. **PDF** — предзаполнение из `GET /api/pro/profile`, пустые контакты в PDF скрыты.

Справочная папка `artifacts/door-calculator-reference/` **удалена** из ветки (ломала `tsc`).

## Тесты

```bash
npm run test:component -- \
  src/lib/doorCalculator src/lib/door-calculator \
  src/components/doorCalculator \
  src/components/home/BusinessHomeDoorCalculatorEntry.test.tsx \
  src/components/home/BusinessOwnerHomeDashboard.staff-view.test.tsx \
  src/lib/business-nav/sections.test.ts
```

| Набор | Результат |
|-------|-----------|
| Паритет расчёта | 20/20 |
| UI мастер | 4/4 |
| Сравнение | 4/4 |
| Доступ (владелец, сотрудник, без категории, мастер, агент) | 6/6 |
| Главная сотрудника / недоступность | 3+2 |
| **Итого по калькулятору** | **38/38** |

Контроль FLOWS: **49 050 / 44 145 / выгода 4 905**.

## Проверки

| Проверка | Результат |
|----------|-----------|
| `npm run lint` | OK |
| `npx tsc --noEmit` | OK |
| `git apply --check` от `4fa0c751` | OK (`door-calculator-lk.patch`) |
| `sha256sum -c artifacts/door-calculator-lk-20261126/checksums.txt` (из корня репозитория) | OK |

## Артефакты

- `door-calculator-lk.patch` — только код и тесты (`: !artifacts`)
- `checksums.txt` — пути от корня репозитория
- Скриншоты `app-*`, эталоны `proto-*`

PR и деплой **не выполнялись**.