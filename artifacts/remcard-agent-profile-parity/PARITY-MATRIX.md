# Agent profile parity matrix

Legend: **CLOSED** · **PARTIAL** · **OPEN** · **NOT_RUN**

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Pure agent tabs + no legacy overview flash | **CLOSED** | Server gate + compact nav |
| 2 | Wizard validation / cancel / review order | **CLOSED** | `profileSaved` vs draft; cancel/hydrate; DELETE BFF+test-user; unit cancel tests |
| 3 | Summary + page visual 1:1 | **CLOSED** | 1440 geometry: summary **564px**, bank **1096px**, Δ≤4px; ref DOM/CSS layout (no 860px guide) |
| 4 | Bank block reference | **CLOSED** | Flat records, action order, disclosure, form layout, INN on expand |
| 5 | Evidence capture + browser E2E | **CLOSED** | impl/ref PNG + layout metrics; separate functional/capture/geometry gates |
| 6 | Label SQL migration (#682) | **CLOSED** | Pinned checksum; controlled apply integration |

**Dependency:** platform PR **#19** on R03 **#18**; navigator PR **#682** same branch (backend unchanged this pass).
