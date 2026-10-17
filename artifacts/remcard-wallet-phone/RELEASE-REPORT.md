# WALLET-PHONE-01.2 — hydration + smoke closure

Same PRs: [platform #25](https://github.com/karenavedikyan/remcard-partner-platform/pull/25), [navigator #688](https://github.com/karenavedikyan/remcard-navigator/pull/688) (backend unchanged in 01.2 unless smoke finds a defect). ACCOUNT-EXIT-01 remains separate.

## Block status (01.2)

| Block | Status | Evidence |
| --- | --- | --- |
| **Hydration / ledger view** | **PASS** | SSR + first paint use `defaultReceivablesPrefs()`; stored prefs applied in `useEffect`. Regression: `AgentReceivablesHub.hydration.test.tsx` (incl. SSR list → stored large). Smoke: `SMOKE-01-2.json` → `hydration.pass`, mobile PNGs `visual-01-2/impl-partners-{375,320}-{list,large}.png` |
| **BFF Excel download** | **PASS** | Smoke: `ledger-export-xlsx` → `smoke-export-01-2.xlsx`; BFF `partners` + per-`groupKey` `orders` (HTTP 200), 30 rows / 17 175 ₽; XLSX `eachRow` + «Количество записей» = 30 (see `SMOKE-01-2.json`) |
| **Phone Enter → save → GET** | **PASS** | Smoke: keyboard Enter + «Сохранить черновик» → reload → BFF GET draft `+79186360099` |
| **Carry-over (01.1)** | **PASS** | Phone helpers, XLSX backend, prototype patch — not re-audited here |

## Visual / runtime honesty

- New captures only for **01.2 scope**: `artifacts/remcard-wallet-phone/visual-01-2/` (4 mobile partners shots). Prior 19 desktop PNGs from 01.1 remain; not re-shot.
- Smoke tied to disposable stack: `runtimeSha256` in `SMOKE-01-2.json`. **Executable hydration code** pinned as `codeUnderTest.platform` = **`a8f6947`**; document/capture HEAD in `gitCapture.platformDocumentHead` (may differ). **Not** production; prototype patch still **not** applied to author app.
- Mobile PNGs captured only after partner rows load (`agent-r05-partner-row` > 0, no «Загружаем партнёров…», export enabled).
- **CAPTURED ≠ pixel parity** (unchanged from 01.1).

## Code heads

See `TEST-RESULTS.json`.
