# Карта переиспользования: экран кабинета → backend RemCard

Дата: 6 октября 2026 года (обновлено после M3-B).

**Источники:** задание M1–M3, `docs/tasks/M1-unblock.md`, публичный static demo `https://pro.remcard.ru` (SHA-256 в `docs/STATUS.md`).

**Navigator:** read-only доступ через Cloud Agent Select Multiple; контрольная точка `e6696a44da93e8e1f2bee26d21c3e0f48ee5cbb7`. Auth/session сверены по `src/lib/proAuth.ts`, `/api/auth/me`, `/api/auth/logout`.

**Подключение:** кабинет → BFF `/api/remcard/*` → `REMCARD_API_BASE_URL` (только явно настроенный тестовый origin; production-default удалён). Cookie `remcard-token` не шарится между origin; прокси пересылает только allowlisted cookie.

---

## M3-B: Сканер и подтверждение покупки

| Действие кабинета | API | Роль / права | Входные данные | Серверные ограничения |
| --- | --- | --- | --- | --- |
| Открыть сканер | `GET /scanner` (UI) | `role === PRO` (SessionGate) | fixture JWT в cookie | Без сессии — SessionGate |
| Извлечь код из QR/текста | — (клиент `extractCertificateCode`) | — | URL `remcard.ru/certificate/{code}`, `127.0.0.1:3001/certificate/{code}`, path `/certificate/{code}`, promo as-is | **Не** fetch URL из QR; только извлечение кода |
| Предпросмотр документа | `POST /api/store/order/preview` | PRO; партнёр сертификата: `certPartner.storeUserId === user.id` | `{ certificateCode }` — qrCode или promoCode | Не создаёт Order/Bonus; проверяет status ACTIVE/USED_PARTIALLY, validUntil, partner match; иначе `{ allowed: false, message }` или 404 |
| Показ partnerCards в preview | (поле ответа preview) | Тот же | — | Публичные карточки партнёров из `buildPartnerCardModelsForCertificate` |
| Оформление покупки | `POST /api/store/order` | PRO; store user или branch employee org owner (`getProContext`) | `{ certificateCode, items: [{ category, categoryLabel, amount }] }` | `amount` — **сумма до скидки, ₽**, целые; скидка/бонус `Math.round` на сервере; категория из `certPartner.categories`; лимит usage; **нет idempotency key** |
| Сводка клиента | (ответ order) | — | — | `summary.totalAmount`, `discountAmount`, `issuerBonusAmount` / `proBonusAmount`, `isSelfScan` |
| Self-scan | тот же POST order | PROF = store partner | — | `isSelfScan: true` → issuer bonus 0, Bonus не создаётся |
| Чужой PRO | preview/order | staff без partner row | подмена certificateCode | preview: `allowed: false`; order: 400 «не партнёр» |
| Повтор покупки | POST order | — | новый запрос | **Дубли не защищены на сервере** — блокировка двойного клика на клиенте; при потере ответа — сообщение «Результат покупки не подтверждён…» |

**Navigator reference (read-only):** `src/app/store/scan/page.tsx`, `src/app/api/store/order/preview/route.ts`, `src/app/api/store/order/route.ts`, `src/lib/storeCertificateScan.ts` (GET scan — не используется UI scan page).

**BFF allowlist:** `POST /api/store/order`, `POST /api/store/order/preview` — `src/lib/remcard-proxy.ts`.

---

## Прототип: опубликованные материалы

| Материал | URL | SHA-256 (2026-10-06) | Использование M1 |
| --- | --- | --- | --- |
| Index / shell | https://pro.remcard.ru/ | `a0e5a3e…064ad5b` | Структура HTML: `#app`, `#overlays`, module entry |
| Основные стили | https://pro.remcard.ru/style.css | `736c343d…372ad81` | Токены в `src/app/globals.css` |
| Workflows CSS | https://pro.remcard.ru/workflows.css | `2494a765…0eb312d` | Референс сценариев (не подключён runtime) |
| Certificate CSS | https://pro.remcard.ru/certificate.css | `aa87dd68…fce5538` | Референс сертификата |
| Bundled app | https://pro.remcard.ru/app.js | `db7c157b…ccc671f` | Vite bundle; imports: `chunk-DXJUU3BS.js`, `chunk-TK7TMV34.js`, `chunk-KTYMGLZA.js`, … |

