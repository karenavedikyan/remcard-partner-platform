# STORE-COMPANY-WALLET-01

**Status: READY FOR REVIEW (review04 remainders closed)**

## Block 1 (accepted — not modified)

Business / legacy-agent guard and prof-test financial admission unchanged. `pg-prof-test-financial-guard.log` remains the accepted guard proof.

## Authoritative runtime (review04 capture)

| | |
|--|--|
| **Frontend** | `1a0fbf32dd75cd3994dc456789da84e217af3823` |
| **Backend** | `0152db578de69c387e73536214ebec940aebda27` |
| **Branch** | `feat/store-company-wallet-01` (both repos) |
| **Capture UTC** | `2026-10-25T21:51:14.000Z` → `2026-10-25T21:53:42.707Z` |
| **Gate** | `shell-browser-gate.exit` = `0`, `shell-gate.json` / `metadata-shell.json`: `ok: true`, `failures: []` |

### Evidence tip vs runtime

| Repo | Runtime (gate) | Evidence tip (docs commit) |
|------|----------------|----------------------------|
| remcard-partner-platform | `1a0fbf32…` | Same as runtime (runner + REPORT in this capture) |
| remcard-navigator | `0152db57…` | Same as runtime (baseline script + concurrent integration test) |

Prior accepted UI/runtime pair (`8ffcfb56…` / `4e3eacd1…`, capture `21:31:48` → `21:34:09`) covered block1, delegated policy, and initial access matrix; **review04** only extends staff depth, concurrent payout assertions, and reporting.

### Historical captures (not current)

| Label | Frontend | Backend | Capture UTC |
|-------|----------|---------|-------------|
| review04 pre-close | `8ffcfb568fa0e8cbba4fcf85b1f18f782f07b311` | `4e3eacd1a4f8682cf8d0d780fcc6403e7b2deb8a` | `2026-10-25T21:31:48` → `2026-10-25T21:34:09` |
| Earlier partial | `a418561e…` / `7562b289…` | `a0b3d71c…` / `d9374b6f…` | superseded |

## Accepted UI / load (unchanged)

Requisites UI POST/PATCH (incl. `bank-correspondent`), Excel via workspace button + download parse; payout modal + DB; `scopeKey` + load generation; 9 workspace component tests; delegated STORE/COMPANY PATCH policy; foreign payout before snapshot.

## review04 remainders (this capture)

| Remainder | Proof |
|-----------|--------|
| **Staff revoked — missing HTTP cases** | `run-wallet-shell-e2e.mjs` `staffWalletRevoked`: payout POST, owner requisites GET detail, POST create, PATCH `setPrimary` / `archive` / `revise` → **401**; `loadAccessBaseline` before/after → owner requisites + bonus status/paidAt/method + payout record count unchanged |
| **Staff restricted — owner requisites** | `staffWalletForbidden`: owner detail **403/404**; owner PATCH mutations denied; own-scope requisites POST per contract (not owner scope); payout **403/401**; same baseline compare — owner scope unchanged |
| **Parallel payout — one effect, one event** | `walletGatePayoutConcurrent.integration.test.ts`: parallel same `Idempotency-Key` → one `payoutRecordId`, both **200**, replay **200** with `replay: true`; one `BonusPayoutRecord` (actor = store real owner, amount/method CASH); bonus **PAID** + `paidAt`; exactly one `PROF_BONUS_PAYOUT_RECORDED` audit (filtered by `payoutRecordId`); one inbox row `prof:payout:{payoutRecordId}:{recipientUserId}`; retry adds no second record/audit/inbox; `notifyUser` mocked, inbox persistence real (`pg-payout-concurrent.log`) |
| **CASH bank requisites snapshot on payout record** | **Не применимо** — `BonusPayoutRecord` has no requisites snapshot field; pay endpoint does not accept `requisitesId` for CASH |

Baseline script: `remcard-navigator` `scripts/prof-admin-moderation-isolated/wallet-gate-access-baseline.ts` (no bank secrets in stdout).

## Fixture amounts (store/company realOwner)

| Owner | Payable | Receivable |
|-------|---------|------------|
| Store | 1200 ₽ | 800 ₽ |
| Company | 950 ₽ | 650 ₽ |

## Command

```bash
bash scripts/store-company-wallet-01/run-browser-gate.sh
```

## Artifacts

- `shell-gate.json`, `metadata-shell.json`, `shell-browser-gate.log`, `shell-browser-gate.exit`
- `pg-prof-test-financial-guard.log`, `pg-payout-concurrent.log`
- `visual-shell/store-wallet-real-*`, `visual-shell/company-wallet-real-*`

No main / deploy / production SQL / real-money writes outside catalog QA.
