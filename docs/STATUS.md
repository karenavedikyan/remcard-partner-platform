# Статус проекта remcard-partner-platform

Обновлено: 7 октября 2026 года (PROF V1 release).

## Текущий выпуск PROF V1

Кабинет развёрнут в Timeweb App Platform, приложение `266221`, тариф
510 ₽/месяц. Целевой домен: https://pro.remcard.ru.
Повторный deploy после подключения домена завершён успешно на том же SHA.
HTTPS на техническом адресе возвращает 200, но HTTPS `pro.remcard.ru`
пока отклоняется с TLS internal error: публичный запуск на целевом домене
ещё не завершён. DNS и привязка подтверждены; требуется исправление SSL
на стороне Timeweb. Не считать этот статус полной production-приёмкой.

- Кабинет: `release/prof-v1-20261007`, runtime SHA `418aac7fcf2cd7e899de65d7652271f660901e73`.
- Backend: `release/prof-backend-v1-20261007`, runtime SHA `94636ab4ecc4ea377b5a543aac85c6c8ea5011f3`.
- Backend использует существующую production-БД. Перед изменением создан backup;
  применена только additive migration идемпотентности, без baseline/reset/fixtures.
- Next.js кабинета обновлён до 15.5.27; async request API адаптированы.
  Локальные проверки: 163 unit/proxy + 21 component PASS, production build PASS,
  `npm audit --omit=dev`: 0 известных уязвимостей на дату проверки.
  Это не утверждение об аудите всех зависимостей существующего backend.
- PR #1–#9 и navigator #673–#676 не объявляются слитыми:
  выпуск сделан из отдельных release-веток с принятыми изменениями.
  Автодеплой отключён. Не развёртывать старый `main` поверх выпуска.
- Первый реальный вход с кодом действующего бота и пользовательское принятие
  согласий ещё требуют подтверждения пользователем. Production-покупки и
  фиктивные аккаунты при запуске не создавались.

Сведения для сопровождения и отката: `docs/reviews/PROF-V1-release.md`.
Разделы ниже сохраняют историю этапов, а не текущий запрет на развёртывание.

## Дополнение: узкий backend-проход безопасности

Поверх `556c7c8` (navigator) и `603717d` (partner) исправлены привязка
входа к конкретной записи BotLoginCode, конкурентное принятие согласий
и фиксация версии документа. Кабинет требует legalDocumentId на BFF.

Проверки: navigator 32/32 целевых теста (9 PG), partner 148/148 unit/proxy
и 8/8 component; typecheck/lint/production Next build обоих приложений PASS.
Подробности и ограничения: `docs/reviews/M4-B-backend-security.md`.
**M4-B fix-pass #3:** displayName dirty guard, session recovery returnTo без /onboarding wrapper.
Browser 401→re-login→/scanner E2E **PASS** (desktop+mobile; `./scripts/local/run-m4b-browser-401.sh`, reset per pass). Bot E2E NOT VERIFIED.

## SHA / ветки / PR

| Источник | SHA / ветка | PR |
| --- | --- | --- |
| M4-D navigator | `7eca04e` · `cursor/m4d-history-staff-b3e3` | Draft **#675** |
| M4-D partner | `7d35896` · `cursor/m4d-history-staff-b3e3` | Draft **#8** |
| M4-B navigator | `556c7c8` · `cursor/m4b-auth-onboarding-b3e3` · base M4-D | Draft **#676** |
| M4-B partner | `cursor/m4b-auth-onboarding-b3e3` · base M4-D | Draft **#9** (UI recovery push) |
| M4-B navigator | `15abd7c` · `cursor/m4b-auth-onboarding-b3e3` · base M4-D | Draft **#676** |
| Цепочка PR #1–#8+ | M1 → … → M4-B | open, не слиты |

## M4-B (auth/onboarding, Draft #9 / #676)

- AuthFlow recovery: session check on /login, retry без повторного verify-code, blocked/retry states
- Consent UI: checkbox = kind + legalDocumentId, 409 → reload + re-accept
- Onboarding: partnerType MASTER/STORE/COMPANY; stages только MASTER; storeCategories для магазина
- Backend ( #676 ): claimBotLoginCode, consent serialization, BFF legalDocumentId, store gate — без отката
- Отчёт: `docs/reviews/M4-B-auth-onboarding.md`
- **Bot E2E: NOT VERIFIED** · **Next.js CVE — отдельный блокер**

## M4-D (final-fix, Draft)

- Единые права филиалов preview/POST/history через `certificatePartner.branchId`
- HistoryHub: `acceptedAccessDenied`, обновлённые empty-notes
- Browser NEW purchase E2E + HTTP staff/owner/idempotency
- Отчёт: `docs/reviews/M4-D-history-staff.md`

## M4-A: вердикт готовности к запуску

**К запуску на pro.remcard.ru не готов.** Каркас M1–M3-C согласован (118/118 тестов на M3-C), но обязательны: вход через бота в кабинете, server idempotency покупки, минимальные правки history API (orderId для store, staff scanner).

Полный отчёт: **`docs/reviews/M4-A-launch-readiness.md`**

### Блокеры (кратко)

| # | Блокер | Объём |
| --- | --- | --- |
| B1 | ~~Вход/регистрация PROF через бота~~ → M4-B Draft (bot E2E NOT VERIFIED) | Средний |
| B2 | Idempotency `POST /api/store/order` + race maxUsages | Средний |
| B3 | `bonus-list` без `orderId` → store deep link broken | Небольшой |
| B4 | Branch staff: preview 403, owner history miss | Небольшой–средний |
| B5 | Schema bootstrap на пустой PG (не блокер live prod DB) | Крупный |

### Следующие задания

M4-B (login) → M4-C (idempotency) → M4-D (history API) → M4-E (launch runbook).

## M3-C (завершено в #5)

- История покупок/начислений; strict bonusId links; date labels; source warnings
- Приёмка A/B/C на loopback: PASS (+ API limitations documented)
- `npm run test:proxy` 118/118; lint PASS; build PASS (`NODE_ENV=production`)

## Не в scope M4-A

Реализация исправлений, merge/deploy, production, DNS, боты, navigator commits.
