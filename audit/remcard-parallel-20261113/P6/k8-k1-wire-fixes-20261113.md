# П6 wire fixes (Root review vs `4dca7af7`)

| # | Fix |
|---|-----|
| 1 | List query `bucket=` (not `tab`); `stage=` = **stageKey** from `receivingStageKeyForStatusFilter` |
| 2 | `referrerProUserId`, `paidAmountKopecks`, `originKind` certificate\|manual |
| 3 | `unwrapReceivingPartnerSettingsWire` + `settingsVersion` CAS |
| 4 | Certificate-entry `{ promoCode }`; HTTP 200 `valid: false` → no appeal |
| 5 | Detail `ReceivingAppealDetailPayload` (revision, history `authorLabel`) — **P4** UI |
| 6 | Split `patchReceivingAppealProfile` / `patchReceivingAppealStage`; **no** finance PATCH from UI |

**Gaps (report only):** custom manual channel persistence beyond K8 option union; finance stage transitions via non-Clients routes.
