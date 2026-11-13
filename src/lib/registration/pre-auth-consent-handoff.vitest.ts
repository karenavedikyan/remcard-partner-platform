import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CabinetReadiness } from "@/lib/cabinet-readiness";
import { QA_PRE_AUTH_CONSENTS } from "./pre-auth-consent-fixtures";
import {
  bindPreAuthSnapshotToVerifiedUser,
  clearPreAuthConsentSnapshot,
  createPreAuthAttemptId,
  loadPreAuthConsentSnapshot,
  markPreAuthHandoffPending,
  savePreAuthConsentSnapshot,
} from "./pre-auth-consent";

vi.mock("@/lib/auth-consent", () => ({
  isDocumentVersionMismatch: (error: unknown) =>
    Boolean(
      error &&
        typeof error === "object" &&
        "status" in error &&
        (error as { status: number }).status === 409,
    ),
  recordConsentRequirements: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    body: { error?: string } | null;
    constructor(status: number, message: string, body: { error?: string } | null = null) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

import { recordConsentRequirements } from "@/lib/auth-consent";
import { RemcardApiError } from "@/lib/api-client";
import { applyRegistrationPreAuthConsentHandoff } from "./pre-auth-consent-handoff";

const pendingReadiness: CabinetReadiness = {
  nextStep: "consents",
  missingConsents: QA_PRE_AUTH_CONSENTS.requirements.map((req) => ({
    kind: req.kind,
    legalDocumentId: req.legalDocumentId,
    version: req.version,
    url: req.documentUrl,
    status: "missing" as const,
  })),
  needsProfileOnboarding: true,
  canAccessCabinet: false,
  isEmployee: false,
  isAdmin: false,
};

describe("applyRegistrationPreAuthConsentHandoff", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    vi.clearAllMocks();
    store.clear();
    Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        clear: () => store.clear(),
      },
    });
    clearPreAuthConsentSnapshot("agent");
  });

  function seedAgentHandoff(userId: string) {
    const attempt = createPreAuthAttemptId();
    savePreAuthConsentSnapshot("agent", QA_PRE_AUTH_CONSENTS.requirements, attempt);
    markPreAuthHandoffPending("agent", attempt);
    bindPreAuthSnapshotToVerifiedUser("agent", userId);
  }

  it("does not auto POST for another user after partial verify binding", async () => {
    seedAgentHandoff("user-a");
    const result = await applyRegistrationPreAuthConsentHandoff("agent", "user-b", pendingReadiness);
    expect(result.status).toBe("needs_ui");
    expect(recordConsentRequirements).not.toHaveBeenCalled();
    expect(loadPreAuthConsentSnapshot("agent")).toBeNull();
  });

  it("returns server retry on consent POST 5xx without consuming snapshot", async () => {
    seedAgentHandoff("user-a");
    vi.mocked(recordConsentRequirements).mockRejectedValue(
      new RemcardApiError(503, "upstream", { error: "UPSTREAM" }),
    );
    const result = await applyRegistrationPreAuthConsentHandoff("agent", "user-a", pendingReadiness);
    expect(result).toMatchObject({ status: "error", retryKind: "server" });
    expect(loadPreAuthConsentSnapshot("agent")?.verifiedForUserId).toBe("user-a");
  });

  it("returns needs_ui with only unmatched docs after partial record (TERMS changed)", async () => {
    seedAgentHandoff("user-a");
    const termsV2 = {
      kind: "TERMS" as const,
      legalDocumentId: "terms-v2",
      version: "2026-12-01",
      url: "/terms",
      status: "missing" as const,
    };
    const readiness: CabinetReadiness = {
      ...pendingReadiness,
      missingConsents: pendingReadiness.missingConsents.map((row) =>
        row.kind === "TERMS" ? termsV2 : row,
      ),
    };
    vi.mocked(recordConsentRequirements).mockResolvedValue(undefined);
    const result = await applyRegistrationPreAuthConsentHandoff("agent", "user-a", readiness);
    expect(result.status).toBe("needs_ui");
    expect(recordConsentRequirements).toHaveBeenCalledTimes(1);
    const posted = vi.mocked(recordConsentRequirements).mock.calls[0]?.[0] ?? [];
    expect(posted.map((row) => row.kind).sort()).toEqual(["PERSONAL_DATA", "PUBLIC_OFFER_PRO"]);
    if (result.status === "needs_ui") {
      expect(result.unmatchedPending?.map((row) => row.kind)).toEqual(["TERMS"]);
    }
  });

  it("skips POST when snapshot is not bound to a verified user", async () => {
    const attempt = createPreAuthAttemptId();
    savePreAuthConsentSnapshot("agent", QA_PRE_AUTH_CONSENTS.requirements, attempt);
    markPreAuthHandoffPending("agent", attempt);
    const result = await applyRegistrationPreAuthConsentHandoff("agent", "user-a", pendingReadiness);
    expect(result.status).toBe("needs_ui");
    expect(recordConsentRequirements).not.toHaveBeenCalled();
  });
});
