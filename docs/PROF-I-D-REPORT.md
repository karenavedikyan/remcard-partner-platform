# PROF-I stream D (platform)

See navigator `docs/PROF-I-D-REPORT.md` for full contract, migration, and E merge notes.

**This repo:** payout record modal (`PayoutRecordModal`), settlements/accrual entry points, BFF routes for `POST /api/bonus/:id/pay` and `GET .../payout-actions`, Idempotency-Key forward for payout POST.

**Tests:** `npm run test:proxy` (includes `payout-record.test.ts`), `npm run test:component -- SettlementsHub`.

**BLOCKED:** Browser themes 1440/390 not run here; PG payout suite requires seeded `remcard_prof_test` fixtures on loopback.
