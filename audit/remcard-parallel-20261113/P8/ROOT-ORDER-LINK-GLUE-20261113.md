# Root order-link glue (P8 delivery @ `cursor/remcard-p8-acceptance-20261113`)

**Authorized:** SOURCE-only association; **no** DB/migrate/prod apply.

## Delivered paths (this branch)

| Layer | Path |
|-------|------|
| P4 routes | `src/lib/clients-parity/receiving-appeal-routes.ts` |
| K8 core | `src/lib/clientAppeals/orderLink.ts`, `orderLink.types.ts`, `orderLinkHttp.ts` |
| K8 QA repo | `src/lib/clientAppeals/orderLink.inMemoryRepository.ts` |
| P6 client | `receiving-order-link-client.ts`, `receiving-appeal-scanner-context.ts` |
| P6 scanner | `useReceivingAppealOrderLink.ts`, `ReceivingAppealOrderLinkBanner.tsx`, `ScannerHubWithAppeal.tsx`, `ScannerHub.tsx` |
| P1 proxy | `remcard-proxy.ts` allowlist + `order-link` POST |
| Return | `ClientsDirectionWorkspaceWithQuery.tsx`, `receivingAppealPurchaseDetailHrefWithReturn` |

## Owner handoff (not vendored)

| Owner | Action |
|-------|--------|
| **P4** `9d22694f` | Re-export / replace static `RECEIVING_APPEAL_ORDER_PIPELINE_HREF` with `buildReceivingAppealOrderPipelineHref(appealId)` |
| **P6** `2375944e` | Detail host uses same routes module; card reload on return query |
| **K1** | Mount `handleReceivingAppealOrderLinkPost` + trusted write gate; **no** posted scope |
| **K8** | Copy `orderLink.ts` to navigator; wire Prisma tx |
| **P4/P6** | Purchase detail **return context** from `receivingAppealId` query — **open** |

## Scoped tests (serial)

`receiving-appeal-routes` (4) · `orderLink` (4) · `orderLinkHttp` (2) · `order-link-client` (1) · `useReceivingAppealOrderLink` (2) = **13 PASS** (mocked).

**Browser:** NOT_VERIFIED · **Live API:** NOT_VERIFIED
