# Agent profile parity matrix

Legend: **CLOSED** · **PARTIAL** · **OPEN** · **NOT_RUN**

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Pure agent tabs + no legacy overview flash | **CLOSED** | Server gate + `initialPureAgentCompact`; pending nav when gate unknown |
| 2 | Wizard validation / cancel / review order | **PARTIAL** | Local step-0 checks, `Отменить` + DELETE draft; full jump rules server-side |
| 3 | Summary + page visual 1:1 | **OPEN** | CSS tokens adjusted (bank); full-page paired PNG pending |
| 4 | Bank block reference | **PARTIAL** | Title, optional label, view/copy, compact cards; inline form |
| 5 | Evidence PNG + browser E2E | **OPEN** | `TEST-RESULTS.json` from RC script; run `AGENT_PROFILE_VISUAL=1` for captures |

**Dependency:** platform PR **#19** stacks on R03 **#18**; navigator backend PR same branch name.
