# VISUAL-FINISH-04.2

## Code (same branch `feat/store-company-profile-parity-02`)

| Commit | Content |
|--------|---------|
| `df4d36fd` | Mobile branch row grid reset; `afterSelectionNote` outside selection section; `businessIntroTitle` (20px) on «Подключение к каталогу»; dev-fixture `?orgName=` |
| `92705347` | Dev-fixture `publicNavigatorStageIds` so catalog wizard can advance past directions validation in SSR fixture |

Accepted FINISH-04 / 04.1 UI (summary width, branch desktop row, lead copy, ref catalog step1 gate) — not reworked.

## Capture (`/tmp/visual-finish-04-capture.mjs`)

**23 jobs OK / 0 FAIL** (`capture-run-final.log`).

| Count | Value |
|-------|--------|
| ref+impl pairs | **21** |
| impl-only | **2** (`store-catalog-pending`, `store-catalog-no-org`) |
| skipped ref | 2 |

Prior drop **04.1** remains **10 ref+impl + 2 impl-only**; this drop adds working/catalog/mobile screens without re-running the 04.1 summary-only matrix.

### Branch select control (375 catalog step0)

| Role | rowWidth | selectWidth | selectHeight |
|------|----------|-------------|--------------|
| STORE | 339 | 339 | 42 |
| COMPANY | 339 | 339 | 42 |

320 long-name catalog (both roles): impl `?orgName=` + ref same string; branch row metrics recorded in manifest.

### Coverage (04.2)

- 375 control: STORE/COMPANY catalog card + branch selector
- 1440: working «Связь и работа» / «Проверка» (STORE + COMPANY); catalog Контакты / Оформление / Предпросмотр (+ light scroll on preview)
- 375 light/dark: catalog directions, contacts, preview (STORE + COMPANY where listed in manifest)
- 320: long org name catalog card (STORE + COMPANY)
- Pending / no-org: impl-only (no equivalent ref business entry)

## PARTIAL (explicit)

- **Status `partial`** only because pending/no-org have no ref pair — not due to capture failures.
- Fixture vs ref demo data (phone/email/direction labels) may still differ; gates are step/panel/branch metrics, not pixel equality.
- 04.1 gaps intentionally not duplicated here (1440 basics summary matrix, STORE step2-only desktop, etc.) — see `visual-finish-04.1/`.

## Checks

- Business component tests: **13/13**
- Full unit suite: **486 pass / 9 fail** (baseline `ProfileEditor.test.tsx` — out of scope)
- `tsc --noEmit`: pass (this run)

## SHA fields (manifest)

- `captureCheckoutHead` / `implRenderSourceSha`: `92705347b84b2e83ff009e2dd7a51aadcee9b388`
- UI base: `df4d36fd20910c9c8fb3fe29b6d4475dbc1b8eea` (included in 92705347 history)
- `implRenderHistoricalBaseSha`: `969f6545326118751e7217bddb18d55faa6d9bf3`
- Ref prototype: commit `9bc52fb9152293e992e98dc50804a660cef10733`, tar SHA256 `382c3faaf0daae2b8958915a7c6c060e4256a0ed71a2d58a5a835dc6c027260d`
- B frozen: `cadb77e5d1834a6c45f778e49e9f23469eb62b46`
