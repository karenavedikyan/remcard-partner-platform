# A22d — shared funnel reader integrated

Analytics uses **`getAdminUserFunnel(funnelRole, signal?)`** from `@/lib/prof-admin-clients-api` (A21d carrier `81e29b9`).

Removed: `adminAnalyticsUsersFunnel.ts` (interim parser).

**Verified signature (bundle / HANDOFF-A22-SHARED-FUNNEL-READER.md):** no `period` on funnel GET — analytics **7d/30d** applies to overview + management only.

Query: `GET /api/admin/users?role=CLIENT|PRO&funnelRole=CLIENT|PRO&page=1&limit=1`
