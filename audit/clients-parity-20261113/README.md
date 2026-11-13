# Clients parity — independent audit (2026-11-13)

**Task:** `REMCLIENTS-V5-COMPUTER-MEASURED` (continues V1–V4)  
**Owner:** independent QA on `cursor/remcard-wallet-dialog-width-20261103`  
**Allowlist:** this directory + `scripts/clients-parity-20261113/**` only. **No product code on auditor branch.**

## Pins (V5)

| Role | SHA |
|---|---|
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Production packaging base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Computer FAIL mount | `d1da948491293c1a8ba77d4854191347708b4379` |
| **correctedSha** (KPI CSS) | `5c7db88744825e33cc68bc5210b11185f1aa5c8d` |
| **Audited tip** | `e4ddc09813b5d06909a166a4d1190f79bf6918fb` |

## Start here (V5)

1. `16-V5-QA-SUMMARY.json` / `requirement-matrix-c01-c56.json` — **TOTAL=56**
2. `14-V5-QA-KPI-CASCADE.md` — measured 768/375→4, ≤360→2
3. `15-V5-QA-FORBIDDEN-AND-FORWARD.md` — Gate/Context/route/helper still forbidden
4. `v5-computed/stats-grid-computed.json` + `v5-isolated-mount-e4ddc098/`

## Counts

`PASS_functional=3` · `PASS_safety=4` · `FAIL=12` · `BLOCKED=23` · `BLOCKED_PERSISTENCE=4` · `NOT_STARTED=9` · `EXCLUDED=1` · **TOTAL=56**

KPI cascade is measured PASS; section packaging/contracts still **not accepted**. No fake save.

## Capture

```bash
WALLET_QA_CHROME=/usr/bin/google-chrome-stable \
  node scripts/clients-parity-20261113/mount-observer-v5-verified-viewports.mjs
```

## Earlier passes

V1–V4 artifacts are historical. **Do not** use `ffd4aa61` / V3–V4 screenshots as proof for `e4ddc098`.
