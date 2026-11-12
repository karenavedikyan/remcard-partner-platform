/**
 * Stage B read contract — frontend DTO only until GET /api/partnership/list enrichment is approved.
 * Do not add proxy routes or client fetches; reuse list payload nested storeUser/proUser.
 */

/** Fields allowed on each counterparty `PartnershipUser` after additive list enrichment. */
export const COUNTERPARTY_PROFILE_LIST_ENRICHMENT_ALLOWLIST = [
  "publicId",
  "profileDescription",
  "partnershipContact",
  "branchCities",
] as const;

export type CounterpartyProfileListEnrichmentField =
  (typeof COUNTERPARTY_PROFILE_LIST_ENRICHMENT_ALLOWLIST)[number];

/**
 * Backend must scope values to the authenticated viewer's partnership row (no search/catalog leakage).
 * - `publicId`: same string as own profile (`profile.user.publicId`, RC-XXXX-YYYY); never internal id.
 * - `profileDescription`: cooperation-facing about text (not registration draft).
 * - `partnershipContact`: dedicated cooperation contact (not `/api/pro/profile` private fields).
 * - `branchCities`: geography beyond single `city` (branch/service area labels).
 */
export const COUNTERPARTY_PROFILE_CONTRACT_REQUIRED = {
  route: "GET /api/partnership/list",
  nested: ["partnerships[].storeUser", "partnerships[].proUser"] as const,
  additiveFields: COUNTERPARTY_PROFILE_LIST_ENRICHMENT_ALLOWLIST,
  forbiddenClientSources: [
    "GET /api/partnership/search",
        "/partner/[id] public catalog",
    "GET /api/pro/profile for counterparty id",
  ] as const,
} as const;
