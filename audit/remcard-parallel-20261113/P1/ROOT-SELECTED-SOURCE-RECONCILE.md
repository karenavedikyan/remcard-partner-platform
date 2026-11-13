# Root selected UI pins — P1 packaging reconcile

**Authority:** Root manifest  
`remcard-cursor-team/review/clients-release-prep/selected-source-manifest.json`  
(not readable from this VM; reconcile recorded locally in `selected-source-manifest.p1-reconcile.json`).

**Production partner base:** `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` — gate/context/routes/config **not** from whole branches.

**Prototype:** `3dc31836cd18d9209c20097f18b906dd276f7af6`

## Root-selected owner tips (blob extract, not branch merge)

| Owner | Pin | Notes |
|-------|-----|--------|
| P1 | `f43f9e22` | proxy + packaging |
| P2 | `457a417c` | branch ref `cursor/2-06bf` |
| P3 | `b1c1684e` | observer list/workspace |
| P4 | `9d22694f` | observer/receiving detail |
| P5 | `164b8dbe` | personal + **receiving bulk** (not P6 duplicates) |
| P6 | `2375944e` | receiving workspace; Root fixed revision/double-JSON body |
| P7 | `9094f523` | CSS |

Local `git cat-file`: only **P1** object present; other pins resolve at Root cherry-pick time → assembly rows `MISSING_AT_OWNER_TIP` until fetched.

## Root synthetic QA (not product)

- Intercepted routes: detail save revision 1→2, stage/history refresh, draft retain on fail, committed+failed refresh notice, **409** reload without auto-retry, read-only redaction, 404/500/retry, scanner/order buttons — **no real backend/payment**
- **375/1440 light/dark slice fit** — **not** full-shell/font/prototype acceptance

## P5/P6 bulk (still applies at publish)

- **Reject** P6 `3d6c7637` duplicate bulk toolbar/contract/edit panel
- **Select** P5 `164b8dbe` (supersedes earlier `1298491f` pin) for toolbar/edit/confirm/helpers
- See `P5-P6-BULK-COLLISION-MAP.md`

## Proxy vs `57ca` production

P1 `f43f9e22` / `0bb25b9b` lineage: partner proxy **source-prepared** for K1/K2/K5 clients routes.  
Production tree @ `57ca`: **no** mounted receiving/observer product — not whole-section acceptance.

## Open blockers (Root)

| Priority | Item |
|----------|------|
| **Main implementation** | Order association / **return** flow |
| Open | Full observer / personal / bulk / settings / certificate / roles / geometry acceptance |
| Frozen | Backend source-prep K8/K1/K2/K5 — no schema change unless Root defect |

`clientsSectionPublishable: false`
