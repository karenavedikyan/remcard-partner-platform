import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "s=test" }) }));

const fetchRemcardUpstream = vi.hoisted(() => vi.fn());

vi.mock("@/lib/remcard-server", () => ({ fetchRemcardUpstream }));

const readyReadiness = {
  canAccessCabinet: true,
  isEmployee: false,
  isAdmin: false,
  needsProfileOnboarding: false,
  missingConsents: [],
};

const proUser = { id: "p1", role: "PRO" as const, isBlocked: false, staffRole: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  fetchRemcardUpstream.mockImplementation(async (path: string) => {
    if (path === "/api/auth/me") {
      return { ok: true, data: { user: proUser } };
    }
    if (path === "/api/account/cabinet-readiness") {
      return { ok: true, data: readyReadiness };
    }
    return { ok: false, status: 404, message: "n/a", configured: true };
  });
});

describe("peekCabinetSession", () => {
  it("returns null for anonymous users without redirecting", async () => {
    fetchRemcardUpstream.mockImplementation(async (path: string) => {
      if (path === "/api/auth/me") return { ok: true, data: { user: null } };
      return { ok: false, status: 401, message: "n/a", configured: true };
    });
    const { peekCabinetSession } = await import("@/lib/session");
    await expect(peekCabinetSession()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns null for blocked users", async () => {
    fetchRemcardUpstream.mockImplementation(async (path: string) => {
      if (path === "/api/auth/me") {
        return { ok: true, data: { user: { ...proUser, isBlocked: true } } };
      }
      return { ok: true, data: readyReadiness };
    });
    const { peekCabinetSession } = await import("@/lib/session");
    await expect(peekCabinetSession()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns null when consents pending", async () => {
    fetchRemcardUpstream.mockImplementation(async (path: string) => {
      if (path === "/api/auth/me") return { ok: true, data: { user: proUser } };
      if (path === "/api/account/cabinet-readiness") {
        return {
          ok: true,
          data: { ...readyReadiness, missingConsents: [{ kind: "TERMS", status: "missing" }] },
        };
      }
      return { ok: false, status: 404, message: "n/a", configured: true };
    });
    const { peekCabinetSession } = await import("@/lib/session");
    await expect(peekCabinetSession()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns null for onboarding-required users", async () => {
    fetchRemcardUpstream.mockImplementation(async (path: string) => {
      if (path === "/api/auth/me") return { ok: true, data: { user: proUser } };
      if (path === "/api/account/cabinet-readiness") {
        return { ok: true, data: { ...readyReadiness, needsProfileOnboarding: true } };
      }
      return { ok: false, status: 404, message: "n/a", configured: true };
    });
    const { peekCabinetSession } = await import("@/lib/session");
    await expect(peekCabinetSession()).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns null when readiness is missing (page SessionGate, not layout redirect)", async () => {
    fetchRemcardUpstream.mockImplementation(async (path: string) => {
      if (path === "/api/auth/me") return { ok: true, data: { user: proUser } };
      if (path === "/api/account/cabinet-readiness") {
        return { ok: false, status: 503, message: "n/a", configured: true };
      }
      return { ok: false, status: 404, message: "n/a", configured: true };
    });
    const { peekCabinetSession, requireProPageUser } = await import("@/lib/session");
    await expect(peekCabinetSession()).resolves.toBeNull();
    await expect(requireProPageUser("/clients")).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns PRO user when cabinet access is allowed", async () => {
    const { peekCabinetSession } = await import("@/lib/session");
    await expect(peekCabinetSession()).resolves.toEqual(proUser);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("returns employee user when readiness marks employee", async () => {
    fetchRemcardUpstream.mockImplementation(async (path: string) => {
      if (path === "/api/auth/me") {
        return { ok: true, data: { user: { ...proUser, role: "CLIENT" as const } } };
      }
      if (path === "/api/account/cabinet-readiness") {
        return { ok: true, data: { ...readyReadiness, isEmployee: true } };
      }
      return { ok: false, status: 404, message: "n/a", configured: true };
    });
    const { peekCabinetSession } = await import("@/lib/session");
    const user = await peekCabinetSession();
    expect(user?.role).toBe("CLIENT");
    expect(redirect).not.toHaveBeenCalled();
  });
});
