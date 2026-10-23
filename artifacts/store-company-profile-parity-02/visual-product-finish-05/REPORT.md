# STORE-COMPANY-PROFILE-PRODUCT-FINISH-05

## Scope (frontend only)

- **Review step:** checkbox «Показывать профиль партнёрам» + hint; persist via existing `partnerSearchTouched` / `partnerSearchOptIn` patch contract; readonly and identity reset preserved.
- **Catalog preview:** business variant styling, readiness pill «Обязательные поля заполнены» when submit checks pass; draft preview framing unchanged for validation/moderation.
- **Mobile:** padding/width fixes at 375 and 320 (long org name on catalog card).

## Git

| Role | SHA |
|------|-----|
| Impl tip (code + capture) | `9654f34193e7bb4fd412ec095f643df737d82376` |
| Prior visual base (04.2) | `f6a2fbe3de4339cf6d64672c3cca3faac17b3192` |
| Branch B (frozen) | `cadb77e5d1834a6c45f778e49e9f23469eb62b46` |
| Prototype ref | `9bc52fb9152293e992e98dc50804a660cef10733` |

## Visual evidence (8 ref+impl pairs)

| Job | Viewport | Theme |
|-----|----------|-------|
| `store-working-review` | 1440 | light |
| `company-working-review` | 1440 | light |
| `store-review-375` | 375 | light |
| `company-review-375` | 375 | light |
| `store-catalog-preview` | 1440 | light |
| `company-catalog-preview` | 1440 | light |
| `store-catalog-preview-375` | 375 | light |
| `company-catalog-longname-320` | 320 | light |

**Manifest status:** `pass` — 8/8 jobs OK, 0 failed.

Capture: one-off `/tmp/visual-finish-04-capture.mjs` with `PRODUCT_FINISH_05=1`, impl dev-fixture @ `http://127.0.0.1:3022`.

## Tests

- Business/profile slice (partner visibility + catalog preview + business wizards): **19/19** pass.
- `tsc --noEmit`: pass.
- Full suite: see commit message / CI note — baseline **9** pre-existing ProfileEditor failures remain out of scope.

## Blockers

None for this stage. Backend/API unchanged.
