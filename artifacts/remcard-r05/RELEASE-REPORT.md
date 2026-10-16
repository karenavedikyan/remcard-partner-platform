# R05.3 — RELEASE REPORT

| Repo | PR | Branch |
|------|-----|--------|
| remcard-navigator | [#686](https://github.com/karenavedikyan/remcard-navigator/pull/686) | `cursor/r05-agent-receivables-b3e3` |
| remcard-partner-platform | [#23](https://github.com/karenavedikyan/remcard-partner-platform/pull/23) | `cursor/r05-agent-receivables-b3e3` |

## Scope (R05.3 only)

1. **Reference evidence** — frozen prototype served over `http://127.0.0.1:<port>/roles.html` (not `file://`); Playwright flow cabinet → agent → wallet → `settlement-direction:in` → partners/orders/detail; FAIL on «Не удалось загрузить прототип»; `roles.js` SHA gate.
2. **Mobile detail + requisites** — order detail loading/error/retry; captures wait for BFF + lines + history; requisites under `agentScope` with `--pw-*` token checks; table scroll contained on 375/320.
3. **Applicable visual** — wallet panel + bordered tabs; focus header sizing; grid 3/2 desktop verified via computed columns + PNGs.

**Unchanged (R05.2 accepted):** partner aggregate key, purchase sort, incoming-only settlements, financial read model — navigator HEAD unchanged unless noted in `TEST-RESULTS.json`.

**Not claimed:** pixel-perfect parity (`visualParityOk: false`); identical demo vs seed datasets.

## Evidence

- Paired PNGs: `impl-r05-*` and `ref-r05-{overview,partners,orders,order-detail}-{1440,375}-light|dark.png`
- Requisites: `impl-r05-requisites-375-light.png`, `impl-r05-requisites-375-dark.png`
- Grids: `impl-r05-partners-1440-light-small.png`, `-medium.png`

See `TEST-RESULTS.json` for exact HEAD SHAs, command exit codes, and section PASS/FAIL.
