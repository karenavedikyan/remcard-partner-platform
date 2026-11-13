import type { PreAuthConsentsCapability } from "./types";

export const QA_PRE_AUTH_CONSENTS: PreAuthConsentsCapability = {
  contractVersion: "2026-11-13.pre-auth-consent.v1",
  available: true,
  requirements: [
    {
      kind: "PERSONAL_DATA",
      legalDocumentId: "qa-privacy",
      version: "2026-11-01",
      documentUrl: "/privacy",
    },
    {
      kind: "TERMS",
      legalDocumentId: "qa-terms",
      version: "2026-11-01",
      documentUrl: "/terms",
    },
    {
      kind: "PUBLIC_OFFER_PRO",
      legalDocumentId: "qa-offer",
      version: "2026-11-01",
      documentUrl: "/legal/public-offer-pro",
    },
  ],
};
