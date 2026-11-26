# Калькулятор дверей в кабинете партнёра (lk)

Ветка: `cursor/remcard-ebd7` (от `ref/door-calculator-lk-proto-20261126`, стартовый коммит патча `4fa0c751`).

## Что сделано

1. **Модуль расчёта** `src/lib/doorCalculator/` — перенос 1:1 с эталона (`calc`, `compare`, `constants`, `modelSource`, `offer`, `types`). На проде каталог пуст (`emptyDoorModelSource`), демо-модели только в тестах.
2. **Мастер и PDF** — `src/components/doorCalculator/`, маршруты `/doors-calculator` и `/doors-calculator/offer` в `CabinetShell` (ctx=lk: крошки «Кабинет › Калькулятор дверей», закрытие в `/`, блок «Данные заказчика»).
3. **Навигация** — пункт «Калькулятор дверей» (иконка двери) в `STORE_DESKTOP_NAV` / `COMPANY_DESKTOP_NAV`, фильтрация по `organization.storeCategories` / `partnershipPrincipalSide.storeCategories` и `navMode` business-store|company (`src/lib/door-calculator/access.ts`).
4. **Без категории «Двери»** — пункта нет; прямой заход показывает «Раздел недоступен для вашего профиля» (`DoorCalculatorUnavailable`).
5. **Мобильный вход** — строка на главной кабинета компании/магазина (`BusinessHomeDoorCalculatorEntry`) при тех же условиях.
6. **PDF-предложение** — предзаполнение из `GET /api/pro/profile` (организация / публичные контакты); пустые поля в контактах PDF скрыты; правки только в предложении.

## Отличия от прототипа (допустимые)

- Нет отдельной шапки/боковой колонки прототипа: используется существующий `AppShell` кабинета.
- Нижняя панель мастера сдвинута на ширину сайдбара (`--sidebar-width`); на узкой ширине — над мобильной нижней навигацией кабинета.
- Иконки шага — локальные SVG вместо `lucide-react` (зависимость не добавлялась).
- Скриншоты сняты на dev-странице с демо-каталогом для визуальной сверки; в проде каталог по-прежнему пуст.

## Тесты

```bash
npm run test:component -- src/lib/doorCalculator src/lib/door-calculator src/components/doorCalculator src/components/home/BusinessHomeDoorCalculatorEntry.test.tsx src/lib/business-nav/sections.test.ts
```

| Набор | Результат |
|-------|-----------|
| `doorCalculator.test.ts` (паритет) | 20/20 |
| UI мастер | 4/4 |
| Сравнение (hook) | 4/4 |
| Доступ / навигация | 5/5 |
| Мобильный вход / недоступность | 2/2 |
| **Всего** | **35/35** |

Контроль FLOWS: 900×2050×250 + 800×2050×120, Скандинавия 01, скидка 10 % → **49 050 / 44 145 / выгода 4 905**.

## Проверки

| Проверка | Результат |
|----------|-----------|
| `npm run lint` | OK (прежние warnings в других модулях) |
| `npx tsc --noEmit` | Ошибки только в `artifacts/door-calculator-reference/` и прежние вне области; новый код в `src/` собирается в рамках Next |
| `git apply --check` от `4fa0c751` | OK (`door-calculator-lk.patch`) |

## Артефакты

- `door-calculator-lk.patch` — полный дифф кода и тестов от `4fa0c751`
- `checksums.txt` — SHA-256
- Скриншоты `app-*` и эталоны `proto-*` (шаг 4, сравнение, предложение, 1440 и 390)

PR и деплой **не выполнялись** (по ТЗ).