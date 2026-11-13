# Матрица интеграции standalone → кабинет (прототип)

Ветка `design/partner-profile-preview-20261112`, только `design/general-prototype/`. Standalone **138** (`partner/legacy.html`) — архив, в навигацию кабинета не возвращаем.

| N | id | Файл | Точка входа в кабинете | store | company | specialist | agent | employee |
|---|-----|------|------------------------|:-----:|:-------:|:----------:|:-----:|:--------:|
| 139 | partner:certificate-guest | `partner/certificate.html` | Сертификат → «Посмотреть как клиент» | ✓ clients | ✓ | ✓ | ✓ | ✓* |
| 140 | partner:recommendation-guest | `partner/recommendation.html` | Сертификаты → гостевой макет рекомендации; TOC | ✓ | ✓ | ✓ | ✓ | ✓* clients |
| 141 | partner:assignment-guest | `partner/assignment.html` | **N/A** — нет R2 handoff в ЛК; только TOC | — | — | — | — | — |
| 142 | partner:observer-guest | `partner/observer.html` | Клиенты → наблюдение (гостевой макет) | ✓ | ✓ | ✓ | N/A | ✓* |
| 143 | partner:cooperation-detail | `partner/partner-cooperation-detail.html` | **Прямой первичный** путь: партнёры → готовый партнёр (embed 143); хаб `proto_standalone=143` | ✓ | ✓ | ✓ | ✓ | ✓* view |
| 144 | partner:purchase-detail | `partner/partner-purchase-detail.html` | Кошелёк → история (147) → покупка; хаб `proto_standalone=144` | ✓‡ | ✓‡ | ✓‡ | ✓‡ | ✓*‡ |
| 145 | partner:reward-receipt | `partner/partner-reward-receipt.html` | 147 → деталь начисления → **«Квитанция начисления»** (`wallet-open-receipt-145`) | ✓‡ | ✓‡ | ✓‡ | ✓‡ | ✓*‡ |
| 146 | partner:scan-transaction | `partner/partner-scan-transaction.html` | Сканер → «Макет оформления покупки»; хаб `proto_standalone=146` | ✓ scan/sale | ✓ | ✓ | **N/A** | ✓* |
| 147 | partner:wallet-history | `partner/partner-wallet-history.html` | Кошелёк → «Покупки и транзакции в разделе История»; хаб `proto_standalone=147` | ✓ ledger | ✓ ledger | ✓ bonus | ✓ bonus | ✓* ledger |

**Легенда**

- ✓ — маршрут через `data-action="proto-standalone:N"` / `proto-guest-preview:N` и opaque iframe (`cabinet_embed=1`).
- ✓* — только при демо-правах работодателя (как в книге 1…132); без прав — подсказка, без обхода R1/R2.
- † — устарело: 140/142 имеют явные точки входа в кабинете или TOC (см. строки матрицы).
- ‡ — в кошельке сохранены live-parity фильтры/реестр; standalone — слой согласования дизайна истории, не второй кошелёк.
- **N/A** — роль не использует сценарий в прототипе (обосновано в `PROTOTYPE-PAGES.md`).

## Техника

- Хост: `partner/cabinet-standalone-host.js` (+ CSS), портал на `document.body`, геометрия по **visual viewport** (не `scrollHeight` контента), прокрутка внутри iframe. До `embed-content-ready`: индикатор загрузки, повтор с новым session token (без закрытия кабинета), повторная отдача context до готовности дочерней модели.
- **Srcdoc boot** (`cabinet-standalone-srcdoc.js`): из HTML встраивания вырезаются `preconnect` и `stylesheet` на Google Fonts; локальные CSS/скрипты без изменений, системный fallback шрифт. Обычное открытие HTML вне srcdoc — с Manrope как в макете.
- Дочерний: `prototype-cabinet-embed.js` + `standalone-embed-role.js` — скрывает шапки, `postMessage` nav/back, **роль/права** (`embedActor`, `permissions`) для 143–147; URL несёт `embed_role` / `embed_employer`.
- Нумерация: при открытом embed `window.__protoCabinetEmbeddedPage` → бейдж **N** (страница хоста не перенумеровывается).
- Возврат: стек в `rcDemoMemory` (`proto_embed_return_stack`), кнопки «Назад»/«Закрыть» в shell.

## Аудит корневого `index.html`

Launch-карточки 143–147 и сканер ведут в кабинет с `proto_standalone=…`, не на голый standalone.

## Исключения (вне этого diff)

- Production `src/`, БД, публикация Cursor.
- **138** legacy — не интегрируется.
- Clients/admin каталоги — прежние frozen-маршруты.
