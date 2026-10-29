# Partners prototype-v1 — FLOWS (вне deployed assets)

База frontend: `release/prof-v1-20261007` @ `1d9bbeb6332b68ba4421a299c1b6b5e3dfe8dd1e`  
Task branch: `feat/partners-prototype-v1-20261029`  
Reference snapshot (запрошен): `reference/prototype-20261029` @ `4ba2f9e764b412e956e2ccb619ebbcab7d76a006` — **недоступен** (нет read к `remcard-navigator`).

## Baseline существующих flows (до правок)

1. `/partners` → `resolvePartnersHubPresentation` → shared-r04 shell (`AgentPartnersHub`) или legacy `PartnersHub`.
2. Список партнёрств: `GET /api/partnership/list` (+ listVisibility archive/hidden).
3. Поиск: `GET /api/partnership/search?role=&q=&city=&product=&service=&stage=&partnerType=&cursor=`.
4. Приглашение: `POST /api/partnership/invite` (terms / cooperationRequest).
5. Ссылка: `GET/POST /api/partnership/link-invite`, discussion: `GET/POST/DELETE /api/partnership/discussion-invite`.
6. Действия: `PATCH /api/partnership/:id`, term-change routes.
7. Справочник: `GET /api/pro/partner-taxonomy`.

Staff invites / employee form — вне scope (не менялись).

## Целевые сценарии (reference-led contract)

### A. Мои партнёры — компактный toolbar
- Одна строка: поиск своих партнёров · «Фильтры» · неброский список/карточки.
- В «Фильтры»: тип, специализация, город, этап, архив, сортировка.
- Одинаковая семантика фильтров в list и cards.
- Имя → детали; основные workflow-действия inline (уже на базе partner-row-actions).
- Состояния: действующие / ожидающие / обсуждаемые / архив / скрытые.

### B. Найти партнёра — витрина
- Модалка: «Найти в RemCard» | «Пригласить по ссылке».
- Путь ремонта из этапов taxonomy (ожидается 12 в live справочнике).
- Выбор этапа сбрасывает направление/специализацию.
- Счётчики только из full matching facets; иначе честный gap (не page length, не demo 7/5/7).
- Карточки с содержанием + «Пригласить».

### C. Приглашение — wizard 3 шага
1. Партнёр — получатель, взаимность vs agent one-way, категории/запрос условий.
2. Сообщение — одно поле + шаблоны «Коротко» / «По-деловому» / «По-дружески»; свой текст при возврате; замена dirty — confirm; смена получателя чистит условия.
3. Проверка — текст, условия отдельно, путь; отправка только финальной кнопкой + Idempotency-Key.

### D. Regression (затронутые)
- Accept/reject/cancel/counter/term-change/list preferences — без изменения контракта.
- Link/discussion invite panels — без staff invites.

## QA запреты
- Не отправлять реальные приглашения (wizard `disableSubmit` в тестах; live QA — только read / fixtures).
- Не трогать Седа/ОПТОВИК partnership данные.
- Нет DB writes / deploy / merge release.
