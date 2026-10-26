# STORE-COMPANY-CERTIFICATES-PARITY-01

**Status: READY FOR REVIEW (post-review narrow fixes)**

Frontend-only UX parity for business `/recommendations` (STORE/COMPANY). Scope: confirmed prototype list block (intro stack, single create CTA, optional client-arrived → `/scanner`, text-only collection empty). Full ZIP not available in agent environment.

## Cause (accepted)

Duplicate «Создать сертификат» on empty business list: intro + empty-state panel in `AgentCertificatesList`.

## Post-review fixes (this capture)

| Fix | Detail |
|-----|--------|
| **Compact CTA** | `businessCertCtaWrap` (`width: fit-content`, `justify-self: start`) + scoped `businessCertPrimaryCta` (min-height 44px, radius 10px). Gate asserts desktop CTA width &lt; 75% of list content width. |
| **Real populated gate** | Isolated seed targets **realOwner** (seed order: real-sessions → certificates-shell); runner asserts `totalCount > 0`, table row, then captures populated; filtered-empty via no-match search separately. `populatedTotalCount: 1` per role in `shell-gate.json`. |
| **Evidence tip text** | Uses existing commit `a642121ef7586a3f87ac178baea4e3936db88cbe` as prior evidence baseline; this capture’s docs commit is separate (see below). |

## Runtime vs evidence

| | |
|--|--|
| **Frontend code (gate)** | `188c86bf955d9c198f12426f30576f87f05e7b62` |
| **Backend (unchanged API runtime)** | `0152db578de69c387e73536214ebec940aebda27` |
| **Harness seed overlay** | `remcard-navigator` branch `fix/store-company-certificates-prototype-parity-01` @ `8b09aa64` (isolated `seed-business-certificates-shell.ts` only) |
| **Branch** | `fix/store-company-certificates-prototype-parity-01` (from `1a0fbf32…`) |
| **Capture UTC** | `2026-10-26T07:23:38.000Z` → `2026-10-26T07:23:52.670Z` |
| **Prior evidence tip** | `a642121ef7586a3f87ac178baea4e3936db88cbe` |
| **This evidence tip** | `e65f9ab5` (amended: `git show e65f9ab5:artifacts/store-company-certificates-parity-01/REPORT.md`) |

## Commands / exit

```bash
pnpm exec vitest run src/components/agent-r03/AgentCertificatesList.business-parity.test.tsx  # → component-parity.log, exit 0
pnpm exec tsc --noEmit                                                                          # → tsc.log, exit 0
pnpm run build                                                                                  # → build.log, exit 0
bash scripts/store-company-certificates-parity-01/run-browser-gate.sh
```

- `shell-browser-gate.exit`: **0**
- `shell-gate.json`: `ok: true`, `failures: []`, `flow.store|company.populatedTotalCount: 1`

## Prototype → implementation (unchanged logic)

| Prototype | Implementation |
|-----------|----------------|
| One primary create in stack | `business-certificates-create-cta` inside `business-certificates-create-cta-wrap` |
| Optional closed details + scanner | `business-certificates-client-arrived` → `/scanner` |
| Empty collection text only | `emptyCollection`, no second CTA |
| Populated list | Seeded ordinary owner cert + visible table row before populated PNGs |

## Visual evidence

`visual-shell/`: store/company × **populated** + **filtered-empty** × light/dark × 1440/390/320 (populated @320 allows ≤8px table overflow; filtered-empty ≤2px).

## Limits

Not pixel-perfect for full prototype cabinet; toolbar/table styling beyond confirmed fragment not re-audited.
