# Agent profile parity matrix

Legend: **CLOSED** · **PARTIAL** · **OPEN** · **NOT_RUN**

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Pure agent tabs + no legacy overview flash | **CLOSED** | Server gate + compact nav |
| 2 | Wizard validation / cancel / review order | **CLOSED** | `profileSaved` vs draft; cancel/hydrate; DELETE BFF+test-user; unit cancel tests |
| 3 | Summary + page visual 1:1 | **PARTIAL** | CSS aligned to frozen ref (860px guide, summary grid, bank inline form); owner visual sign-off pending |
| 4 | Bank block reference | **PARTIAL** | Compact actions + inline form + neutral add; semantics preserved |
| 5 | Evidence capture + browser E2E | **CLOSED** | **9 impl/ref pairs** (18 PNG) + layout metrics; `functionalOk` / `captureOk` separate from `visualParityOk` |
| 6 | Label SQL migration (#682) | **CLOSED** | Pinned checksum; controlled apply integration |

**Dependency:** platform PR **#19** on R03 **#18**; navigator PR **#682** same branch.
