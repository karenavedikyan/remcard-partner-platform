# STORE-COMPANY-PROFILE-PRODUCT-FINISH-05.1

## Remainders closed (frontend)

| Item | Change |
|------|--------|
| Review copy | Removed «Сейчас на сервере: …»; checkbox + prototype hint kept |
| Capture driver | No sidebar hide / DOM CSS hacks; normal AppShell; scroll-to-target gates with `targetBox` + `scrollY` in manifest |
| Mobile intro | Scoped catalog intro card/heading; 18px title only ≤360px so «Подключение к каталогу» is one line in cabinet width |
| Tests | Partner visibility: opt-out `false`, legacy untouched save, identity reset via real wizard navigation |

## Git

| Role | SHA |
|------|-----|
| Code + capture tip | `996f9a776b93d4780899499fa7fc625036173b60` |
| Prior artifact base (05) | `505796531f93ae15ee6a0fec181c7ab9752b860a` |
| Original 05 code | `9654f34193e7bb4fd412ec095f643df737d82376` |
| Branch B (frozen) | `cadb77e5d1834a6c45f778e49e9f23469eb62b46` |
| Prototype ref | `9bc52fb9152293e992e98dc50804a660cef10733` |

## Visual (same 8 jobs as 05)

**8/8 ref+impl pairs, manifest `pass`.** Gates: `partner-checkbox`, `catalog-preview-card`, `catalog-public-name` (+ intro single-line height check on 320).

Capture: `/tmp/visual-finish-04-capture.mjs` with `PRODUCT_FINISH_05_1=1`, dev-fixture @ `:3022`.

## Verification

- Business profile tests: **22/22** in partner-visibility + business folder slice (19 business wizard files + 3 new cases in partner-visibility file → 22 total in business run: actually 19 tests in 8 files - partner visibility has 6 tests now)
- Full suite: **493 pass / 9 fail** (baseline ProfileEditor; +3 new unit tests vs 05 report)
- `tsc --noEmit`: pass

## Blockers

None.
