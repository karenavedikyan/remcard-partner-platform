# STORE-COMPANY-PROFILE-PRODUCT-FINISH-05.3

## Changes (catalog intro only)

| Item | Detail |
|------|--------|
| Weight | `businessCatalogIntroTitle` **700** (catalog card only); wizard `businessIntroTitle` / step panels stay **800** |
| Width bleed | Removed `businessCatalogScope` negative margin / `calc()` from 05.2 — branch/card widths back to normal (**284px** select @320) |
| Header | Desktop: copy block + status badge row (`catalogStyles.heading`); mobile ≤480: column **kicker → title → badge** |

Typography kept: **20px / line-height 28px / Manrope / normal letter-spacing**. No 18px, nowrap, or Shell edits.

## Git

| Role | SHA |
|------|-----|
| Code + capture | `3695424cec96d072022958104616d1cb0d04e4e0` |
| Prior F | `95e543084e7c735aaf6d20a4efd61d38a55fe6e8` |
| Stage chips (unchanged) | `68f0df4c2114a99fcb6469ae72dde71298ced319` |

## Visual (2 control pairs, same as 05.2)

**2/2 pass** — `visual-product-finish-05.3/`

- **COMPANY 320:** intro PNG @ scroll **109**; input companion @ scroll **708**; impl/ref intro **20/700/28/normal/Manrope**; input width **250px** (not 282 bleed).
- **STORE 375 preview:** stage chip still visible (regression guard after width revert).

## Verification

- `CatalogPublicationPreview`: **7/7** (unchanged stage tests)
- Full suite: **497 pass / 9 fail** (baseline)
- `tsc`: pass
- `npm run build`: pass (after code commit)

## Blockers

None.
