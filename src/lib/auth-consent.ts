import type { ConsentRequirement } from "@/lib/cabinet-readiness";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import { consentRequirementKey } from "@/lib/auth-session";

const CONSENT_LABELS: Record<string, string> = {
  PERSONAL_DATA: "обработку персональных данных",
  TERMS: "пользовательское соглашение",
  PUBLIC_OFFER_PRO: "публичную оферту для партнёров",
};

export function consentLabel(kind: string): string {
  return CONSENT_LABELS[kind] ?? kind;
}

export function consentErrorMessage(status: number, body: { error?: string } | null): string {
  if (status === 409 && body?.error === "DOCUMENT_VERSION_MISMATCH") {
    return "Документ обновился. Ознакомьтесь с новой версией и примите снова.";
  }
  if (status === 503 && body?.error === "NO_ACTIVE_DOCUMENT") {
    return "Документ временно недоступен. Попробуйте позже.";
  }
  if (status === 401) {
    return "Сессия завершилась. Войдите снова.";
  }
  if (status >= 500) {
    return "Не удалось сохранить согласие. Попробуйте позже.";
  }
  return "Не удалось сохранить согласие.";
}

export function isDocumentVersionMismatch(error: unknown): boolean {
  return (
    error instanceof RemcardApiError &&
    error.status === 409 &&
    error.body?.error === "DOCUMENT_VERSION_MISMATCH"
  );
}

/** Record only the provided requirements; stops on first failure. */
export async function recordConsentRequirements(
  requirements: ConsentRequirement[],
  accepted: Set<string>,
): Promise<void> {
  for (const req of requirements) {
    const key = consentRequirementKey(req);
    if (!accepted.has(key)) {
      throw new Error("Примите все обязательные соглашения.");
    }
    if (!req.legalDocumentId) {
      throw new RemcardApiError(503, consentErrorMessage(503, { error: "NO_ACTIVE_DOCUMENT" }), {
        error: "NO_ACTIVE_DOCUMENT",
      });
    }
    try {
      await remcardFetch("/api/account/consent", {
        method: "POST",
        body: { kind: req.kind, legalDocumentId: req.legalDocumentId },
      });
    } catch (caught) {
      if (caught instanceof RemcardApiError) {
        throw new RemcardApiError(
          caught.status,
          consentErrorMessage(caught.status, caught.body),
          caught.body,
        );
      }
      throw caught;
    }
  }
}
