# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-V4-QA-COMPUTER` (continues V1–V3)  
**Owner:** independent QA on `cursor/remcard-wallet-dialog-width-20261103`  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only. **No product code.**  

## Pins (V4)

| Role | SHA |
|---|---|
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Production packaging base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Named impl candidate | `4c2e4cdf9ab7c17b6c8864d42ee6b34fcdcf87bd` |
| Author subsequent correction | `d1da948491293c1a8ba77d4854191347708b4379` |
| Prior V3 tip (do not reuse as evidence) | `ffd4aa6130e92af5d95da21cfe5519133228a962` |

## Start here (V4)

1. `13-V4-QA-SUMMARY.json` / `requirement-matrix-c01-c56.json` — **56 statuses, TOTAL=56**
2. `09-V4-QA-FORBIDDEN-COMPAT.md` — Gate/Context/route/helper/vitest still forbidden
3. `12-V4-AUTHOR-CORRECTION-d1da9484.md` — MotionStat + cast forward; packaging not restored
4. `11-V4-VIEWPORT-DIMENSIONS.md` — innerWidth/clientWidth/PNG proof; no six-viewport parity claim
5. `10-V4-BACKEND-HANDLERS-READONLY.md` — BE `release/prof-backend-v1-20261007` (+ staging tip)
6. Fresh mounts: `v4-isolated-mount/` (`4c2e4cdf`), `v4-isolated-mount-d1da9484/` (`d1da9484`)

## Counts (unambiguous)

`PASS_functional=0` · `PASS_safety=4` · `FAIL=15` · `BLOCKED=23` · `BLOCKED_PERSISTENCE=4` · `NOT_STARTED=9` · `EXCLUDED=1` · **TOTAL=56**

## Capture (Chrome; audit scripts only)

```bash
WALLET_QA_CHROME=/usr/bin/google-chrome-stable \
  node scripts/clients-parity-20261113/mount-observer-v4-verified-viewports.mjs
WALLET_QA_CHROME=/usr/bin/google-chrome-stable \
  node scripts/clients-parity-20261113/mount-observer-v4-d1da9484.mjs
```

## Earlier passes

V1–V3 artifacts (`01`–`08`, `candidate-mount/`, `candidate-isolated-listview/`) are historical. **Do not** treat their screenshots as proof for `4c2e4cdf` / `d1da9484`.
