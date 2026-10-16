# Agent profile parity matrix

Legend: **CLOSED** · **PARTIAL** · **OPEN** · **NOT_RUN**

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Pure agent tabs + no legacy overview flash | **CLOSED** | Server gate + compact nav |
| 2 | Wizard validation / cancel / review order | **CLOSED** | `profileSaved` vs draft; cancel/hydrate; DELETE BFF+test-user; unit cancel tests |
| 3 | Summary + page visual 1:1 | **PARTIAL** | 18 impl/ref PNG pairs captured (`agent-profile-parity-full.mjs`); layout/chrome differs (product nav, typography, spacing); **no pixel-identical PASS claimed** |
| 4 | Bank block reference | **CLOSED** | Lazy detail GET, copy text (label+legalName+KPP), revise `expectedVersion`, label on detail/revise; panel copy regression tests |
| 5 | Evidence PNG + browser E2E | **CLOSED** | Fresh loopback stack 3043/3044, auth/me aligned; browser cancel paths + draft reload; `profile-parity-e2e.json` ok |
| 6 | Label SQL migration (#682) | **CLOSED** | Pinned checksum `2ff7aba9…`; `PROF_R02_RUN_PG=1` controlled apply integration exit 0 |

**Dependency:** platform PR **#19** on R03 **#18**; navigator PR **#682** same branch.
