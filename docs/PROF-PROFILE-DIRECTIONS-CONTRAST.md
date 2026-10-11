# PROF: контраст выбранных направлений (ProfileDirectionsPicker)

## База

- Репозиторий: `remcard-partner-platform`
- Ветка: `fix/prof-profile-directions-contrast`
- Base (release tip): `c49fafabcaa5080d50233b229675595dd99f5747`
- Tested: `1b480a68a48575b5d25856ab1c8b4cdfb75d4534`

## Результаты browser (computed)

| Viewport | Theme | Chip contrast | Lead contrast |
|----------|-------|---------------|---------------|
| 1440 | light | 13.09:1 | 5.04:1 |
| 390 | light | 13.09:1 | 5.04:1 |
| 1440 | dark | 11.73:1 | 6.84:1 |
| 390 | dark | 11.73:1 | 6.84:1 |
| catalog 390 | dark | 11.73:1 | — |

Chip removal: 2 → 1. Long service label: no horizontal overflow @390 dark.

## Проблема

В «Чем вы занимаетесь» CSS-модуль ссылался на несуществующие `--color-surface-muted`, `--color-text-muted`, `--color-border`. В тёмной теме chip получал светлый fallback `#f4f6f8` при наследуемом светлом тексте — низкая читаемость подписи и ×.

## Исправление

- Chip: `background: var(--offset)`, `color: var(--ink)`, `border: var(--line)`; hover/focus-visible/disabled; перенос длинных подписей.
- Lead / empty / hint: `color: var(--muted)`.
- Регрессия: `ProfileDirectionsPicker.test.tsx` + пары `profileDirectionsChip` / `profileDirectionsLead` в `theme-contrast.ts` (hex как в `globals.css`).

## Проверка

```bash
pnpm exec vitest run src/components/profile/ProfileDirectionsPicker.test.tsx src/lib/theme-contrast.test.ts
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3022 pnpm run build
NODE_ENV=development pnpm exec next dev -p 3022
node scripts/prof-profile-directions-contrast-browser.mjs
```

Скриншоты: `/opt/cursor/artifacts/prof-profile-directions-contrast/`.

## Handoff (notification-links, без смешивания кода)

Скрипт `partnership-notification-deeplink-browser.mjs` проверяет login-gate и наличие `returnTo`, **не** выполняет вход и не открывает synthetic-партнёрство. `exit 0` с `SKIP_ALREADY_AUTH_OR_GATE` **не** считается полным E2E PASS — оставить для финального интеграционного smoke.

## Ограничения

Без PR/merge/deploy, без изменений реальных профилей, navigator/БД/API не трогались.
