# Матрица интеграции standalone → кабинет (прототип)

Ветка `design/partner-profile-preview-20261112`, только `design/general-prototype/`. Standalone **138** (`partner/legacy.html`) — архив, в навигацию кабинета не возвращаем.

| N | id | Файл | Точка входа в кабинете | store | company | specialist | agent | employee |
|---|-----|------|------------------------|:-----:|:-------:|:----------:|:-----:|:--------:|
| 139 | partner:certificate-guest | `partner/certificate.html` | Сертификат → «Посмотреть как клиент» | ✓ clients | ✓ | ✓ | ✓ | ✓* |
| 140 | partner:recommendation-guest | `partner/recommendation.html` | TOC / гостевой контекст рекомендации | ✓ | ✓ | ✓ | ✓ | N/A† |
| 141 | partner:assignment-guest | `partner/assignment.html` | TOC / поручение (hash) | ✓ | ✓ | ✓ | N/A | N/A† |
| 142 | partner:observer-guest | `partner/observer.html` | Клиенты → наблюдение (гостевой макет) | ✓ | ✓ | N/A | N/A | ✓* |
| 143 | partner:cooperation-detail | `partner/partner-cooperation-detail.html` | Партнёры → карточка → «Актуальный макет условий»; хаб `proto_standalone=143` | ✓ | ✓ | ✓ | ✓ | ✓* |
| 144 | partner:purchase-detail | `partner/partner-purchase-detail.html` | Кошелёк → история (147) → покупка; хаб `proto_standalone=144` | ✓‡ | ✓‡ | ✓‡ | ✓‡ | ✓*‡ |
| 145 | partner:reward-receipt | `partner/partner-reward-receipt.html` | Цепочка 147 → начисление (встраиваемый переход) | ✓‡ | ✓‡ | ✓‡ | ✓‡ | ✓*‡ |
| 146 | partner:scan-transaction | `partner/partner-scan-transaction.html` | Сканер → «Макет оформления покупки»; хаб `proto_standalone=146` | ✓ scan/sale | ✓ | ✓ | ✓ | ✓* |
| 147 | partner:wallet-history | `partner/partner-wallet-history.html` | Кошелёк → «Покупки и транзакции в разделе История»; хаб `proto_standalone=147` | ✓ ledger | ✓ ledger | ✓ bonus | ✓ bonus | ✓* ledger |

**Легенда**

- ✓ — маршрут через `data-action="proto-standalone:N"` / `proto-guest-preview:N` и opaque iframe (`cabinet_embed=1`).
- ✓* — только при демо-правах работодателя (как в книге 1…132); без прав — подсказка, без обхода R1/R2.
- † — нет отдельной кнопки в ЛК: гостевой HTML для согласования и TOC; не дублируем в боковом меню.
- ‡ — в кошельке сохранены live-parity фильтры/реестр; standalone — слой согласования дизайна истории, не второй кошелёк.
- **N/A** — роль не использует сценарий в прототипе (обосновано в `PROTOTYPE-PAGES.md`).

## Техника

- Хост: `partner/cabinet-standalone-host.js` (+ CSS), врезка в `.shell .content`, `sandbox` iframe.
- Дочерний: `prototype-cabinet-embed.js` — скрывает шапки standalone, блокирует storage/History API, `postMessage` для nav/back.
- Нумерация: при открытом embed `window.__protoCabinetEmbeddedPage` → бейдж **N** (страница хоста не перенумеровывается).
- Возврат: стек в `rcDemoMemory` (`proto_embed_return_stack`), кнопки «Назад»/«Закрыть» в shell.

## Аудит корневого `index.html`

Launch-карточки 143–147 и сканер ведут в кабинет с `proto_standalone=…`, не на голый standalone.

## Исключения (вне этого diff)

- Production `src/`, БД, публикация Cursor.
- **138** legacy — не интегрируется.
- Clients/admin каталоги — прежние frozen-маршруты.
