import { beforeEach, describe, expect, it, vi } from "vitest";
import { verifyOnboardingComplete } from "./onboarding-save";

vi.mock("@/lib/auth-session", () => ({
  consentRequirementKey: (req: { kind: string; legalDocumentId: string | null }) =>
    `${req.kind}:${req.legalDocumentId ?? ""}`,
  fetchAuthMeSafe: vi.fn(),
  fetchReadinessSafe: vi.fn(),
}));

import { fetchAuthMeSafe, fetchReadinessSafe } from "@/lib/auth-session";

const baseReadiness = {
  nextStep: "ready" as const,
  missingConsents: [],
  needsProfileOnboarding: false,
  canAccessCabinet: true,
  isEmployee: false,
  isAdmin: false,
};

describe("verifyOnboardingComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchAuthMeSafe).mockResolvedValue({
      ok: true,
      data: { user: { id: "u1", role: "PRO" } },
    });
    vi.mocked(fetchReadinessSafe).mockResolvedValue({ ok: true, data: baseReadiness });
  });

  it("requires canAccessCabinet even when role is already PRO", async () => {
    vi.mocked(fetchReadinessSafe).mockResolvedValue({
      ok: true,
      data: { ...baseReadiness, canAccessCabinet: false },
    });

    const result = await verifyOnboardingComplete();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe("incomplete");
      expect(result.message).toMatch(/доступ/i);
    }
  });

  it("rejects when login consents are still pending", async () => {
    vi.mocked(fetchReadinessSafe).mockResolvedValue({
      ok: true,
      data: {
        ...baseReadiness,
        canAccessCabinet: false,
        missingConsents: [
          {
            kind: "TERMS",
            legalDocumentId: "doc-1",
            version: "1.0",
            url: "/terms",
            status: "missing",
          },
        ],
      },
    });

    const result = await verifyOnboardingComplete();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/соглаш/i);
    }
  });

  it("succeeds only when profile is complete and cabinet is accessible", async () => {
    const result = await verifyOnboardingComplete();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.readiness.canAccessCabinet).toBe(true);
    }
  });
});
