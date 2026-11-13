# REM-DUAL-FRONT-RESIDUAL — client site (К teams)

**Partner P1 scope:** packaging/proxy pins only. **Browser:** NOT_VERIFIED.

Production pins: navigator `89fb8e073c39c8dbd329996940b85c6a86751868`, partner `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79`.

## Frozen backend source-prep (no further К schema unless Root defect)

| Owner | SHA |
|-------|-----|
| K8 | `8f4d336ad44906de042ca6c15c8f581d6ba8686c` |
| K1 | `a71b8f37f526d775cd99f0535705be678b72261e` |
| K2 | `c49d71dceae8e221fc3e321056b091d7e3347be5` |
| K5 | `6c4444879d5651679c969b8009b3f39d05302c43` |

## Client-site book (prototype `3dc31836` in partner repo)

Pages **5–13** numbering frozen (home, purchases/leads, wallet **7**, reviews, favorites, notifications, profile, privacy, lead detail). Old LEVELS page7 excluded; current WALLET page7 **not** excluded.

## What remains on **client site** (К UI — not P1 implementation)

| Area | Status |
|------|--------|
| Book **5** home, **6** purchases/leads, **7** wallet (not old LEVELS p7), **8–13** | К resume **original** client UI; prototype `3dc31836` book frozen — **NOT_VERIFIED** live pages |
| Client wallet / lead detail / notifications | К owners; no whole-branch Profile/Login overwrite |
| Vacancies | **Excluded** (none) |
| Auth / Telegram-MAX / partner routing @ `89fb8e07` | **Unchanged** |
| Clients DB migrate | **Not authorized** |
| Partner Clients @ `57ca` | No receiving/observer product mount; proxy source-prep on partner branch only |

## Partner side (this repo) — user-visible residual

| Issue | Owner |
|-------|--------|
| Receiving list/manual body vs K1 pagination | P6 `78fd46e7` + P2 body |
| Bulk confirm still blocked in UI until P6 drops stale P1 gate copy | P6 |
| Observer «у партнёров» data wire | P3/P5 + K2/K5 |
| `fetch-observer-appeals` blocked contract | P2/P3 |
| Gate + 3 empty states on `57ca` | preserved verbatim at publish |

**FINISHED** for proxy/manifest ≠ full-section or page acceptance.
