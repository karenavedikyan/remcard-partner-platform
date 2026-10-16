# Agent profile parity matrix

Legend: **CLOSED** · **PARTIAL** · **OPEN** · **NOT_RUN**

| # | Area | Status | Notes |
|---|------|--------|-------|
| 1 | Pure agent tabs + no legacy overview flash | **CLOSED** | Server gate + compact nav; tab strip full-width divider |
| 2 | Wizard validation / cancel / review order | **CLOSED** | `profileSaved` vs draft; cancel/hydrate; DELETE BFF+test-user |
| 3 | Summary + page layout (measured) | **CLOSED** | 1440 widths/x; mobile badge row; status DOM |
| 4 | Bank block reference | **CLOSED** | Flat records, action order, INN, «Основные» inline |
| 5 | Evidence capture + E2E | **CLOSED** | `functionalOk` / `captureOk` / `geometryOk` / `cssOk` separate from owner `visualReview` |
| 6 | Label SQL migration (#682) | **CLOSED** | Pinned checksum |

**Owner visual review:** `visualParityOk: false`, `visualReview.status: pending_owner_signoff` — not blocking R03-PARITY-TAIL queue entry, but tail work is separate from profile dimension acceptance.
