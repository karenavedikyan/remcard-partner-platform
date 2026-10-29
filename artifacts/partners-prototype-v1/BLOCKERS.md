# Blockers — Партнёры prototype-v1

## B1. Нет доступа к remcard-navigator (CRITICAL)

- `gh` / `git clone` → **404 Not Found**
- Environment repos: только `remcard-partner-platform`
- Недоступны:
  - `reference/prototype-20261029` @ `4ba2f9e764b412e956e2ccb619ebbcab7d76a006`
  - `docs/prototype-reference/current/partner/partners-redesign.js|css`, `roles.js|css`, `FLOWS.md`
  - Backend task branch `feat/partners-prototype-v1-20261029` / release `4b4c124…`
- Публичный эталон `https://lkdemo.pplx.app` → 404
- **Следствие:** pixel/copy parity с финальным redesign не подтверждена; шаблоны сообщений — по контракту задания (пометки в matrix). Backend gaps нельзя закрыть в разрешённой backend-области.

Запрос пользователю уже записан: `grant-navigator-repo-access`.

## B2. Search facets отсутствуют

`GET /api/partnership/search` без full-set facets → счётчики этапов/направлений не рисуются как числа; UI показывает gap copy, не demo 7/5/7 и не page count как «Найдено».

## B3. Published percents на search DTO

Без `publishedTerms` wizard честно включает `requestTerms` / cooperationRequest.

## B4. Type-unify ещё не принят Computer

Зависимость `feat/partner-primary-kind-unify-20261029` (fe `a140bc8…`) — не merge; adapter локальный.
