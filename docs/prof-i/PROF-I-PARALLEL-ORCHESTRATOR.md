# PROF-I: параллельный запуск без конфликтующих записей

Это актуальное задание координатору Cursor. Оно заменяет только порядок, базирование рабочих веток и остановки между этапами из `PROF-I-Cursor-implementation-series.md`, а не продуктовые требования.

## Команда координатору

```text
Пользователь принял макет и разрешил реализацию независимых направлений параллельно. Выполни пакет PROF-I целиком до READY_FOR_OPERATOR_CHECK, без ожидания очередного пользовательского «начинай» между внутренними этапами.

Входные файлы:
- PROF-I-Cursor-implementation-series.md: детальные требования I1–I4;
- PROF-I-approved-prototype-reference.md: исходники принятого макета с индексом;
- этот файл: авторитетный граф зависимостей, права на запись, команды потокам.

Не вставляй 200КБ эталона в контекст каждого работника. Извлеки source blocks в локальную reference-папку один раз. Передай каждому только нужные пути и относящиеся к нему требования.

Стартовые SHA:
platform 2c752e32728b6f147e865bfd1175e20f708a3ddf;
navigator e7d1fd6c3e2ae1b33210d8ccb73280551f146b22.
Текущий production navigator runtime f900bcf9ac364dbd805a0dfe56253d39da257533.
Проверь remote и наличие исходных refs. Не включай случайные новые коммиты без анализа diff.

Создай отдельные worktree/ветки для каждого потока. Запусти A, B, C через доступный штатный механизм параллельных агентов Cursor. Это три разных исполнителя/процесса, а не три названия в одном последовательном плане. Максимум три активных coding-потока одновременно. Если окружение не поддерживает параллельных исполнителей, честно сообщи это в первом статусе, не изображай параллельную работу; подготовленные задачи всё равно не должны писать в одно дерево.

Граф:
A = тема и оболочка             ┐
B = inbox / PROF-G              ├─→ E: объединение → единственная общая приёмка
C = сотрудники / permissions ─→ D: выплаты ┘
D запускается сразу после принятого координатором C, не обязан ждать окончания A/B.
E начинается после A+B+C+D. Не проси пользователя подтвердить каждый внутренний этап.

Ветки:
A: feat/prof-i-theme (platform);
B: feat/prof-i-inbox (оба);
C: feat/prof-i-team-permissions (оба);
D: feat/prof-i-payouts от пары C (оба);
E: feat/prof-i-integration (оба).
Ветка docs/prof-i-parallel-handoff — только пакет задания, не runtime-база.

Изоляция:
- Каждый worker пишет только в собственный worktree; общий checkout не переключать.
- Свои build output/.next/Prisma generated client/логи. Не делить writable node_modules с генерируемым Prisma между разными schema.
- У B/C/D свои тестовые БД и порты. Если suite разрешает только remcard_prof_test, использовать разные loopback PostgreSQL instances/ports с этим именем, а не ослаблять safety guard.
- Создай WORKSTREAMS.md с ветками, каталогами, портами, БД и владельцами до запуска тестов. При недостатке RAM сериализуй тяжёлые сборки/браузер, а не всю разработку.
- Tests scripts не должны killall node, удалять чужой .next или чистить общую БД.
- Каждый поток пишет свой docs/PROF-I-{A|B|C|D}-REPORT.md. Общие PARITY/PROGRESS/HANDOFF пишет только координатор.

ОБЩИЕ ФАЙЛЫ
A владеет platform AppShell/layout/globals.css и theme provider. B даёт bell export и точный integration patch, но не переписывает AppShell поверх A.
C владеет общими permission/context helpers и API team/invite/store-order authorization. B владеет inbox helpers/event emission. Если обоим нужен один route, работники представляют минимальные патчи отдельных участков; итоговый route семантически собирает координатор.
prisma/schema.prisma, BFF allowlist, types.ts, test config, package/lock и application composition — shared merge boundary: локальные точечные изменения разрешены для сборки потока, финальное объединение делает только E. Никаких ours/theirs целиком и копирования старого schema/AppShell поверх нового.
Новые миграции: уникальные зарезервированные префиксы 20261012_prof_i_a_*, 20261013_prof_i_b_*, 20261014_prof_i_c_*, 20261015_prof_i_d_* (A обычно без БД). Старые применённые имена не менять. SQL и Prisma final schema должны совпадать после объединения.
Не выполнять ручные изменения общих файлов другого worktree.

КОНТРАКТ МЕЖДУ C И D
C первым фиксирует versioned docs/PROF-I-PERMISSIONS-CONTRACT.md: реальные action IDs/поля, scope, DTO, dependencies и authorization helper для конкретной выплаты. D не придумывает другую permission-модель.
C: payout flags CASH/TRANSFER default false у существующего staff; legacy owner-policy сохранена; canViewWallet не даёт выплату.
B: export/контракт emit payout notification передать D; при отсутствии готового B D использует текущий notify, описывает adapter integration point. Финальное подключение inbox делает E; нельзя вводить второй notification store.

Общие запреты:
Без main/release merge, force push/reset, PR, production DB/env/migrate/deploy, реальных выплат, реальных приглашений и рассылок. Можно feature commit+push и объединение только feature-веток.
Не подключать банк, полноценную 1С, чат или другие новые платформы. Не заявлять mock как production PASS.

Приёмка:
Каждый поток сам делает targeted тесты и исправляет свои воспроизводимые дефекты в этом же прогоне. Старый H полный набор не повторяет каждый работник.
Координатор проверяет branch SHA, diff границы, контракт и отчёт, не прогоняет заново весь набор принятого worker без изменения кода.
В E один полный релевантный прогон и один browser acceptance. После найденной ошибки повторяется затронутая часть; core security/finance изменения требуют соответствующей регрессии.
Остановить только опасную/заблокированную задачу, независимые работы продолжать.

Первый короткий статус: реально запущенные исполнители A/B/C и ветки, а не обещание запуска.
Финальный статус: согласованная SHA-пара integration, PASS/BLOCKED, миграции, внешние NOT VERIFIED, ссылки на доказательства. Не требуется серия промежуточных пользовательских согласований. Выпуск согласуем отдельно.
```

