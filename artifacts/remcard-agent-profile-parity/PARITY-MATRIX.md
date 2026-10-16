# Agent profile parity matrix

Legend: **CLOSED** · **PARTIAL** · **OPEN** · **NOT_RUN**

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Pure agent tabs + no legacy overview flash | **CLOSED** | Server gate + compact nav |
| 2 | Wizard validation / cancel / review order | **CLOSED** | `profileSaved` vs draft; cancel/hydrate; DELETE BFF+test-user; unit cancel tests |
| 3 | Summary + page visual 1:1 | **OPEN** | Runner `agent-profile-parity-full.mjs`; PNG blocked on local JWT/stack (see TEST-RESULTS) |
| 4 | Bank block reference | **CLOSED** | Lazy detail GET, copy text (label+legalName+KPP), revise `expectedVersion`, label on detail/revise |
| 5 | Evidence PNG + browser E2E | **PARTIAL** | BFF flows scripted; Playwright blocked same stack issue; no pixel PASS claimed |
| 6 | Label SQL migration (#682) | **CLOSED** | `20261016180000_prof_r02_agent_requisites_label` + controlled apply script/checksum |

**Dependency:** platform PR **#19** on R03 **#18**; navigator PR **#682** same branch.