**Важно:** URL вида `cabinet.js`, `prof-program.js` отдают SPA fallback (тот же HTML, 855 B), а не исходные модули. Классы и сценарии (`prof-program`, `prof-profile`, `cabinet`, …) видны внутри `app.js`.

Demo-расчёты и mock-данные прототипа **не** переносятся как бизнес-логика.

---

## Сводная таблица

```text
Экран нового кабинета
→ существующий пользовательский сценарий
→ API / сервис
→ авторизация и права
→ необходимые зависимости
→ способ проверки
```

| Экран кабинета | Сценарий | API / сервис | Авторизация | Зависимости | Проверка |
| --- | --- | --- | --- | --- | --- |
| Вход | OAuth / telegram login | `GET /api/auth/me`; `POST /api/auth/logout`; провайдеры `POST /api/auth/*` (код не проверен) | Cookie `remcard-token` | `src/lib/proAuth.ts`, `src/app/api/auth/**` | Тестовый аккаунт + callback для кабинета через BFF |
| Регистрация | Регистрация PROF | `src/app/api/auth/**` (код не проверен) | `remcard-token` | Prisma User, ProProfile (код не проверен) | E2E в тестовом контуре |
| Главная PROF (M2) | Dashboard overview | `GET /api/partnership/list`, `GET /api/partnership/incoming-count` | PROF + cookie | `ProDashboardClient.tsx` (read-only ref) | Fixture-сессия, без mock-метрик |
| Профиль (M2) | Редактирование карточки | `GET/PATCH /api/pro/profile`; action `submitForModeration` | Authenticated (PRO fields) | `src/app/api/pro/profile/route.ts`, `src/app/pro/profile/page.tsx` | PATCH + reload |
| Вход M2 | Session gate | `GET /api/auth/me` | Cookie | — | Fixture JWT; bot UI отключён до запуска |
| Выход | Logout | `POST /api/auth/logout` | Активная сессия | — | POST через BFF; cookie cleared |
| Список партнёров (M2) | Partnership list | `GET /api/partnership/list` | `role === PRO` | `PartnershipListBlock.tsx` | BFF GET |
| Поиск (M2-fix) | Partner search | `GET /api/partnership/search?role=store\|pro` | PROF | `PartnerFindClient.tsx`, `search/route.ts` | store→MASTER/COMPANY; pro→STORE/MASTER/COMPANY; q=имя/организация |
| Приглашение (M2-fix) | Invite с явными terms | `POST /api/partnership/invite` | PROF | `PartnerInviteModal.tsx`, `invite/route.ts` tradeSideCategories | UI: все категории trade-side; general/10% только с подтверждением |
| Действия (M2) | Accept/reject/cancel/… | `PATCH /api/partnership/[id]` `{ action, terms? }` | Participant + PRO | `src/app/api/partnership/[id]/route.ts` | accept, reject, cancel, counter_offer*, pause, resume, terminate |
| Напоминание (M2) | Remind invite | `POST /api/partnership/remind` | Initiator | `remind/route.ts` | Не в UI M2 (API allowlisted) |
| Входящие (M2) | Badge count | `GET /api/partnership/incoming-count` | Soft auth | `incoming-count/route.ts` | Badge в sidebar |
| Условия — запрос (M2) | Term change | `GET/POST /api/partnerships/[id]/term-change` | Participant | `term-change/route.ts` | POST `{ changes: [{ category, newPercent }] }` |
| Условия — ответ (M2) | Approve/reject | `POST /api/partnerships/[id]/term-change/[requestId]/respond` | Participant | `respond/route.ts` | `{ action: approve\|reject }` |
| Мои рекомендации (M3-A) — список | PROF list own certs | `GET /api/store/certificate` | `role === PRO`; фильтр `certificateListWhereForProContext` | `route.ts`, `certificateProContextFilter.ts` | Только документы текущего PROF-контекста; не все сертификаты системы |
| Мои рекомендации (M3-A) — создание | PROF wizard (упрощён) | `POST /api/store/certificate` | `role === PRO`; issuer profile `programReady` или AGENT | `route.ts`, `CertificateWizard.tsx` (ref) | Body: `{ partners: [...] }`; **pool** = действующий `term.storePercent` (не pending term-change); UI распределяет pool между discount/issuer без clamp; превышение → ошибка + ссылка `/partners?terms=<id>` |
| Мои рекомендации (M3-A) — партнёры формы | Available partners | `GET /api/store/certificate/available-partners` | `role === PRO` | `available-partners/route.ts` | Активные партнёрства + self-scan; `programReady` / `programMissing` |
| Мои рекомендации (M3-A) — карточка | Detail by id | `GET /api/store/certificate/[id]` | `role === PRO`; `proUserId === user.id` | `[id]/route.ts` | 404 для чужого документа |
| Публичная карточка | Certificate by code | `GET /api/certificate/[code]` | Публичный (qrCode или promoCode) | `certificatePublicPayload.ts` | Без proUserId, issuerPercent, внутренних контактов |
| PDF | Download | `GET /api/certificate/[code]/pdf` | Публичный (promoCode предпочтительнее) | `[code]/pdf/route.ts`, `certPdfKit.ts` | GET → `application/pdf`; QR в PDF = `certificateUrl` |
| Клиентская страница | Public page | `{BASE}/certificate/{qrCode}` | Публичный | `buildCertificatePageUrl()` | BASE из `getCertificatePublicBaseUrl()` (env `APP_BASE_URL` на backend) |
| **Сканер (M3-B)** | Scan hub | `/scanner`, `ScannerHub.tsx` | PRO + SessionGate | `html5-qrcode`, `certificate-code.ts` | Desktop/mobile UI; камера — по клику |
| **Preview заказа (M3-B)** | Order preview | `POST /api/store/order/preview` | Store partner (PRO) | preview route | curl + браузер; не создаёт Order |
| **Покупка (M3-B)** | Place order | `POST /api/store/order` | Store + branch context | order route | curl: 1000₽ → disc 50, bonus 100 @ 5/10% |
| История начислений | Bonus history | `GET /api/bonus/history`; `GET /api/store/bonus-list` | PROF / store | bonus API | **Не в M3-B** |
| Баланс | Available bonuses | `GET /api/bonus/balance` | PROF | bonus API, cron (не из кабинета) | **Не в M3-B** |

