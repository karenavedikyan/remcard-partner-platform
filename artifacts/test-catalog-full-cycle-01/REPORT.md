# TEST-CATALOG-FULL-CYCLE-01 (frontend slice)

Baseline: `6e41d066c80bcc4028d3503b5d571169404c3d24` + merged `fix/catalog-photo-preview-01` (`69fe084a`). Branch: `fix/test-catalog-full-cycle-01`.

## Changes

- **`/admin/test-users`** — row shows «Тестовый партнёр», catalog moderation status, public link when live; actions **«Разрешить/Скрыть на remcard.ru»** (confirm, busy state) via `setProfTestPublicCatalogShow`.
- **Catalog wizards (org + specialist)** — submit success copy «Заявка отправлена, ожидает проверки»; `role=alert`/`aria-live`; scroll to banner after submit attempt; «Отправка…» on submit button (org footer already had pattern).

## Tests / build

```bash
npx tsc --noEmit
# exit 0

npm run build
# exit 0
```

Inherited multipart/upload/preview tests not re-run in this turn.

## Not verified

- Live Timeweb cabinet submit with real test delegation.
- Browser E2E moderation + public remcard.ru (BLOCKED: no isolated full stack run).
- Admin toggle against production API.

Final code SHA: _(set at commit tip)_.
