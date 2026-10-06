# Локальный тестовый backend для M1

Инструкция для изолированной проверки BFF кабинета рядом с `remcard-navigator` **без production** и без копирования приватного кода navigator в этот публичный репозиторий.

## (a) Proxy transport tests — без navigator и БД

Можно выполнить **сейчас**, только в checkout partner-platform:

```bash
cd /path/to/remcard-partner-platform
npm ci
npm run test:proxy
npm run lint
env -u NODE_ENV npm run build
```

Тесты используют локальный HTTP stub на `127.0.0.1`; production не вызывается.

## (b) Интеграционный smoke — если локальная тестовая БД уже создана

Требует заранее подготовленную PostgreSQL `remcard_prof_test` на loopback **и** уже применённую схему navigator (см. блокер (c)). Не импортировать production `.env`, дампы или JWT.

### PostgreSQL (loopback)

```bash
sudo apt-get install -y postgresql
sudo pg_ctlcluster 16 main start
sudo -u postgres createuser remcard_test
sudo -u postgres createdb remcard_prof_test -O remcard_test
```

Проверьте `listen_addresses = '127.0.0.1'` и задайте пароль пользователя `remcard_test` локально (значение держите вне Git).

### Navigator (backend, 127.0.0.1:3001)

1. Скопируйте `docs/local-dev/env.navigator.example` в `.env.local` **внутри checkout navigator** (файл не коммитить).
2. Заполните `DATABASE_URL`, `JWT_SECRET`, `STAGING_AUTH_USER`, `STAGING_AUTH_PASSWORD` новыми локальными значениями.
3. Перед seed убедитесь: host = `127.0.0.1` или `localhost`, имя БД = `remcard_prof_test`.
4. Установите зависимости **без изменения lockfile**:

```bash
cd /path/to/remcard-navigator
pnpm install --frozen-lockfile
```

Требуется **pnpm 12.8.1** (см. `packageManager` в navigator). Если `--frozen-lockfile` не проходит из‑за несовместимой версии инструмента, **остановитесь** и установите указанную версию через Corepack; не регенерируйте `pnpm-lock.yaml` и не меняйте версии зависимостей navigator.

5. Поднимите dev-сервер **только если схема уже применена** (см. (c)):

```bash
pnpm exec next dev -H 127.0.0.1 -p 3001
```

Рекомендуемые флаги безопасности:

- `REMCARD_DEPLOYMENT=staging` — Basic Auth, блок bots/webhooks/cron
- `REMCARD_CRON_ENABLED=false`
- bot/webhook/S3/production tokens **не задавать**

### Fixtures (идемпотентный seed)

```bash
psql "$DATABASE_URL" -f /path/to/remcard-partner-platform/scripts/local/seed-m1-fixtures.sql.example
```

Скрипт прерывается, если host/имя БД не соответствуют loopback-тесту.

Fixture userId PROF: `m1fix-prof-0000000000001`. Локальный JWT с тем же `JWT_SECRET` — **fixture-сессия**, не OAuth.

### Partner cabinet (127.0.0.1:3000)

```bash
cd /path/to/remcard-partner-platform
npm ci
# .env.local из docs/local-dev/env.partner.example
npm run dev -- -H 127.0.0.1 -p 3000
```

`REMCARD_API_BASE_URL` **без credentials**; Basic Auth — через `REMCARD_API_BASIC_USER` / `REMCARD_API_BASIC_PASSWORD`.

### Проверки BFF (fixture, не OAuth)

```bash
curl -H "Cookie: remcard-token=<fixture-jwt>" http://127.0.0.1:3000/api/remcard/api/auth/me
curl -X POST -H "Origin: http://127.0.0.1:3000" -H "Cookie: remcard-token=<fixture-jwt>" \
  http://127.0.0.1:3000/api/remcard/api/auth/logout
```

### M2: fixture-сессия (не login)

Публичный UI входа через бота **отключён** до подготовки запуска. Для проверки M2:

1. Сгенерируйте JWT в checkout navigator (локально, значение не коммитить):

```bash
cd /path/to/remcard-navigator
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({userId:'m1fix-prof-0000000000001',v:0}, process.env.JWT_SECRET, {expiresIn:'30d'}));"
```

2. Установите cookie `remcard-token` в браузере для `127.0.0.1:3000` или используйте curl (см. выше).

3. Дополнительный seed для приглашений M2:

```bash
psql "$DATABASE_URL" -f /path/to/remcard-partner-platform/scripts/local/seed-m2-partnership-invite.sql.example
```

Fixture JWT **не доказывает** настоящий вход. BFF `POST /api/auth/verify-code` остаётся в allowlist для будущего подключения.

## (c) Блокер: navigator на пустой БД

Штатные команды navigator **не проходят** на пустой PostgreSQL:

- `prisma migrate deploy` — нет baseline `CREATE TABLE "User"`
- `prisma db push` — падает на FK `BranchService.serviceId` (text) vs `Service.id` (uuid)

Подробности: `docs/reviews/M1-schema-bootstrap-diagnosis.md`.

**Не использовать** patched bootstrap SQL с пропущенными FK как штатную установку. Исправление baseline — отдельная задача в private repo navigator; вне scope partner-platform M1.

## Ограничения

- `127.0.0.1:3000/3001` доступны **только внутри dev/Cloud Agent VM**, не автоматически на машине пользователя.
- Fixture JWT ≠ настоящий OAuth/login.
- OAuth temp cookies navigator (`oauth_vk_state`, `oauth_yandex_state`, `oauth_pending_consents`) в BFF **не проксируются**.
