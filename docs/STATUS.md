# Статус проекта remcard-partner-platform

Обновлено: 6 октября 2026 года (M3-A: рекомендации / QR-сертификаты).

## SHA источников

| Источник | SHA / версия | Примечание |
| --- | --- | --- |
| `remcard-partner-platform` | ветка `cursor/m3a-certificates-b3e3` (Draft PR #3, base M2) | M3-A |
| `remcard-navigator` main | `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` | Read-only, без изменений |
| Прототип | https://pro.remcard.ru/ | Design tokens |

## M3-A: реализовано

- [x] Раздел «Мои рекомендации» (`/recommendations`): список, пустое состояние, ошибка, повтор.
- [x] Создание (`/recommendations/new`): партнёры из `available-partners`, условия по категориям, срок, защита от двойного POST в UI.
- [x] Результат создания: карточка «Готово», QR, код, статус с сервера, копирование ссылки, share, PDF.
- [x] Карточка документа (`/recommendations/[id]`).
- [x] BFF allowlist: `available-partners`, `store/certificate/[cuid]`.
- [x] Предупреждение для test-only URL (localhost, pro.remcard.ru).
- [x] Навигация «Рекомендации» в sidebar.

## M2 (база)

- [x] Партнёры, приглашения, term-change (PR #2, SHA `0f1fa2c`).

## Проверки M3-A

| Проверка | Результат |
| --- | --- |
| `npm run test:proxy` | 51/51 |
| `npm run lint` | ok |
| `env -u NODE_ENV npm run build` | ok |
| curl: PROF create/list/detail | 201 / 200 / 200 |
| curl: outsider GET `/store/certificate/[id]` | 404 |
| curl: public `GET /certificate/[promoCode]` | 200, без issuerPercent |
| curl: PDF через BFF | 200, `%PDF-1.3` |
| Браузер: список, форма, карточка, mobile | см. артефакты PR |

## Ограничения тестовой среды

- Fixture `m1fix-store` в `available-partners` имеет `programReady: false` (`programMissing: publicLocations`) — партнёр магазина недоступен для создания; проверен self-scan PROF (`m1fix-prof`).
- Клиентская ссылка в тесте: `http://127.0.0.1:3001/certificate/...` — помечается UI как test-only.
- Fixture JWT ≠ OAuth; вход через бота отложен.
- Navigator baseline на пустой PostgreSQL — блокер из M1 (не снят).

## Не в scope M3-A

- Сканер, preview/order, начисления бонусов.
