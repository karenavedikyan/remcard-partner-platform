# PROF-I stream A — theme & shell

**Status:** PASS (targeted tests + platform build)  
**Branch:** `feat/prof-i-theme`  
**Base SHA:** `2c752e32728b6f147e865bfd1175e20f708a3ddf`  
**Worktree:** `/tmp/prof-i-worktrees/prof-i-a-platform`  
**Dev port:** 3101 (not started in this run)

## Deliverables

| Item | Result |
|------|--------|
| Light/dark theme toggle (desktop + mobile topbar) | Done — `ThemeToggle` in `AppShell` topbar (visible ≤650px; prototype hid mobile toggle, I1 overrides) |
| Persistence `localStorage` key `remcard-theme` (`light` \| `dark` \| `system`) | Done |
| No flash / hydration | Boot inline script + `suppressHydrationWarning` on `<html>`; initial `resolvedTheme` from `data-theme` |
| Unified CSS tokens (prototype-aligned) | `globals.css` `:root` / `[data-theme="dark"]`, `--primary` + `--red` alias, `color-scheme` |
| Shell visual parity | Sidebar workspace card, sticky topbar, mobile overlay menu, bottom nav (4 items), footer strip |
| ProfNotificationBell slot (stream B) | `ProfNotificationBellSlot` + optional `AppShell.notificationBell` prop — no fake inbox |
| Profile business logic | Unchanged (no ProfileEditor / catalog / branches route edits) |
| DB migrations | None |

## Commits

(Filled after push — see git log on `feat/prof-i-theme`.)

## Tests

```bash
cd /tmp/prof-i-worktrees/prof-i-a-platform
npm ci
npx vitest run src/lib/theme-preference.test.ts \
  src/components/layout/AppShell.test.tsx \
  src/components/layout/ThemeToggle.test.tsx
npx tsc --noEmit
npm run build
```

**Results:** vitest 7/7 passed; `tsc --noEmit` clean; `npm run build` exit 0.

## Screenshot evidence

Not captured in this run (no dev server on 3101). Recommended for operator/E: `/` and `/profile` at 1440×900 and 390×844, light + dark, after reload.

## Shared files for integrator E

Merge order note: keep **both** theme (A) and bell (B) in `AppShell`.

### `src/app/layout.tsx`

- Adds `THEME_BOOT_SCRIPT` in `<head>`, wraps app in `ThemeProvider`.

### `src/app/globals.css`

- Prototype-aligned token values; `color-scheme`; form control defaults.

### `src/components/layout/AppShell.tsx`

- Topbar: menu, breadcrumb, `ThemeToggle`, `ProfNotificationBellSlot`, account block.
- Props: optional `notificationBell?: React.ReactNode` for B.
- Mobile: sidebar overlay + fixed bottom nav.

### `src/components/layout/AppShell.module.css`

- Full shell layout refresh (topbar height, footer, mobile bottom bar).

### New (A-owned, B consumes)

- `src/contexts/ThemeContext.tsx`
- `src/lib/theme-preference.ts`
- `src/components/layout/ThemeToggle.tsx` (+ module CSS)
- `src/components/layout/ProfNotificationBellSlot.tsx` (+ module CSS)
- `src/components/layout/ThemeIcons.tsx`

**B integration patch (expected):**

```tsx
// CabinetShell or AppShell caller
<AppShell user={user} incomingCount={attentionCount} notificationBell={<ProfNotificationBell />}>
```

Or render bell as child of slot inside `AppShell` after E merges B exports.

## BLOCKED / NOT VERIFIED

- Cross-viewport browser acceptance (1440/390 reload/navigation) — **NOT VERIFIED** (deferred to E operator check).
- Planned import block («Excel / 1С — Планируется») — **not in A scope**; parity doc not updated (coordinator/E).

## Out of scope (honored)

Inbox, team permissions, payouts, navigator repo, PR, production deploy.
