import type {
  PreAuthConsentsCapability,
  PreAuthConsentRequirement,
  RegistrationPreAuthConsentKind,
} from "./types";

const REQUIRED_KINDS: RegistrationPreAuthConsentKind[] = [
  "PERSONAL_DATA",
  "TERMS",
  "PUBLIC_OFFER_PRO",
];

function parseRequirement(raw: unknown): PreAuthConsentRequirement | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const kind = row.kind;
  if (kind !== "PERSONAL_DATA" && kind !== "TERMS" && kind !== "PUBLIC_OFFER_PRO") {
    return null;
  }
  if (typeof row.legalDocumentId !== "string" || !row.legalDocumentId.trim()) return null;
  if (typeof row.version !== "string" || !row.version.trim()) return null;
  if (typeof row.documentUrl !== "string" || !row.documentUrl.trim()) return null;
  return {
    kind,
    legalDocumentId: row.legalDocumentId.trim(),
    version: row.version.trim(),
    documentUrl: row.documentUrl.trim(),
  };
}

/** Normalize additive preAuthConsents block from registration capabilities. */
export function normalizePreAuthConsents(raw: unknown): PreAuthConsentsCapability | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const block = raw as Record<string, unknown>;
  const contractVersion =
    typeof block.contractVersion === "string" ? block.contractVersion.trim() : "";
  if (block.available !== true) {
    return {
      contractVersion,
      available: false,
      requirements: [],
      reason:
        typeof block.reason === "string" && block.reason.trim()
          ? block.reason.trim()
          : "NO_ACTIVE_DOCUMENT",
    };
  }
  const parsed = (Array.isArray(block.requirements) ? block.requirements : [])
    .map(parseRequirement)
    .filter((item): item is PreAuthConsentRequirement => item != null);
  const kinds = new Set(parsed.map((item) => item.kind));
  const complete =
    parsed.length === REQUIRED_KINDS.length && REQUIRED_KINDS.every((kind) => kinds.has(kind));
  if (!complete) {
    return {
      contractVersion,
      available: false,
      requirements: [],
      reason: "NO_ACTIVE_DOCUMENT",
    };
  }
  const ordered = REQUIRED_KINDS.map(
    (kind) => parsed.find((item) => item.kind === kind) as PreAuthConsentRequirement,
  );
  return {
    contractVersion,
    available: true,
    requirements: ordered,
  };
}

export function preAuthConsentsUnavailableMessage(
  block: PreAuthConsentsCapability | null | undefined,
): string {
  if (!block) {
    return "Не удалось загрузить актуальные соглашения. Обновите страницу или повторите позже.";
  }
  if (block.available) return "";
  if (block.reason === "NO_ACTIVE_DOCUMENT") {
    return "Обязательные соглашения временно недоступны. Повторите позже.";
  }
  return "Не удалось загрузить актуальные соглашения. Обновите страницу или повторите позже.";
}
