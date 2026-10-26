# REPORT — public agent terms (closure)

## Status
READY FOR REVIEW

## Runtime SHAs
- Frontend: `1b04a9a647bba5c5a2950608076ba490f0643bb2`
- Backend: `ba0e2f09aed404923c7815351d014a991b6154f5`
- Capture: `2026-10-26T08:51:38.000Z`

## Closure
1. UI: Playwright click-through + editor captures (see visual-clickthrough/)
2. Server: accept_pending legacy vs strict empty-request, prof-test limits guard (integration)
3. Shell API gate: org limit POST/GET/DELETE + certificate builder 11.5% stability

## Failures
- none

## Extra
{
  "partnershipId": "cmvp0pcpx002fjs8nurpqo5n4",
  "storeUserId": "cmvozxki00000jsxvah2n66q7",
  "version11": "2026-10-26T08:51:40.082Z",
  "version115": "2026-10-26T08:51:40.565Z",
  "termBeforeAccept": {
    "id": "cmvp0pdat002ojs8nky40d75n",
    "partnershipId": "cmvp0pcpx002fjs8nurpqo5n4",
    "category": "doors",
    "categoryLabel": "Двери",
    "storePercent": 11.5,
    "minMargin": null,
    "isExcluded": false,
    "validFrom": "2026-10-26T08:51:40.565Z",
    "validUntil": null,
    "createdAt": "2026-10-26T08:51:40.565Z",
    "updatedAt": "2026-10-26T08:51:40.565Z"
  },
  "evidence": {
    "steps": [
      "read-summary-12.5",
      "agent-request-no-terms",
      "partner-offer-11",
      "agent-request-changes-10",
      "accept-11.5",
      "certificate-builder-11.5",
      "org-limit-edit-no-partnership-mutation"
    ]
  }
}
