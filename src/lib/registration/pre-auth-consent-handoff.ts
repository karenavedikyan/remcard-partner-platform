import type { ConsentRequirement, CabinetReadiness } from "@/lib/cabinet-readiness";
import { registrationConsentRequirements } from "@/lib/cabinet-readiness";
import { consentRequirementKey } from "@/lib/auth-session";
import { isDocumentVersionMismatch, recordConsentRequirements } from "@/lib/auth-consent";
import { RemcardApiError } from "@/lib/api-client";
import type { RegistrationKind } from "./types";
import {
  assertPreAuthSnapshotUser,
  bindPreAuthSnapshotToVerifiedUser,
  clearPreAuthConsentSnapshot,
  loadPreAuthConsentSnapshot,
  markPreAuthSnapshotConsumed,
  type PreAuthConsentSnapshot,
} from "./pre-auth-consent";

export type PreAuthHandoffRetryKind = "session_lost" | "server" | "network" | "blocked";

export type PreAuthHandoffResult =
  | { status: "skipped" }
  | { status: "applied" }
  | { status: "needs_ui"; message?: string; unmatchedPending?: ConsentRequirement[] }
  | { status: "error"; message: string; retryKind: PreAuthHandoffRetryKind };

function snapshotEntryForPending(
  snapshot: PreAuthConsentSnapshot,
  pending: ConsentRequirement,
) {
  return snapshot.requirements.find(
    (saved) =>
      saved.kind === pending.kind &&
      saved.legalDocumentId &&
      pending.legalDocumentId &&
      saved.legalDocumentId === pending.legalDocumentId &&
      saved.version === pending.version,
  );
}

export function partitionPendingByPreAuthSnapshot(
  snapshot: PreAuthConsentSnapshot,
  pending: ConsentRequirement[],
): { matching: ConsentRequirement[]; unmatchedPending: ConsentRequirement[] } {
  const matching: ConsentRequirement[] = [];
  const unmatchedPending: ConsentRequirement[] = [];
  for (const req of pending) {
    if (!req.legalDocumentId) {
      unmatchedPending.push(req);
      continue;
    }
    if (snapshotEntryForPending(snapshot, req)) {
      matching.push(req);
    } else {
      unmatchedPending.push(req);
    }
  }
  return { matching, unmatchedPending };
}

export async function applyRegistrationPreAuthConsentHandoff(
  kind: RegistrationKind,
  userId: string,
  readiness: CabinetReadiness,
): Promise<PreAuthHandoffResult> {
  const pending = registrationConsentRequirements(readiness).filter(
    (req) => req.legalDocumentId && req.status !== "no_active_document",
  );
  if (pending.length === 0) {
    return { status: "skipped" };
  }

  const snapshot = loadPreAuthConsentSnapshot(kind);
  if (!snapshot) {
    return {
      status: "needs_ui",
      message:
        "Сначала примите актуальные соглашения перед входом или отметьте их после проверки личности.",
      unmatchedPending: pending,
    };
  }

  if (snapshot.consumedForUserId && snapshot.consumedForUserId !== userId) {
    clearPreAuthConsentSnapshot(kind);
    return {
      status: "needs_ui",
      message: "Соглашения были приняты в другом входе. Подтвердите актуальные документы снова.",
      unmatchedPending: pending,
    };
  }

  if (snapshot.consumedForUserId === userId) {
    return { status: "skipped" };
  }

  const userBinding = assertPreAuthSnapshotUser(kind, userId);
  if (userBinding === "different") {
    clearPreAuthConsentSnapshot(kind);
    return {
      status: "needs_ui",
      message: "Соглашения относятся к другому входу. Подтвердите документы снова.",
      unmatchedPending: pending,
    };
  }
  if (userBinding === "missing") {
    return {
      status: "needs_ui",
      message: "Подтвердите соглашения после проверки личности.",
      unmatchedPending: pending,
    };
  }

  const { matching, unmatchedPending } = partitionPendingByPreAuthSnapshot(snapshot, pending);
  if (matching.length === 0) {
    clearPreAuthConsentSnapshot(kind);
    return {
      status: "needs_ui",
      message:
        "Версии соглашений изменились. Ознакомьтесь с актуальными документами и примите их снова.",
      unmatchedPending,
    };
  }

  const accepted = new Set(matching.map((req) => consentRequirementKey(req)));
  if (!bindPreAuthSnapshotToVerifiedUser(kind, userId)) {
    return {
      status: "error",
      message: "Не удалось закрепить соглашения за входом. Повторите проверку.",
      retryKind: "server",
    };
  }
  try {
    await recordConsentRequirements(matching, accepted);
  } catch (caught) {
    if (isDocumentVersionMismatch(caught)) {
      clearPreAuthConsentSnapshot(kind);
      return {
        status: "needs_ui",
        message:
          caught instanceof RemcardApiError
            ? caught.message
            : "Документ обновился. Ознакомьтесь с новой версией и примите снова.",
        unmatchedPending: pending,
      };
    }
    if (caught instanceof RemcardApiError) {
      if (caught.status === 401) {
        return {
          status: "error",
          message: "Сессия завершилась. Войдите снова.",
          retryKind: "session_lost",
        };
      }
      if (caught.status === 403) {
        return {
          status: "error",
          message: "Аккаунт заблокирован.",
          retryKind: "blocked",
        };
      }
      if (caught.status >= 500) {
        return {
          status: "error",
          message: caught.message,
          retryKind: "server",
        };
      }
      return { status: "error", message: caught.message, retryKind: "server" };
    }
    return {
      status: "error",
      message: "Не удалось сохранить согласия. Попробуйте позже.",
      retryKind: "network",
    };
  }

  if (unmatchedPending.length > 0) {
    return {
      status: "needs_ui",
      message:
        "Часть соглашений обновилась. Подтвердите оставшиеся документы, чтобы продолжить регистрацию.",
      unmatchedPending,
    };
  }

  markPreAuthSnapshotConsumed(kind, userId);
  clearPreAuthConsentSnapshot(kind);
  return { status: "applied" };
}