## Промпт A: тема и визуальная оболочка

```text
Ты поток PROF-I-A. Работай только в своём platform worktree/ветке feat/prof-i-theme от frozen platform base.
Выполни из I1: ТЕМА, ОСТАЛЬНОЙ ПРОФИЛЬ и shell visual parity. Не реализуй inbox, team DTO, платежи или navigator.
Источники: style.css, render() app.js, profile-v2*. Текущий globals.css уже содержит dark variables; добавь реальный переключатель в desktop/mobile topbar, init/persistence без flash/hydration ошибки, доступность, единые токены для кабинета.
Оставь ясную точку композиции для ProfNotificationBell от B, не fake bell. До интеграции отсутствие B не компенсируй самодельным store.
Согласуй с C только CSS tokens и layout primitives: C пользуется токенами, не меняет твой root theme.
Профиль не переписывай: сохрани working/catalog/branches сценарии. Планируемый импорт обозначить честно.
Targeted theme/shell tests, typecheck/build platform, screenshots 1440/390 light/dark, reload/navigation/storage-failure. Передай commit+report координатору; shared files/AppShell остаются твоим исходным вкладом для E.
```

## Промпт B: колокольчик, inbox и события

```text
Ты поток PROF-I-B. Свои worktree в обоих repo, ветки feat/prof-i-inbox от frozen bases.
Выполни из I1: REUSE PROF-G, КОЛОКОЛЬЧИК, относящиеся миграции и приёмку. Источники G platform6f660db0 / navigatorb005bc63; не копируй старую application shell поверх H.
ProfNotificationBell/Center/hook, API и event emitters делай end-to-end. AppShell интегрирует E; дай короткий patch с импортом/export, требованиями к token/styles и accessible mobile placement.
Поддержи cabinet gate, не переписывая permission helper C. При конфликте по одному route оставь узкий hunk и объясни, как совместить emit с C authorization в единой транзакции.
Обязательны org approve batch/reject, partnership reject, покупка+начисление, snapshot read-all, safe deep link, stale count, DB dedupe и rollback.
Дай D стабильный emit-контракт выплаты: payload из сохранённой операции, один recipient/eventId. Не делай выплату сам.
Изолированная PG suite и целевой browser на тестовом shell, оба viewport/theme через CSS tokens. Feature commit+push и отчёт координатору.
```

