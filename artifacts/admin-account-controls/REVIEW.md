# ADMIN-CONTROLS-REVIEW-20261027

**Статус:** готово для независимой приёмки Perplexity. **Не** для автоматической публикации / deploy.

## SHA

| | Commit |
|---|---|
| Проверенный исходный кандидат | `4c577650626f722a55c4ca4894f65a7cfe744d8f` |
| Опубликованный PROF до кандидата (родитель) | `e7ca0b92b9cc51b01ae596f40124ee3dd777c65b` |
| Итоговый HEAD после review | `a46b3ed48da702ab48af03329e91547490554a3f` (только отчёт; продуктовый код = `4c577650…`) |

Ветка: `fix/admin-account-controls-20261027` (`karenavedikyan/remcard-partner-platform`).

## Code review (самостоятельный)

Проверены все 8 файлов commit `4c577650`:

- **Идентичность:** `admin/layout.tsx` берёт `displayName` и `staffRole` только из `getAuthMeServer` при `staffRole ∈ {ADMIN, OWNER}`; при 401/403 или партнёре без staff — меню не монтируется, `ThemeToggle` остаётся. Роль не выводится из `partnerType`/бренда.
- **Guards:** layout явно не заменяет `requireProfPlatformAdmin` на страницах; returnTo на moderation org сохранён.
- **Logout:** `useAccountSessionExit` → `postLogoutCurrentDevice` / `postLogoutAllDevices` (`/api/auth/logout`, `/api/auth/logout-all-sessions` через существующий BFF/proxy). Ошибка API → `role="alert"`, **без** `router.push` на signed-out. Отмена confirm-all → `mocks.all` не вызывается (покрыто тестом).
- **Admin context:** опциональный `signInMode: "admin"` только из `AdminAccountControls`; partner `AccountSessionMenu` без параметра → signed-out `/login` без `mode=admin` (acceptance test).
- **Межвкладочный выход:** `storage` listener добавляет `&mode=admin` при admin hook.
- **Inbox:** в `AdminHeader` нет колокольчика/уведомлений; навигация moderation/partners/test-users/password/profile/remcard.ru на месте.
- **Тема:** root `app/layout.tsx` уже оборачивает в `ThemeProvider`; admin использует тот же `ThemeToggle`.

**Найденные дефекты:** нет. Исправления в продуктовом коде не вносились (искусственный diff не создавался).

## Команды и результаты (Cloud Agent, Node v22.23.4)

```sh
cd remcard-partner-platform
npx vitest run \
  src/app/admin/AdminPlatformControls.test.tsx \
  src/components/account-session/AccountSessionMenu.acceptance.test.tsx \
  src/components/layout/ThemeToggle.test.tsx \
  src/app/admin/partners/AdminPartnersRegistryDisplay.test.tsx \
  src/app/admin/partners/AdminPartnersIndependentR3.test.tsx \
  src/app/admin/partners/AdminPartnersIndependentR4.test.tsx \
  src/components/auth/LoginExperience.admin-session.test.tsx
```

**Результат:** 7 files, **44 passed**, 0 failed, 0 skipped (2026-10-27 UTC).

```sh
npm run build
```

**Результат:** exit **0** (Next.js 15.5.27). Только pre-existing ESLint `react-hooks/exhaustive-deps` warnings в других модулях; новых ошибок по admin/account-session нет.

## Браузер

- **Не выполнялось** в этом окружении: Playwright/visual 1440×375, две темы, ручной theme persistence smoke.
- **Покрыто unit/jsdom:** theme remount, меню, Escape+focus, cancel/confirm logout-all, ошибка logout без навигации, admin signed-out link, partner signed-out без `mode=admin`, registry R3/R4 display tests.

## Ограничения среды

- Logout API замоканы в тестах; **реальные сессии не отзывались**, SMS/MAX/Telegram не отправлялись.
- Backend не менялся; proxy paths проверены статически (`account-session-exit.ts`, `remcard-proxy` allowlist).

## Подтверждение запретов

- Production deploy / Timeweb API: **нет**
- SQL, миграции, изменение production env/данных партнёров: **нет**
- PR не создавался
- `release/prof-v1-20261007`, main/master, backend release: **не тронуты**
