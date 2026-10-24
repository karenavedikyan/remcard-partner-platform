# PROF admin moderation — dark contrast hotfix evidence

## Runtime refs (production unchanged)

| Role | Exact SHA |
|------|-----------|
| **Frontend runtime (product hotfix)** | `be43ffc8a34088392635fb9e9079b5929369c117` |
| **Backend runtime (unchanged)** | `5a2c2a7d9d5c03f2b948626dea2a987daa0422a4` |
| **UX-02 published frontend base** | `8b417145ce7c78761e1b86fc833bd28794559da3` |

Evidence files in this directory belong to the **evidence commit** that contains them (see git history on branch `fix/prof-admin-moderation-dark-contrast-01`). Evidence commits do **not** change the product runtime SHA above.

Production deploy, backend, env, and release refs were **not** modified.

## What was measured vs not

**Browser (computed fg/bg, ≥4.5:1 asserted in capture script):**

- Org detail header badges **«На проверке»** and **«Тестовый партнёр»** — light/dark, 390×844 and 1440 (see `computed-contrast.json`, `metadata.json`).
- Org detail **preview + decision buttons** — default / hover / focus-visible text contrast asserted; **disabled** sampled only (opacity 0.55, no WCAG claim).

**CSS file regression (vitest, reads `OrganizationModerationDetail.module.css` + `AdminModeration.module.css`):**

- `badgePending`, `badgeTest`, `statusOk`, `statusError`, queue `badgeTest` light + `:global([data-theme="dark"])` pairs.

**Not measured in browser (no claim):**

- Moderation queue list, partner detail, loading-state buttons, full approve/revise/reject dialog confirm flows.

## Regression proof

See `css-regression-demo.log`: temporarily setting dark `.badgePending` to light-on-light **fails** `src/lib/moderation-badge-contrast.test.ts`; restored CSS passes.

## Commands (exit codes)

| Command | Exit |
|---------|------|
| `npx vitest run src/lib/moderation-badge-contrast.test.ts` | 0 |
| Moderation-focused vitest subset (41 tests, same list as UX-02 gate) | 0 |
| `npx tsc --noEmit` | 0 |
| `MODERATION_HOTFIX_FE_SHA=be43ffc… npx tsx scripts/prof-admin-moderation-dark-contrast/capture-evidence.ts` | 0 |

Capture requires loopback harness (PG `:55432`, backend `:3421`, PROF `:3420` build pinned to FE runtime) and `CATALOG_QA_ROOT` fixtures.

## Measured badge contrast (Chromium)

Values in `computed-contrast.json` — dark 390 pending/test both ≥4.5:1 after fix.
