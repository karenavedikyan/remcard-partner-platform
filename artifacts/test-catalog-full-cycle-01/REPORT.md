# TEST-CATALOG-FULL-CYCLE-01 (frontend)

Baseline: `6e41d066c80bcc4028d3503b5d571169404c3d24`. Branch: `fix/test-catalog-full-cycle-01`.

**Runtime code SHA:** see `git rev-parse` on latest non-docs commit (not embedded in this file).

## Submit + refresh failure (runtime)

- Shared helper: `src/lib/catalog-submit-publication.ts` — optimistic `PENDING`, `submitAcceptedPendingSync`, GET recovery without second POST.
- Wizards + `ProfileCatalogSection`: guard at submit entry; hide submit after accept; lock fields via `publicationEditable`; «Обновить статус» button.

## Tests (latest agent run)

| Suite | Result |
|-------|--------|
| Independent regression + new submit tests | **16 passed** (incl. `CatalogWizard.submit-flow.test.tsx`, `catalog-submit-publication.test.ts`) |
| `pnpm exec tsc --noEmit` | **exit 0** |
| `pnpm run build` | **pass** |

## Environment / E2E

| Step | Result |
|------|--------|
| Browser E2E 1440/390 real screens | **BLOCKED** — no isolated prof + remcard stack in cloud VM |
| Full wizard lifecycle with live moderation | **BLOCKED** — same as backend PG gate |

## Not READY for release

Depends on backend migration + full lifecycle proof.
