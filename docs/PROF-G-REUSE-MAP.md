# PROF-G — reuse map (platform)

See navigator `docs/PROF-G-REUSE-MAP.md` for backend/event sources.

## Reuse

- `CabinetShell` / `AppShell` — bell in top bar (desktop + mobile logout row).
- `remcard-proxy.ts` — GET/PATCH `/api/pro/notifications*`.
- `ProfileEditor` + `PartnersHub` — deep links via query (`moderation`, `branchId`, `partnershipId`).
- History routes — purchase/accrual targets from notification URLs.

## New UI

- `ProfNotificationBell` + `/notifications` center.
- `useProfNotifications` — shared count/list/mark-read; poll 60s when tab visible; errors do not zero the badge.
