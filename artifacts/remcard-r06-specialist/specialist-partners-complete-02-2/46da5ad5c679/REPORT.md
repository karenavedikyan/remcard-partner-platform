# SPECIALIST-PARTNERS-COMPLETE-02.2

| | |
|--|--|
| Frontend code SHA | `46da5ad` |
| Frontend evidence SHA | `adbd985` (after recapture, see git tip) |
| Backend SHA | `7ad87973` |
| BUILD_ID (evidence run) | `qf9qL8GeCeKHFB_-6GpOX` |
| BUILD_ID (local `npm run build`) | `CEupgT82AmqxU_fJycfqN` |

## Four items

| # | Item | Done | Verified |
|---|------|------|----------|
| 1 | Real categories in discussion → invite form | Backend DTO + `discussionContextToInviteTarget` maps storeCategories, org partner type, specializations | Unit: `partners-hub-presentation.test.ts` (STORE doors); backend `partnershipDiscussionCounterparty.test.ts` |
| 2 | «Найдено» = filtered visible count | Toolbar `count={visiblePartnerships.length}` | Logic + MOCK list UI |
| 3 | Bulk hide confirmation | `PartnerListHideDialog` with fixed IDs; cancel = no PATCH | MOCK capture `impl-specialist-bulk-hide-confirm-1440-light.png` (re-run script if duplicate hash) |
| 4 | Design surfaces (list/find/link/discussion list) | CSS: discussion panel, link list cards, modal rhythm, tabs focus | MOCK screenshots 1440/375 light + find 375 dark |

## NOT_RUN

- PG integration (`partnershipComplete02` todos)
- DB persistence for hide/discussion

## Captures

See `REPORT.json` and `impl-*.png` in this folder.
