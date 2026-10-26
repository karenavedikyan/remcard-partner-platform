# UI delta — agent-terms editor theme

## Status
READY FOR REVIEW

## Runtime
- Frontend (this capture): `f3b996714e2900a20a7ff1d99b8f2d45315a876b`
- Backend (unchanged): `1267da4274826e06b7358f1a785fe275c9cec836`
- Capture: `2026-10-26T09:54:00.000Z`

## Scope
Dark/light contrast fix for `PartnerAgentGeneralTermsEditor` only. Full partnership logic gate remains on FE `9d54e58a9b25dc83282781bffb8820b83e6f845d` at `2026-10-26T09:23:48.000Z` (not re-run).

## Commands
```bash
pnpm exec tsc --noEmit
pnpm run build
pnpm exec vitest run src/components/partners/PartnerAgentGeneralTermsEditor.test.tsx
node scripts/public-agent-terms-and-invite-flow-01/capture-agent-terms-editor-ui.mjs
```

## Contrast (computed)
[
  {
    "label": "light-1440 lead on panel surface",
    "ratio": 5.04,
    "minRequired": 4.5
  },
  {
    "label": "light-1440 category select",
    "ratio": 14.79,
    "minRequired": 4.5
  },
  {
    "label": "dark-1440 lead on panel surface",
    "ratio": 6.84,
    "minRequired": 4.5
  },
  {
    "label": "dark-1440 category select",
    "ratio": 13.73,
    "minRequired": 4.5
  },
  {
    "label": "light-390 lead on panel surface",
    "ratio": 5.04,
    "minRequired": 4.5
  },
  {
    "label": "light-390 category select",
    "ratio": 14.79,
    "minRequired": 4.5
  },
  {
    "label": "dark-390 lead on panel surface",
    "ratio": 6.84,
    "minRequired": 4.5
  },
  {
    "label": "dark-390 category select",
    "ratio": 13.73,
    "minRequired": 4.5
  }
]

## Failures
- none

## Artifact note (non-blocking)
`visual-clickthrough/agent-accept-dark-390.png` from the prior full gate is a **light-theme outgoing queue** frame, not dark acceptance proof — do not use it as acceptance evidence.

## Not claimed
- Historical certificate snapshot lifecycle
- Concurrency of all partnership offer-write paths
