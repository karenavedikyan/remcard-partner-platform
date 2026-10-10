# PROF-I stream B — inbox & bell

**Status:** PASS (targeted unit + PG + browser smoke on test stack)  
**Branches:** `feat/prof-i-inbox` (platform + navigator)  
**Frozen bases:** platform `2c752e3`, navigator `e7d1fd6`

| Repo | HEAD (after this report commit) | Worktree |
|------|-----------------------------------|----------|
| remcard-partner-platform | `ab8c35631af080da994d2c66a8c5d9b76e4bcf9e` | `/tmp/prof-i-worktrees/prof-i-b-platform` |
| remcard-navigator | `d5caef7a84ce3d61f5f25754cf533275387197ef` | `/tmp/prof-i-worktrees/prof-i-b-navigator` |

## Reuse (PROF-G → H5)

- Navigator: `profInbox*`, `/api/pro/notifications/*`, `ClientNotification.dedupeKey`, partnership + moderation emits (ported from `feat/prof-g-notification-center`, H5 catalog/approve-all logic preserved).
- Platform: `ProfNotificationBell`, `ProfNotificationCenter`, `useProfNotifications`, `/notifications`, BFF allowlist (no AppShell wiring — stream E).

## Migration

- `20261013_prof_i_b_inbox_dedupe_key` — additive `dedupeKey` + partial unique index.
- Applied manually on loopback `remcard_prof_test` for this run (`prisma migrate deploy` blocked: non-empty DB without migrate history baseline).

## Payout emit contract (stream D)

See `docs/PROF-I-B-PAYOUT-EMIT-CONTRACT.md` — **`emitProfPayoutRecorded(db, ProfPayoutEmitPayload)`** in navigator `src/lib/profInboxEmit.ts`. One recipient, `eventId = payoutOperationId`, dedupe `prof:payout:{payoutOperationId}:{recipientUserId}`.

## Tests

### Navigator (PG `remcard_prof_test` @ 127.0.0.1:5432)

**Note:** WORKSTREAMS target PG port **54322** was not listening in this environment; tests used loopback **`remcard_prof_test` on 5432** without relaxing `validateTestDatabaseUrl` / `isRemcardProfTestDatabase` guards. Port **54322 isolation: NOT VERIFIED**.

```bash
export DATABASE_URL='postgresql://postgres:***@127.0.0.1:5432/remcard_prof_test'
export JWT_SECRET='dev-jwt-secret-for-prof-i-b-tests-only-32chars'
cd /tmp/prof-i-worktrees/prof-i-b-navigator
pnpm exec vitest run \
  src/lib/__tests__/profInbox.test.ts \
  src/lib/__tests__/profCabinetUrls.test.ts \
  src/lib/__tests__/profIInbox.integration.test.ts
```

**Result:** 8/8 passed.

Coverage highlights: dedupe insert, snapshot mark-all, foreign inbox isolation, payout emit idempotency, notifications API auth + list scope.

### Platform

```bash
cd /tmp/prof-i-worktrees/prof-i-b-platform
pnpm exec vitest run src/lib/prof-notifications.test.ts
npx tsc --noEmit
```

**Result:** 2/2 unit passed; `tsc` exit 0.

### Browser (test shell)

Stack: navigator **:3011** (B worktree) + platform **:3102**, shared `JWT_SECRET`, fixture user `m1fix-prof-browser01`.

```bash
cd /tmp/prof-i-worktrees/prof-i-b-platform
JWT_SECRET='dev-jwt-secret-for-prof-i-b-tests-only-32chars' \
  node scripts/prof-i-b-notifications-browser.mjs
```

**Result:** exit 0 — screenshots `docs/screenshots/prof-i-b/notifications-{1440,390}*.png`.

Bell in AppShell: **not mounted** (by design); integration steps in `docs/PROF-I-B-APPSHELL-INTEGRATION.md`.

## Event sources closed (vs old G gaps)

| Scenario | Emit |
|----------|------|
| Org approve-all batch | `emitProfModerationOrgApproveBatch` in transaction |
| Org reject batch | `emitProfModerationRejected` with note id |
| Branch approve/reject | `emitProfModerationApproved` / `Rejected` |
| Partner approve/revise/reject | moderation emits in transaction |
| Partnership reject | `notifyPartnershipRejectedToOther` → inbox |
| Purchase + accrual | `emitProfOrderConfirmed` + `emitProfAccrualCreated` in `orderCreate` tx |
| Term change | `insertProfInbox` after request create |

## Shared-file notes for coordinator (E)

- **Navigator** `src/lib/store/orderCreate.ts`, moderation routes, `partnerNotifications.ts`: narrow emit hunks only; do not drop H5 catalog sync on approve-all.
- **Platform** `remcard-proxy.ts`: three notification routes added; merge with C/D BFF changes by union.
- **Docs** under `docs/prof-i/*` duplicated on both branches for worker context; E may dedupe to platform-only.

## NOT VERIFIED

- Dedicated PostgreSQL instance on port **54322**
- Production Telegram/MAX delivery
- Stream E AppShell + theme combined UX
- Full cross-feature I4 acceptance
