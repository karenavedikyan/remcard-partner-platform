# STORE-COMPANY-PROFILE-PRODUCT-FINISH-05.2

## Scope

| Fix | Detail |
|-----|--------|
| Intro typography | Removed 18px/letter-spacing compensation; 20px / lh 28px (1.4) via scoped catalog width (`businessCatalogScope` bleed, intro header grid, kicker+badge row). No Shell changes. |
| Business preview | `stageLabels` rendered in business chip row; row guard includes stages. Draft-only (empty `navigatorStageIds` → no chip). |

## Git

| Role | SHA |
|------|-----|
| Code + capture tip | `68f0df4c2114a99fcb6469ae72dde71298ced319` |
| Prior F base | `e8872da72b8523f9b06542832d15d81ebafeaef1` |
| Branch B | `cadb77e5d1834a6c45f778e49e9f23469eb62b46` (frozen) |
| Ref proto | `9bc52fb9152293e992e98dc50804a660cef10733` |

## Visual (2 control pairs)

| Job | Viewport | Notes |
|-----|----------|-------|
| `company-catalog-longname-320` | 320 | Main PNG: intro «Подключение к каталогу» @ **20px**; companion `*-input.png`: `#catalog-public-name` long string. Manifest: impl/ref `introTypography` + bbox. |
| `store-catalog-preview-375` | 375 | Stage chip «Этап: … Инженерия» gated in preview card (impl + ref). |

**2/2 pass.** Capture: `PRODUCT_FINISH_05_2=1` on `/tmp/visual-finish-04-capture.mjs`.

### Computed intro (impl COMPANY 320)

- fontSize **20px**, fontWeight **800**, lineHeight **28px**, letterSpacing **normal**, fontFamily **Manrope**
- Title box height **28** (single line)

Ref intro @320: fontSize **20px**, fontWeight **700**, lineHeight **28px**.

## Tests

- `CatalogPublicationPreview`: **7/7** (+4 business stage cases)
- Business profile slice: **26/26**
- Full suite: **497 pass / 9 fail** (ProfileEditor baseline)
- `tsc`: pass

## Blockers

None.
