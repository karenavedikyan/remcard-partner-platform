/**
 * Approved additive counterparty fields on GET /api/partnership/list (production92495f42).
 * Frontend DTO only — no proxy or new routes.
 */

export const COUNTERPARTY_PROFILE_LIST_ENRICHMENT_ALLOWLIST = [
  "publicId",
  "description",
  "partnershipContact",
  "areas",
] as const;

export type CounterpartyProfileListEnrichmentField =
  (typeof COUNTERPARTY_PROFILE_LIST_ENRICHMENT_ALLOWLIST)[number];

export const COUNTERPARTY_PROFILE_CONTRACT_REQUIRED = {
  route: "GET /api/partnership/list",
  nested: ["partnerships[].storeUser", "partnerships[].proUser"] as const,
  additiveFields: {
    publicId: "string | null",
    description: "string | null",
    areas: "string[]",
    partnershipContact: "{ name: string | null; phone: string | null; email: string | null }",
  },
  preservedExistingFields: ["city", "branches (server-side; surfaced via areas when enriched)"] as const,
  forbiddenClientFallbacks: [
    "registration/auth phone or email",
    "internal user id as publicId",
    "GET /api/partnership/search",
    "public /partner/[id]",
    "GET /api/pro/profile for counterparty",
  ] as const,
} as const;
