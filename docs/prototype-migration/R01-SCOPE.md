# R01-SCOPE — минимальный выпуск: каркас и навигация (без команды / филиалов / уведомлений)

**Дата:** 2026-10-14 · **Предусловие:** R00 complete  
**База (рекомендовано):** platform `origin/release/prof-v1-20261007` @ **`e245feea79d171976ebd8b7f2dea0ded00302a89`**, navigator **`origin/release/prof-backend-v1-20261007` @ `bf2081d89c3a334f1531e5bceff88464a4760309`**  
**Не базировать на:** локальный checkout `cursor/m1-foundation-aa2d` / `cursor/m4c-order-idempotency`.

---

## 1. Цель R01 (один законченный инкремент)

Привести **общий каркас** PROF к актуальному прототипу **без изменения** внутренних сценариев:

- EXCLUDED: `ProfileTeam*`, `ProfileBranches*`, `NotificationSettingsPanel`, `ProfNotificationBell` / `/notifications` **логика**, invite/permission API, delivery.

**In scope R01:**

1. **Мобильная навигация:** до **4** настраиваемых пунктов в bottom bar + пункт **«Ещё»** (overflow: как минимум «История», «Взаиморасчёты», «Рекомендации» не в bottom bar).  
2. **Согласованность topbar:** заголовок страницы, account caption по роли (owner vs staff) — **только presentation**, без смены auth.  
3. **Theme polish:** без смены токенов в EXCLUDED секциях — проверить contrast на 320/375/1440 (shell-only snapshots).  
4. **Документ parity delta:** обновить строки ADAPT → EXISTS для навигации после реализации.

**Explicitly out of scope R01:** профильные вкладки, каталог, партнёры logic, scanner, settlements logic, migrations, production deploy.

---

## 2. Файлы для изменения (release paths)

| File | Change |
|------|--------|
| `src/components/layout/AppShell.tsx` | MOBILE_BOTTOM_NAV config + «Ещё» sheet/menu; optional `navPreferences` hook (localStorage, not JWT) |
| `src/components/layout/AppShell.module.css` | layout for 5th «Ещё» control, safe-area |
| `src/components/layout/AppShell.test.tsx` | unit: 4 primary + More routes |
| `src/components/layout/CabinetAppShellClient.tsx` | pass role/context label if needed (from existing `AuthUser` + optional lightweight `/api/pro/context` already used elsewhere — **read-only**, no new permissions) |
| `src/lib/types.ts` | only if new nav config types needed |

**Do not edit:**

- `src/components/profile/ProfileTeam*.tsx`
- `src/components/profile/ProfileBranches*.tsx`
- `src/components/profile/NotificationSettingsPanel.tsx`
- `src/components/notifications/*` (except import slot in shell if untouched behavior)

---

## 3. API / backend R01

**None required** for minimal R01 if nav prefs are client-local.  
If account caption uses staff context: reuse existing **`GET /api/pro/context`** (already in BFF allowlist) — **no navigator changes**.

Optional cherry-pick (separate commit, not blocking shell):

- `fix/prof-staff-partnership-access` — **not R01** unless owner expands scope.

---

## 4. Given / When / Then (acceptance)

### 4.1 Mobile bottom nav

- **Given** authenticated owner on `/partners` viewport **375×812** dark theme  
- **When** user taps **«Ещё»**  
- **Then** sees links to History, Settlements, Recommendations (and any item not in the 4 primary slots), navigates without full reload error.

- **Given** viewport **320×568** light theme on `/`  
- **Then** no horizontal overflow on bottom bar (`scrollWidth <= clientWidth + 2`).

### 4.2 Desktop 1440

- **Given** 1440×900 light theme on `/profile`  
- **Then** sidebar unchanged; team/branches/notifications tabs **look identical** to pre-R01 screenshots (visual regression on EXCLUDED blocks).

### 4.3 Auth / security (regression)

- **Given** no session  
- **When** open `/scanner`  
- **Then** SessionGate / login (existing).

- **Given** POST logout from foreign Origin  
- **Then** **403** (existing BFF).

### 4.4 EXCLUDED regression smoke (manual/script, synthetic DB)

Run existing scripts unchanged (HISTORICAL baseline):

- `scripts/prof-staff-access-scope-browser.mjs` — scope headline + 6 branches after branch switch.  
- Team invite path smoke — **do not modify** team components; run as-is post-R01.

---

## 5. Pilot scope

- **Roles:** ORG_OWNER store + one HEAD_OFFICE CLIENT staff (read-only nav).  
- **Routes:** `/`, `/partners`, `/profile`, `/history`, `/settlements` via «Ещё».  
- **Environments:** local synthetic only (`remcard_prof_test`).

---

## 6. Feature flag / rollback

- Nav v2 behind `NEXT_PUBLIC_PROF_NAV_V2=1` or `localStorage prof.nav.v2` default off until QA sign-off.  
- Rollback: disable flag → legacy 4-tab bar (current `MOBILE_BOTTOM_NAV`).

---

## 7. Dependencies before starting implementation

| Dependency | Owner | Blocks R01? |
|------------|-------|-------------|
| Pinned prototype export + SHA-256 | Product | **Soft** — shell can start, visual sign-off blocked |
| Checkout release tips in clean worktree | Engineering | **Hard** |
| Confirm production SHA (optional) | Ops | No for local R01 |
| Perplexity «Ещё» IA exact labels/order | Product | Soft |

---

## 8. What blocks R01 start (concrete)

1. **Wrong git base** in current VM checkout — must checkout `release/prof-v1-20261007` without losing uncommitted work (use worktree).  
2. **Missing prototype pin** — implement IA from written spec above, defer pixel-perfect.  
3. **No approval** to touch `AppShell.tsx` (only file with high blast radius) — needs owner OK for nav behavior.

---

## 9. Ready-to-start checklist

- [ ] Worktree at platform `e245fee`, navigator `bf2081d`  
- [ ] Synthetic DB smoke scripts run green on **pre-R01** baseline (record PASS)  
- [ ] EXCLUDED regression scripts scheduled post-change  
- [ ] Prototype export delivered OR owner accepts interim IA  
- [ ] R01 PR only after tests; **no production deploy** in R01

---

## 10. After R01 (not now)

- R02+: catalog/phone/directions parity, partners staff access merge, settlements for staff, clients hub, XLSX — see `PARITY-MATRIX.md`.
