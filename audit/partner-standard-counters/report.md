# П — партнёрский кабинет: счётчики вкладок сертификатов

## Контекст

- База приложения: `290d18e5eb19b05fcd4c4159c64c2968ab352822`
- Backend (неизменён): `d2f5d9e0972efeb335ffde1c9844a5b29c6d5aac`
- Ветка работы: техническая ветка Cursor (не `release/prof-v1-20261007` как push-цель)

## Наблюдение

У STORE/COMPANY в списке есть строки, но вкладки «Активные» / «Архив» показывали «—», потому что `meta.activeCount` / `meta.archivedCount` брались только из `certificatesListKnownCountsFromApi`, который возвращает значения лишь при достоверном полном нуле (пустой список + все счётчики = 0).

## Контракт API (read-only)

`fetch*Certificates` возвращает `AgentR03ListMeta`: `activeCount`, `archivedCount`, `totalCount` (числа в типах; фактически приходят с BFF как числовые поля ответа списка).

## Исправление

В `AgentCertificatesList.tsx` добавлен локальный разбор `certificatesListTabCountFromApi`: принимает только конечные неотрицательные числа; иначе `null` (прочерк). `certificatesListKnownCountsFromApi` по-прежнему только для `knownListCounts` / empty-gate.

## Изменённые файлы

1. `src/components/agent-r03/AgentCertificatesList.tsx`
2. `src/components/agent-r03/AgentCertificatesList.P-StandardCounters.test.tsx`
3. `audit/partner-standard-counters/report.md`

## Тесты (vitest, адресные)

Команда: `npx vitest run src/components/agent-r03/AgentCertificatesList.P-StandardCounters.test.tsx`

| Сценарий | Результат |
|----------|-----------|
| STORE/COMPANY/SPECIALIST/AGENT непустой список | PASS |
| Достоверный ноль → onboarding, без тулбара | PASS |
| Malformed/partial meta → прочерки | PASS |
| Поиск: пустая выдача, ненулевые totals в meta | PASS |
| Переключение архива + `archived: true` в запросе | PASS |
| Race: устаревший ответ не затирает счётчики | PASS |

Фактический прогон: 12/12 PASS (`vitest` v3.2.7, 2026-11-14).

Браузер с полным перехватом API: не выполнялся (ограничение одного компактного vitest-набора); egress к production не использовался.

## Вне scope

Полный read-only сценарий без филиалов, scope/архив/корзина, partial/retry — следующий приоритет после приёмки, не делался.