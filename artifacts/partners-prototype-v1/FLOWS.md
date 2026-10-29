# FLOWS — Партнёры prototype-v1 (после reference-led продолжения)

Проверено локально на task-ветках. Production writes / real invites — не выполнялись.

## Список своих партнёров
1. Компактная строка: поиск / Фильтры / список|карточки.
2. Тип, специализация, архив, сортировка — в раскрываемых фильтрах.
3. Имя открывает детали; основные действия видны без «глаза».
4. Статусы: действующие / ожидающие / обсуждаемые / архивные — по backend status + list preferences.

## Витрина «Найти партнёра»
1. Боковой «Путь ремонта» (вертикальный маршрут + прогресс); на ≤760px — collapse summary.
2. Выбор этапа сбрасывает направление.
3. Счётчики — из `facets` полного matching set; page length не выдаётся за «Найдено».
4. Карточка: тип, направления, этапы, опубликованные условия (search DTO или certificate-program), «Подробнее», «Пригласить».
5. Stale/out-of-order: abort + sequence на поиск; taxonomy error не маскируется пустым успехом.

## Приглашение существующего партнёра (wizard 3 шага)
1. Партнёр → Сообщение (3 шаблона exact reference) → Проверка.
2. Опубликованные условия: search `publishedTerms` или GET certificate-program-summary; poolPercent = общий процент.
3. Агент: one-way; выбранные категории с % уходят в `terms`. Без % — `cooperationRequest`.
4. Неагент без % — `requestPartnerTerms` (не `cooperationRequest`).
5. Создание только финальной кнопкой; share-экран с recipient path (`/invite/...` или partnership deep-link).
6. Recipient reset только по `target.id`.

## Приглашение по ссылке (свободное имя)
1. PartnerLinkInviteWizard → discussion-invite API.
2. Share URL = previewPath получателя; staff invite не затронут.

## Регрессия / QA
- 4 типа через resolvePartnerKindUi adapter.
- Whitespace / XSS-like / 1000 chars / back / template confirm — unit tests.
- disableSubmit в QA; реальных POST в production нет.
