# PROF-I-B → stream E: notification bell integration patch

Do **not** merge this file into AppShell in stream B. Apply in `feat/prof-i-integration` after theme (A) and this branch (B) are merged.

## Platform `AppShell.tsx`

1. Import (client shell only):

```tsx
import { ProfNotificationBell } from "@/components/notifications";
```

2. Desktop topbar: place `<ProfNotificationBell enabled={Boolean(user)} />` immediately **before** the account block / theme toggle (A). Use the same flex row as other topbar actions; do not hide on desktop.

3. Mobile (390px): place the same component in the **mobile header action row** (not inside the slide-out nav only). Minimum touch target 44×44px; `aria-label` is provided by the component.

4. Styling: component uses `ProfNotifications.module.css` with existing cabinet CSS variables (`--surface`, `--text`, `--border`, `--accent`). After theme (A) lands, ensure those tokens exist in light/dark; no second notification theme.

5. Full-page inbox: route `/notifications` is already added (`src/app/notifications/page.tsx`) and uses `CabinetShell` like other cabinet pages.

## BFF

`src/lib/remcard-proxy.ts` on this branch already allowlists:

- `GET|PATCH /api/pro/notifications`
- `GET /api/pro/notifications/unread-count`
- `PATCH /api/pro/notifications/:id`

No extra platform changes required for inbox API.

## Navigator

Inbox storage and emitters live on navigator (`ClientNotification.dedupeKey`, `/api/pro/notifications/*`, `src/lib/profInbox*.ts`). Stream D should call `emitProfPayoutRecorded` from `@/lib/profInboxEmit` after a successful payout commit (see `docs/PROF-I-B-PAYOUT-EMIT-CONTRACT.md`).