## Промпт C: команда и настраиваемые полномочия

```text
Ты поток PROF-I-C. Свои worktree обоих repo, feat/prof-i-team-permissions от frozen bases.
Выполни весь I2, кроме зависимости «ждать I1»: тема и inbox поступят отдельно. Сначала зафиксируй permissions contract, затем реализация и targeted acceptance.
Принятый эталон team-flex.js/css поверх team-v3.css; свободная должность, индивидуальные права, copy-only шаблоны, отдельные филиалы/офис, per-scope overrides, реальные invite/edit/accept flows.
Не бери глобальную роль MANAGER за источник всех полномочий. Платёжные флаги раздельны, default false у legacy staff, зависимость от scoped finance-read, scan/sale/payout не смешиваются.
Сохрани H5 partial revoke, sole manager, CLIENT readiness, branch context; добавь stale-invite защиту при снижении прав внутри оставленного филиала.
Разрешения на выплаты и защита существующих pay endpoints входят в C; новый payout UX/атомарный финансовый переход выполняет D на твоих commits. D не должен получить две несовместимые модели доступа.
Не меняй AppShell/global theme или inbox store. Все shared hunks документируй, не правь worktree A/B.
По готовности paired SHA+contract+tests передать координатору; это разрешает D начать автоматически.
```

## Промпт D: выплаты, после C

```text
Ты поток PROF-I-D. Стартовать только от завершённой пары C и его versioned permissions contract, в отдельных worktree feat/prof-i-payouts.
Выполни I3 целиком. Начисление при продаже и подтверждённая выплата — разные операции. Текущий API лишь фиксирует факт CASH/TRANSFER: UI не обещает банковский перевод.
Не создавай новую permission-модель; используй action/scope helpers C. Не давай агентские обязательства RemCard оплачивать магазину.
Один финансовый эффект при retry/concurrency, rollback без оплаты, audit actor/scope, существующие суммы сохраняются. Отказ бота после commit не возвращает ложную ошибку совершённой выплаты.
B может ещё работать: узкий notification adapter допускается, но интегратор E обязан подключить B и проверить event dedupe. Не дублируй inbox.
Своя тестовая БД, targeted PG/browser, SHA/report; production запрещён.
```

## Промпт E: интеграция и один общий прогон

```text
Ты координатор PROF-I-E. После A+B+C+D собери feat/prof-i-integration в обоих repo.
Рекомендуемый порядок: C, затем D (уже потомок C), затем B, затем A; platform AppShell должен содержать BOTH theme toggle и bell, не одно вместо другого.
Проверь merge-base перед каждым переносом, не дублируй C при вливании D. Shared files schema/BFF/types/package/test config/domain routes объединять по смыслу. Git чистый merge сам по себе не доказывает контракт.
Объедини Prisma/миграции, генерируемые типы, cabinet scope, payout emit и BFF. Проверяй авторизацию до чтения/мутации и событие только после успешного перехода.
Выполни I4, включая parity всех вкладок, один полный релевантный набор tests/build и один cross-feature browser сценарий.
Общие docs/progress/parity/handoff и итоговый manifest ведёшь только ты.
Ни deployment, ни release/main merge не выполнять. Завершить одной парой SHA и READY_FOR_OPERATOR_CHECK либо конкретным BLOCKED.
```
