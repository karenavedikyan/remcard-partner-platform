# STORE-COMPANY-CERTIFICATES-PARITY-01

**Status: READY FOR REVIEW**

Frontend-only UX parity for business `/recommendations` (STORE/COMPANY) against the owner-provided prototype fragment (`roles.js` → `legacyLa()` → `page === "recommendations"`). Full ZIP was not available in this environment; scope is the confirmed list structure (intro stack, single create CTA, optional client-arrived block, text-only collection empty).

## Cause

`AgentCertificatesList` rendered **two** «Создать сертификат» buttons on an empty business list: one in the issuer intro block and a duplicate in the empty-state panel (same handler).

## Minimal diff

| Area | Change |
|------|--------|
| `AgentCertificatesList.tsx` | Business intro → prototype **stack** (description → one primary CTA → closed `<details>` with scanner link); empty state → **text only** (no second CTA). Specialist/agent paths unchanged (specialist empty still offers inline create). |
| `business-owner-certificates/copy.ts` | Prototype strings for empty collection + client-arrived block. |
| `agent-r03.module.css` | Scoped `.businessCertStack`, `.businessCertOptional`, ghost scanner link styling (spacing/radius aligned to prototype tokens). |

## Prototype → implementation

| Prototype | Implementation |
|-----------|----------------|
| One primary «Создать сертификат» in stack | `data-testid="business-certificates-create-cta"` (only list-level create before dialog) |
| Muted intro paragraph | `issuerPageCopy.description` (unchanged text) |
| `<details optional>` closed + ghost «Проверить сертификат» → scan | `business-certificates-client-arrived` → `Link href="/scanner"` |
| Collection empty string, no inner CTA | `emptyCollection` in empty panel |
| Shared list component | Still `AgentCertificatesList accessMode="business"` via `RecommendationsRouteBody` |

## Unchanged

- Backend **`0152db578de69c387e73536214ebec940aebda27`** (no API/schema/migration edits).
- Certificate create/detail/QR/PDF/discount/archive flows and prof-test guards.
- AGENT `/certificates` and specialist issuer shell (duplicate empty CTA retained for specialist by design).

## Runtime vs evidence

| | SHA / time |
|--|--|
| **Frontend code (gate)** | `4eb3e95b69ced4f99663ed7b1f021470a0f120ee` |
| **Backend (unchanged)** | `0152db578de69c387e73536214ebec940aebda27` |
| **Branch** | `fix/store-company-certificates-prototype-parity-01` (from `1a0fbf32…`) |
| **Capture UTC** | `2026-10-26T07:13:25.000Z` → `2026-10-26T07:13:35.418Z` |
| **Evidence tip** | Docs/artifacts commit on this branch (see `git show` for `REPORT.md`) |

## Commands / exit

```bash
pnpm exec vitest run src/components/agent-r03/AgentCertificatesList.business-parity.test.tsx  # exit 0 → component-parity.log
pnpm exec tsc --noEmit                                                                          # exit 0 → tsc.log
bash scripts/store-company-certificates-parity-01/run-browser-gate.sh                           # full isolated gate
# or shell only (when harness already up):
node scripts/store-company-certificates-parity-01/run-certificates-parity-shell-e2e.mjs         # exit 0 → shell-gate.json
```

- `shell-browser-gate.exit`: **0**
- `shell-gate.json`: `ok: true`, `failures: []`
- Component tests: **14 passed** (STORE + COMPANY × empty/populated/archive/filter/loading/error/dialog)

## Visual evidence

Whole-shell PNGs under `visual-shell/` (light/dark × 1440/390/320, overflow ≤2px):

- `store-certificates-populated-*`, `store-certificates-filtered-empty-*`
- `company-certificates-populated-*`, `company-certificates-filtered-empty-*`

## Limits

Pixel-perfect parity for the full prototype cabinet was **not** claimed—only the confirmed recommendations list block above. Toolbar/table/card styling beyond that fragment was not re-audited.
