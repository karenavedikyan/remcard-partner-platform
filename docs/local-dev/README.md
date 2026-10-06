# Локальный тестовый backend для M1

Инструкция для изолированной проверки BFF кабинета рядом с `remcard-navigator` **без production** и без копирования приватного кода navigator в этот публичный репозиторий.

## Что понадобится

- Node.js 22+, pnpm 12.8.1 (navigator), npm (кабинет)
- Локальная PostgreSQL, слушающая только loopback
- Отдельная read-only копия `remcard-navigator` на SHA `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7` или актуальном `main`
- Новые локальные секреты; **не** импортировать production `.env`, дампы или JWT

## PostgreSQL

```bash
sudo apt-get install -y postgresql
sudo pg_ctlcluster 16 main start
sudo -u postgres createuser remcard_test
sudo -u postgres createdb remcard_prof_test -O remcard_test
```

Проверьте `listen_addresses = '127.0.0.1'` и задайте пароль пользователя `remcard_test` локально (значение держите вне Git).

## Navigator (backend, 127.0.0.1:3001)

1. Скопируйте `docs/local-dev/env.navigator.example` в `.env.local` **внутри checkout navigator** (файл не коммитить).
2. Заполните `DATABASE_URL`, `JWT_SECRET`, `STAGING_AUTH_USER`, `STAGING_AUTH_PASSWORD` новыми локальными значениями.
3. Перед миграцией убедитесь, что host = `127.0.0.1` или `localhost`, имя БД = `remcard_prof_test`.
4. Установите зависимости и поднимите dev-сервер:

```bash
cd /path/to/remcard-navigator
pnpm install
./node_modules/.bin/prisma db push   # см. docs/reviews/M1-schema-bootstrap-diagnosis.md
pnpm exec next dev -H 127.0.0.1 -p 3001
```

Рекомендуемые флаги безопасности для теста:

- `REMCARD_DEPLOYMENT=staging` — включает Basic Auth и блокирует bots/webhooks/cron
- `REMCARD_CRON_ENABLED=false`
- bot/webhook/S3/production tokens **не задавать**

## Fixtures

После применения схемы выполните seed **только** в `remcard_prof_test`:

```bash
psql "$DATABASE_URL" -f /path/to/remcard-partner-platform/scripts/local/seed-m1-fixtures.sql.example
```

Скрипт сам прерывается, если имя БД или host не соответствуют loopback-тесту. Повторный запуск идемпотентен (`ON CONFLICT`).

Fixture userId для PROF: `m1fix-prof-0000000000001`. JWT для проверки сессии выпускается локально с тем же `JWT_SECRET`, что и navigator; это **не** проверка OAuth.

## Partner cabinet (127.0.0.1:3000)

1. Checkout ветки `cursor/m1-foundation-aa2d`.
2. Скопируйте `docs/local-dev/env.partner.example` в `.env.local`.
3. Задайте:

```text
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
REMCARD_API_BASE_URL=http://127.0.0.1:3001
REMCARD_API_BASIC_USER=<тот же staging user>
REMCARD_API_BASIC_PASSWORD=<тот же staging password>
```

**Не** вставляйте credentials в `REMCARD_API_BASE_URL` — Node.js fetch их отклоняет; Basic Auth передаётся только через server env.

```bash
cd /path/to/remcard-partner-platform
npm ci
npm run dev -- -H 127.0.0.1 -p 3000
```

## Проверки BFF

```bash
# auth/me через BFF (нужен fixture JWT в cookie remcard-token)
curl -H "Cookie: remcard-token=<fixture-jwt>" http://127.0.0.1:3000/api/remcard/api/auth/me

# logout
curl -X POST -H "Origin: http://127.0.0.1:3000" -H "Cookie: remcard-token=<fixture-jwt>" \
  http://127.0.0.1:3000/api/remcard/api/auth/logout
```

## Ограничения

- Адреса `127.0.0.1:3000/3001` доступны **только внутри вашей dev/Cloud Agent VM**, не на машине пользователя автоматически.
- Fixture JWT подтверждает серверную сессию, **не** настоящий вход через VK/Telegram/MAX/Yandex.
- Для полного OAuth нужны тестовые callback URL и секреты провайдера; временные cookies navigator (`oauth_vk_state`, `oauth_yandex_state`, `oauth_pending_consents`) в BFF пока **не** проксируются.
- Штатный `prisma migrate deploy` на пустой БД navigator может не пройти; см. диагностику схемы.
