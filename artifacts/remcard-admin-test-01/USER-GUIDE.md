# USER GUIDE — admin password and test users (prof.remcard.ru)

## Вход администратора

1. Откройте `/login`. Вкладка «Вход администратора» видна только при включённом флаге `PROF_ADMIN_PASSWORD_LOGIN_ENABLED`.
2. Логин и пароль выдаёт владелец платформы (staff ADMIN/OWNER). Обычные партнёры и ORG_OWNER компании не могут войти этим способом.

## Тестовые пользователи

1. После входа администратора: **Тестовые пользователи** в боковом меню кабинета или `/admin/test-users`.
2. Создайте тип (агент / специалист / магазин / компания), имя и город → **Создать**.
3. **Открыть ЛК** — делегированная сессия с баннером «Тестовый режим».
4. **Вернуться в управление тестами** — в баннере; при истёкшей сессии — повторный admin login.
5. **Сбросить профиль** — черновик агента и prefs; не трогает прочие данные вне scope reset.
6. **Отключить** — только test-marker; реальные пользователи не затрагиваются.

## Пароль администратора

`/admin/password` — смена пароля (≥12 символов), отзыв других admin-сессий.

## Ограничения тестового режима

В тестовом ЛК недоступны приглашения, заказы, публикация в каталог, staff-операции и прочие действия вне allowlist. Тестовые пользователи не показываются в публичном каталоге и partnership search.

## Локальная приёмка (оператор / разработчик)

Только loopback и отдельная БД `remcard_admin_test_012` (не production `DATABASE_URL`).

1. Поднять stack: `node scripts/admin-test-local-stack.mjs` (platform repo; требуются `JWT_SECRET` и loopback `DATABASE_URL`).
2. Прогон browser+BFF: `node scripts/admin-test-browser-lifecycle.mjs`.
3. Дополнительно direct HTTP: в navigator `pnpm exec tsx scripts/admin-test-012-lifecycle.ts`.

Артефакты: `artifacts/remcard-admin-test-01/browser-lifecycle.json`, `e2e-lifecycle-http.json`, скриншоты в `screenshots/`. Секреты и пароли в отчёты не включать.
