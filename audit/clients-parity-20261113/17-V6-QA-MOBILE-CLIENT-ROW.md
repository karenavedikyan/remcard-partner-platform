# V6 — real mobile client-row blocker (supplement to V5)

## Pins

| Role | SHA |
|---|---|
| Computer FAIL mount | `d1da948491293c1a8ba77d4854191347708b4379` @ 375×812 dark |
| Author V6 row fix (first) | `5063368a…` |
| **correctedSha / audited tip** | `0729c12f1e321b1aa458d95016eb4cc3f4428f6f` |
| Prototype | `3dc31836cd18d9209c20097f18b906dd276f7af6` |
| Packaging base | `57ca4680892ae16c62fc38d0ad2ccb6a404dbd79` |
| Prior V5 KPI tip | `e4ddc098…` |

## Computer failure on `d1da9484` (375 dark)

- Partner «Салон Бета» open OK; MotionStat labels 1/0 OK
- Client click **FAIL** — Playwright element not visible
- Inside `ca-observer-partner-page`: row ~335px; grid `24px 0px 130px 145px 150px`
- Open button rect width **0** (name column crushed)
- `document.scrollWidth === 375` from clipping — **not** a no-overflow PASS

Cause: grouped desktop tracks (`24 + 130 + 145 + 150`) exceed mobile width; `minmax(0,1fr)` collapses to 0. jsdom/`fireEvent` component tests still PASS.

## Fix (prototype responsive rows, not redesign)

Port `client-appeals.css` behavior:

- `@media (max-width: 1100px)` — hide `.clientColumns`; stacked grouped grid `24px repeat(2,minmax(0,1fr))` with open spanning `2 / -1`
- `@media (max-width: 760px)` — flat `.personalRow` → `24px minmax(0,1fr)` with status/date/actions under name
- Preserve name / contact / status / date / action targets with nonzero geometry
- V5 KPI cascade retained: 375→4, ≤360→2, 768→4

## Independent auditor real-click measure (`0729c12f`)

Evidence: `v6-mobile-click-e0729c12/v6-mobile-click-report.json` (Playwright clicks + `getBoundingClientRect`, not fireEvent).

Dark 375×812 partner page after fix:

- `rowGrid`: `24px 151.5px 151.5px`
- `openWidth`: **315** (was 0)
- partner → client → back: **OK**
- KPI cols: **4**
- Expanded group + flat list real clicks: **OK** (all 5 widths × 2 themes in report `pass=true`)

1440: partner→client→back, edit/cancel discards draft, save disabled — **OK** (UI-only).

## Still not section acceptance

- Gate/Context/route/history helper/vitest ≠ EXACT `57ca4680`
- Personal persistence / referred / receiving contracts remain **BLOCKED_***
- Do **not** unblock by borrowing AgentClient deletion
- No DB / rights / infrastructure / formulas / prod changes
