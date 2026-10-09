# PROF-H1 — progress

## Git

| | SHA | Branch |
|---|---|---|
| Base | `bb60c60` | `origin/release/prof-v1-20261007` |
| HEAD | `96285e8` | `feat/prof-h-profile-redesign` |

## Mobile overflow fix (390×844)

**Причина:** flex-полоса вкладок и grid-потомки с `min-width: auto` раздували intrinsic width (~634px) → `documentElement.scrollWidth` > viewport.

**Исправление (CSS only):**
- `ProfileEditor`: `.shell` → `grid-template-columns: minmax(0,1fr)`; `.sectionNav` + `.tabStrip` → `width:100%`, `min-width:0`; вкладки scroll только в `.tabStrip`
- Grid колонки: `minmax(0, …)` вместо фиксированных min 260px
- `ProfileOverviewSection.grid`: `minmax(0,1fr)` на брейкпоинтах
- `AppShell.content`, `PageHeading`: `min-width:0` для цепочки кабинета
- Dev-fixture `main`: `width:100%`, `min-width:0`, responsive padding

**Метрики после fix (fixture UI, viewport 390×844):**

| Страница | innerWidth | clientWidth | scrollWidth | bodyScroll |
|---|---:|---:|---:|---:|
| Обзор | 390 | 390 | 390 | 390 |
| Основные данные | 390 | 390 | 390 | 390 |

Раннее утверждение «overflow отсутствует» только по `clientWidth` было **неверным** (было `scrollWidth` ≈ 666 при `clientWidth` 390). Сейчас **scrollWidth = clientWidth = 390**.

## Fix-pass (ранее)

Dirty basics, `router.push` + history, обзор по saved profile, счётчики SOLO/403, Vitest 66 + proxy 228.

Backend, API, permissions, moderation lifecycle **не менялись**.

## Проверки (факт)

| Команда | Результат |
|---|---|
| `npm run test` | PASS (228 proxy + 66 component) |
| `npm run lint` | PASS (warning `AuthFlow.tsx`) |
| `NODE_ENV=production npm run build` | PASS |

## Browser screenshots (fixture UI)

| Файл | Viewport |
|---|---|
| `docs/screenshots/prof-h1-overview-1440.png` | 1440×900 |
| `docs/screenshots/prof-h1-basics-1440.png` | 1440×900 |
| `docs/screenshots/prof-h1-overview-390.png` | 390×844 |
| `docs/screenshots/prof-h1-basics-390.png` | 390×844 |

## NOT VERIFIED

- Authenticated `/profile` в CabinetShell (метрики overflow; CSS цепочка `AppShell.content` обновлена)
- Real-auth E2E на стенде

## H2

Не начат.
