# П7 — Visual comparison ledger (product READ-ONLY)

**Product tip (frozen for audit):** `9280f9e7279da14964574a6d1585499134ac7f8c`  
**Prototype pin:** `3dc31836cd18d9209c20097f18b906dd276f7af6`  
**Scope:** Partner **observer** UI (pages catalog **86 / 106 / 113** list, **87+** drill) — **not** client R1 `account.js` flows (catalog n 5–13; separate zone).

## Reference CSS chain (git-verified)

| Layer | Frozen path(s) | Used for observer |
|-------|----------------|-------------------|
| Shell | `design/general-prototype/partner/index.html` | `roles.css`, `partners-redesign.css`, `cooperation-controls.css`, … |
| Observer rules | `design/general-prototype/partner/client-appeals.css?v=observer-compact4` | **Primary** (`.ca-observer-*`, `.ca-personal-*`) |
| Tokens | `design/general-prototype/partner/roles.css` | `--accent`, `--tint`, `--line`, `.btn`, focus `outline: 3px` |
| Small control | `design/general-prototype/partner/care-services.css` | `.small-btn` (`padding: 4px 12px; font-size: 0.75rem`) |
| Markup/behaviour | `partner/client-appeals.js`, `observer-personal-list.js` | Class names, dialogs HTML |
| Client zone | `design/general-prototype/client/account.js` + `client/index.html` | **Not linked** to observer pages; no `client/style.css` in tree (not invented). |

**Product (tip 9280f9e7):** `src/app/globals.css` + `src/components/clients/observer/observer.module.css` only (P7 ownership).

**Synthetic paired harness:** `measure-paired-visual.mjs` — prototype CSS stack vs product globals+module; screenshots under `screenshots/`; numbers in `paired-computed.json`. **Not** full Next shell (no OwnerClientsGate, no cabinet chrome).

**Native QA harness** (`scripts/.../observer-list-harness`): omits production `globals.css` reset → overflow findings there ≠ product without reset (per review).

---

## Status legend

| Status | Meaning |
|--------|---------|
| **MATCH (computed)** | Measured in paired harness at listed width/theme |
| **MISMATCH (computed)** | Measured difference |
| **MISMATCH (source)** | Declared in frozen CSS vs `observer.module.css`, not fully browser-paired |
| **OPEN** | Not measured / needs full-app or owner JSX |
| **N/A** | Out of P7 CSS scope |

---

## 1. Theme tokens (accent / pressed bucket)

| Item | Prototype evidence | Product evidence | 320–1440 computed | Status |
|------|-------------------|------------------|-------------------|--------|
| Dark pressed bucket text | `roles.css` `--accent:#f49391` | `--observer-accent` → `--accent-emphasis` `#fda4af` | proto `rgb(244,147,145)` product `rgb(253,164,175)` @ all widths | **MISMATCH (computed)** — intentional production mapping post review |
| Dark pressed bucket bg | `client-appeals.css` `.ca-personal-buckets .btn[aria-pressed=true]{background:var(--tint)}` → `#3b2729` | `.bucketBtn[aria-pressed]` no `background` | proto tint vs product `#202520` surface | **MISMATCH (computed)** |
| Light pressed bucket text | `--accent #bb3035` | `--accent-emphasis #9f1239` | proto `rgb(187,48,53)` vs product `rgb(159,18,57)` | **MISMATCH (computed)** |
| Light pressed bucket bg | `var(--tint)` `#fae9e8` | surface `#fff` | **MISMATCH (computed)** |
| WCAG AA on product dark pressed | — | P7 accent test | ≥4.5:1 on surface (prior run) | **MATCH (computed)** in dedicated harness |

---

## 2. Personal tools — bucket / layout segment

| Property | Prototype selector | Product selector | Source (proto → prod) | Computed @375 | Status |
|----------|-------------------|------------------|----------------------|---------------|--------|
| Pressed font-size | `.btn` + `.small-btn` → **12px** | `.bucketBtn` (inherits **16px**) | `care-services.css` vs `.bucketBtn` no `font-size` | 12px vs 16px | **MISMATCH (computed)** |
| Pressed padding | `4px 12px` | `8px 12px` | small-btn vs `.bucketBtn` | match pattern all widths | **MISMATCH (computed)** |
| Min-height | `.btn` **44px** | `.bucketBtn` **44px** | both | 44px | **MATCH (computed)** |
| Ghost border default | `.ca-section .btn.ghost` border+surface | `.bucketBtn` always bordered | source | not isolated | **MISMATCH (source)** |

Screenshots: `screenshots/{light|dark}-{320|375|768|1440}-{proto|product}.png` (partial fixture).

**1024 / short-height (≤640px)** / **keyboard tab order** — **OPEN** (not in paired matrix).

---

## 3. Partner card — compact top, KPI, disclosure

| Property | Prototype | Product | Computed | Status |
|----------|-----------|---------|----------|--------|
| `compactTop` columns | `minmax(0,1.15fr) minmax(340px,1fr)` | same | @1440 product second track ≥340px (prior P7 test) | **MATCH (source + prior computed)** |
| KPI `dd` | `20px / 1.3 / -0.02em` | same | **20px** all widths/themes paired | **MATCH (computed)** |
| KPI cascade ≤360 | 2 cols | 2 cols | prior stats-grid tests @9280f9e7 | **MATCH (computed)** extern. |
| Disclosure `summary` min-height | **44px** | **44px** | 44–45px paired | **MATCH (computed)** |
| Disclosure `summary` font-size | ~**14px** (roles body cascade on `summary`) | **16px** (body) | all widths | **MISMATCH (computed)** |
| `toggleLabel` font-size | **12px** explicit | **12px** in CSS but summary inherits 16px | toggle child not isolated in harness | **MISMATCH (source)** partial |
| Chevron offset | `translateY(-2px)` | same | source parity @9280f9e7 | **MATCH (source)** |
| Card hover | border `color-mix(brand)` | none in module | — | **MISMATCH (source)** |
| Expanded panel gap/pad | `16px / 16px` | same @9280f9e7 | prior P7 test | **MATCH (source)** |

