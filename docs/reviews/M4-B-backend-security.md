# M4-B: узкий backend/BFF-проход безопасности

Дата: 2026-10-07. База partner: `603717d`; база navigator: `556c7c8`.
Изменения в существующих [Draft #9](https://github.com/karenavedikyan/remcard-partner-platform/pull/9) и [Draft #676](https://github.com/karenavedikyan/remcard-navigator/pull/676).

## Изменения

- Backend: конкретная запись BotLoginCode погашается по ID, сессия строится по её identifier; неоднозначные активные совпадения отклоняются.
- Backend: сериализация принятия согласий по user/kind и защита выбранной версии от конкурентной публикации. ID/версия ответа принадлежат сохранённому согласию.
- BFF: POST account/consent требует непустой строковый legalDocumentId. Без ID кабинет не использует legacy-поведение основного сайта.
- BFF сохраняет body, передаёт 409 DOCUMENT_VERSION_MISMATCH без автоматического retry, сохраняет Origin/cookies/Basic Auth.
- Endpoint основного сайта сохраняет совместимость с опущенным ID; миграций и нового auth-контракта нет.

## Фактически выполненные проверки

| Контур | Результат |
| --- | --- |
| Partner unit/proxy | 148/148 PASS |
| Partner component | 8/8 PASS |
| Partner typecheck, lint, production build | PASS |
| Navigator целевые unit/mock | 23/23 PASS |
| Navigator PostgreSQL security/route concurrency | 9/9 PASS |
| Navigator typecheck, lint, production Next build | PASS; lint warnings вне изменённых файлов |

В PostgreSQL проверены совпадающие цифры разных пользователей, конкурентное погашение кода, восемь одновременных принятий (один Consent + один audit), повтор/отзыв, отсутствие документа и конфликт публикации версии.

Отдельная локальная PostgreSQL, только синтетика. Bootstrap тестовый, не production migration chain. Browser/bot E2E этим проходом не подтверждаются.

## M4-B остаётся незавершённым

Нужен следующий UI/приёмочный проход:
- восстановление AuthFlow после readiness/401/5xx без тупика и повторного погашения кода;
- сброс отметок принятия при смене legalDocumentId;
- проверка минимального onboarding разных типов партнёров;
- явная матрица readiness guards и совместимость основного сайта;
- новый браузерный прогон CLIENT и partial-error сценариев;
- отдельный тестовый бот и staging HTTPS.

Во время установки npm также предупредил об известной уязвимости зафиксированной Next.js 14.2.28. Версии зависимостей не менялись в узком проходе; проверка и обновление до подходящей исправленной версии должны быть выполнены отдельно до боевого запуска.

Merge/deploy не выполнялись. PR остаются Draft.