---

## BFF allowlist (M1 + M2 + M3-A + M3-B)

Прокси разрешает только проверенные пары method+path (см. `src/lib/remcard-proxy.ts`):

- Auth: `GET /api/auth/me`, `POST /api/auth/logout`, `POST /api/auth/verify-code` (без UI бота в M2)
- Profile: `GET/PATCH /api/pro/profile`
- Partnership: `GET list|search|incoming-count`, `POST invite|remind`, `PATCH /api/partnership/[id]`
- Term changes: `GET/POST /api/partnerships/[id]/term-change`, `POST .../respond`
- Certificates (M3-A): `GET/POST /api/store/certificate`, `GET .../available-partners`, `GET .../[cuid]`, `GET /api/certificate/[code]`, `GET .../pdf`
- Store/order (M3-B): `POST /api/store/order`, `POST /api/store/order/preview`
- Bonus (allowlisted, UI вне M3-B): `GET /api/store/bonus-list`, `GET /api/bonus/balance|history`

Path traversal блокируется. Mutating — origin check.

Mutating-запросы: `Origin` обязан совпадать с `NEXT_PUBLIC_APP_URL` (null/чужой origin → 403). Cookie upstream: только `remcard-token`. Navigator OAuth cookies: `oauth_vk_state`, `oauth_yandex_state`, `oauth_pending_consents` — **не проксируются** (блокер полного OAuth через BFF).

---

## Минимальные адаптации backend (не применены)

| Изменение | Причина |
| --- | --- |
| CORS для `pro.remcard.ru` **или** only BFF | Браузер не вызывает remcard.ru напрямую |
| OAuth callback URI для кабинета | Провайдеры, вероятно, настроены на remcard.ru |
| CSRF/origin allowlist для BFF-origin | POST order, invite и др. |
| Cookie names для OAuth flow | Возможны temp cookies помимо `remcard-token` |
| **Idempotency-Key на POST /api/store/order** | Безопасный повтор при потере ответа — **блокер production** |

**Выбранный способ M1:** BFF в partner-platform. Backend-изменения — после согласования.

---

## Прототип vs production

| Материал | Источник | M1 |
| --- | --- | --- |
| CSS-переменные, Manrope | `style.css` | `globals.css` |
| Workflows / certificate CSS | live URLs | Документированы; не подключены |
| HTML/JS bundle | `app.js` + chunks | Референс; demo-логика не переносится |
| Закрытый repo прототипа | Не передан | Не блокирует токены/CSS из live demo |