---

## 4. Grouped client row & list modes

| Property | Prototype | Product | Computed | Status |
|----------|-----------|---------|----------|--------|
| Desktop row grid | `24 + 1fr + 0.65fr + 145 + 150` | same | **identical** @1440 paired | **MATCH (computed)** |
| ≤1100 grouped grid | `24px repeat(2,1fr)` | same | **identical** @320/375/768 | **MATCH (computed)** |
| Row separators | `border-top` on `.ca-personal-row` | `border-bottom` on `.personalRow` | — | **MISMATCH (source)** |
| Row container gap | `.ca-personal-rows{gap:0}` | `.personalRows{gap:0}` | — | **MATCH (source)** |
| Selected row tint | `[data-selected=true]{background:var(--tint); box-shadow…}` | no equivalent in CSS | — | **MISMATCH (source)** — needs JSX `data-selected` owner |
| Cell labels desktop | `display:none` until ≤1100 | same pattern | prior P7 tests | **MATCH (computed)** extern. |
| Status/date same row | `@max-width:1100` grid columns | same | mobile-nav harness | **MATCH (computed)** extern. |
| Flat list shell | `.ca-personal-flat` border+radius+pad | `.personalRowsFlat` gap only | — | **MISMATCH (source)** |

---

## 5. Personal tag / note / status pills

| Property | Prototype | Product | Status |
|----------|-----------|---------|--------|
| `.ca-personal-tag` | offset bg, border, radius 6, pad `2px 8px` | `.personalTag` font 12px bold only | **MISMATCH (source)** |
| Status pill colors (good/warn) | `[data-theme=light] .ca-pill--*` hex | no pill classes in module | **MISMATCH (source)** — TSX/display owner |
| `.personal-note` | `white-space: pre-wrap` | overflow-wrap only | **MISMATCH (source)** |

---

## 6. Bulk toolbar, sticky, dialogs

| Property | Prototype | Product | Status |
|----------|-----------|---------|--------|
| Sticky toolbar w/ clear | `.ca-personal-toolbar:has([data-observer-action="clear"]){sticky; shadow}` | absent | **MISMATCH (source)** |
| Edit/confirm panel gap | `.ca-personal-edit,.ca-personal-confirm{gap:16px}` | `.editPanel,.confirmPanel{gap:12px}` | **MISMATCH (source)** |
| Panel radius | `var(--radius)` **16px** (roles) | **16px** | **MATCH (source)** |
| Edit panel scroll-margin | `scroll-margin-top:190px` | none | **MISMATCH (source)** |
| Confirm copy / actions | `observer-personal-list.js` | `ObserverPersonalConfirmPanel.tsx` | **OPEN** (copy parity — not CSS P7) |

---

## 7. Focus / keyboard (source-only at tip)

| Control | Prototype (`roles.css`) | Product (`observer.module.css`) | Status |
|---------|-------------------------|----------------------------------|--------|
| `summary:focus-visible` | `outline 3px`, offset **3px** | `outline 2px`, offset **4px** | **MISMATCH (source)** |
| `button:focus-visible` global | 3px accent | per-control 2px `--observer-accent` | **MISMATCH (source)** |
| Tab order / roving tabindex | JS in `hydrateObserverPersonal` | React owners | **OPEN** |

---

## 8. Screenshot / font matrix (@9280f9e7)

| Viewport | Light proto | Light product | Dark proto | Dark product | Font metrics in JSON |
|----------|-------------|---------------|------------|--------------|---------------------|
| 320 | PNG | PNG | PNG | PNG | bucket 12/16px |
| 375 | PNG | PNG | PNG | PNG | same |
| 768 | PNG | PNG | PNG | PNG | row grid match |
| 1440 | PNG | PNG | PNG | PNG | desktop row match |
| **1024** | — | — | — | — | **OPEN** |

Path prefix: `audit/remcard-parallel-20261113/P7/screenshots/`.

---

## Remaining mismatches (bounded, verifiable)

1. **Bucket/layout pressed segment** — typography (12→16px), padding, **tint fill** missing (computed all widths).  
2. **Disclosure summary** base font 14px vs 16px (computed).  
3. **Row chrome** — border direction, selection tint, flat list wrapper.  
4. **Personal tag** chip chrome.  
5. **Toolbar sticky** + edit panel gap/scroll-margin.  
6. **Focus ring** 3px/3px vs 2px/4px.  
7. **Pill status colors** — not in CSS module.  
8. **1024 / short viewport / full keyboard** — **OPEN**.

## Cross-owner dependencies

| Item | Owner |
|------|--------|
| `data-selected` row tint, pill classes | Personal row / display TSX |
| Full cabinet chrome + typography cascade | Shell / globals (read-only) |
| Confirm/edit copy | Personal panel TSX |
| Vitest include `P7.*` | Shared config |

## Evidence files

- `paired-computed.json` — 16 paired samples  
- `measure-paired-visual.mjs` — reproducible runner  
- `screenshots/*.png` — synthetic partial UI  
- Prior: `accent-contrast-evidence.json`, P7 test logs

**No full section acceptance claimed.** Product unchanged in this pass.
