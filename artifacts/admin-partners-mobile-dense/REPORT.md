# Admin partners mobile dense registry — QA report

## Branch and release boundary

| Item | SHA / note |
|------|------------|
| Branch | `feat/admin-partners-mobile-dense-20261028` |
| **Published PROF (unchanged)** | `af324f1e91afcdea28a46323bc505eb94ab7c4b2` |
| Baseline harness screenshots | `dc57afbb` |
| Dense list + mobile filters | `cab5292c` |
| Header/row compression | `a0d63b95` |
| Compact status tokens (product) | `3c0c28a0` |
| **Accepted product tip** | `7443ac29ce8bab27b318f4dccb83ff011abaa531` |
| Harness cursor mock + capture + report | `c7aa3917` (`ef106411` capture bundle) |

No production deploy, no PR, no changes to published PROF.

## Product scope (accepted at `7443ac29`)

- Mobile ≤720px: **dense list** by default (ignores stored «Карточки»); desktop table/cards unchanged.
- Collapsible **Показатели**; search always visible; filters under **Фильтры (N)** + reset.
- One expanded partner; checkbox does not toggle expand; compact bulk bar before full bulk form.
- Row status: **Каталог:да/нет/н/д · Поиск:да/нет/н/д · Связей:N/н/д** (authoritative helpers, per-segment color, `aria-label` with full text, wrap without ellipsis on tokens).

**Independent acceptance (`7443ac29`, Chromium):**

| Check | Result |
|-------|--------|
| Vitest | 36 files / **176** tests PASS |
| `npm run build` | PASS |
| Rows visible (28 synthetic, harness) | 25 on page 1 |
| Fully visible closed rows | 320 → **2**, 375 → **3**, 430 → **4** |
| Themes | 375/430 light + dark |
| Document overflow | none at 320/375/430/1440 |
| Bulk 2× checkbox → form → reason → preview → cancel | PASS |
| Single manage reason → preview → cancel | PASS |
| One expanded, full name, profile/partnership links | PASS |
| Filters / reset, metrics toggle | PASS |
| Console page errors | **0** |

## Automated commands

```bash
npx vitest run --maxWorkers=1 src/app/admin/partners/
npm run build
```

## Isolated browser harness (not production admin)

| | |
|--|--|
| **Browser** | Playwright bundled **Chromium** (`playwright` npm package) — not JSDOM |
| **Server** | `npm run harness:admin-mobile` or Vite via `scripts/admin-partners-dense-capture.mjs` @ `127.0.0.1:5199` |
| **Route** | Hash `#/partners` — **not** signed-in `/admin/partners` |
| **Data** | `scripts/admin-mobile-visual-harness/mocks/` — 28 synthetic partners |

### Safe DOM selectors (CSS Modules)

```js
document.querySelectorAll('ul[aria-label="Реестр партнёров"] > li')
```

Do not rely on literal class names (`denseItem`, `metricsShellCompact`, etc.).

### Capture

```bash
npm run harness:partners-dense:capture
# or: node scripts/admin-partners-dense-capture.mjs
```

Writes:

- `artifacts/admin-partners-mobile-dense/screenshots/partners-{320|375|430|1440}-{light|dark}-viewport.png`
- `artifacts/admin-partners-mobile-dense/screenshots/partners-375-interactions-viewport.png`
- `artifacts/admin-partners-mobile-dense/metrics.json`

**Before:** `baseline/partners-375-light-viewport.png` (`dc57afbb`, legacy cards).

**Capture vs independent acceptance:** viewport scenes use `#/partners?registration=active` on mobile (22 LIVE rows in harness) and strict “fully inside viewport” row counting — see `metrics.json` `scenes[]`. Independent Chromium acceptance used the full **28** synthetic set (25 on page 1) and reported **2 / 3 / 4** fully visible closed rows at 320 / 375 / 430; treat that table as authoritative for product UI, not every automated metric field.

**Interactions block** (375, unfiltered `#/partners`, after expand smoke): checkbox / one-expanded / filter demo — recorded in `metrics.json` `interactions[]`.

### Harness pagination mock (honesty)

`fetchPartnerRegistry` in the harness honors `cursor` as `off:<offset>` (legacy `page-2` → offset = limit). **Production API behavior is not exercised here.** With the cursor-aware mock, capture can record `pagination-page2` when «Следующая страница» is enabled (28 rows, limit 25 → page 1: 25 rows, page 2: 3 rows, `firstRowChanged: true`). Runs **before** the mock ignored `cursor` and did **not** prove page-2 UI; do not retroactively claim those runs as green for pagination.

## Not verified

- `requireProfPlatformAdmin` / real session cookies on Next `/admin/*`
- Production registry cursor semantics (only harness `off:N` mocked)
- Real lifecycle POST apply / notification side effects

## Product files (frozen after `7443ac29`)

`AdminPartnersDenseRegistryList.tsx`, `adminPartnersViewMode.ts`, `adminPartnersFilterHelpers.ts`, `AdminPartnersClient.tsx`, `AdminPartnersRegistryList.tsx`, `AdminPartnersMetricsBar.tsx`, `AdminPartnersBulkPanel.tsx`, `AdminPartners.module.css`, `partnerRegistryDisplay.ts`, `partnerCollaborationDisplay.ts`, tests under `src/app/admin/partners/`.

## QA-only files

`scripts/admin-partners-dense-capture.mjs`, `scripts/admin-mobile-visual-harness/mocks/*`, `artifacts/admin-partners-mobile-dense/**`.
