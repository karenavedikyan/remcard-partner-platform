import { readFileSync } from "node:fs";
import path from "node:path";
import { Children, isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { getSessionUser } from "@/lib/session";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { fetchRegistrationCapabilitiesServer } from "@/lib/registration/capabilities-server";
import { resolveActiveAgentRootRedirect } from "@/lib/agent-nav/root-destination";
import { SessionGate } from "@/components/auth/SessionGate";
import { PartnerWelcome } from "@/components/registration/PartnerWelcome";
import { CabinetShell } from "@/components/layout/CabinetShell";
import { HomeDashboard } from "@/components/home/HomeDashboard";
import { SpecialistHomeDashboard } from "@/components/home/SpecialistHomeDashboard";
import { BusinessOwnerHomeDashboard } from "@/components/home/BusinessOwnerHomeDashboard";

const redirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
}));

const homeBranchFixtures = vi.hoisted(() => ({
  specialistHome: false,
  businessOwnerHome: false,
  businessPartnerType: null as "STORE" | "COMPANY" | null,
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session")>();
  return { ...actual, getSessionUser: vi.fn() };
});
vi.mock("@/lib/remcard-server", () => ({ fetchRemcardUpstream: vi.fn() }));
vi.mock("@/lib/registration/capabilities-server", () => ({
  fetchRegistrationCapabilitiesServer: vi.fn(),
}));
vi.mock("@/components/auth/SessionGate", () => ({ SessionGate: () => null }));
vi.mock("@/components/registration/PartnerWelcome", () => ({ PartnerWelcome: () => null }));
vi.mock("@/components/layout/CabinetShell", () => ({ CabinetShell: () => null }));
vi.mock("@/components/home/HomeDashboard", () => ({ HomeDashboard: () => null }));
vi.mock("@/components/home/SpecialistHomeDashboard", () => ({ SpecialistHomeDashboard: () => null }));
vi.mock("@/components/home/BusinessOwnerHomeDashboard", () => ({ BusinessOwnerHomeDashboard: () => null }));
vi.mock("@/components/ui/PageHeading", () => ({ PageHeading: () => null }));
vi.mock("@/lib/agent-nav/root-destination", () => ({
  resolveActiveAgentRootRedirect: vi.fn(),
  isActiveAgentCabinetContext: () => false,
  enrichCabinetUiPreferencesForShell: (value: unknown) => value,
}));
vi.mock("@/lib/specialist-r06/serverGate", () => ({
  fetchSpecialistR06GateServer: async () => null,
}));
vi.mock("@/lib/specialist-home/gate", () => ({
  shouldRenderSpecialistHome: () => homeBranchFixtures.specialistHome,
}));
vi.mock("@/lib/business-home/gate", () => ({
  shouldRenderBusinessOwnerHome: () => homeBranchFixtures.businessOwnerHome,
  businessOwnerHomePartnerType: () => homeBranchFixtures.businessPartnerType,
}));

const denied = {
  nextStep: "ready", missingConsents: [], needsProfileOnboarding: false,
  canAccessCabinet: false, isEmployee: false, isAdmin: false,
};

const cabinetReady = { ...denied, canAccessCabinet: true };

function mockCabinetReadyUpstream(extra: Record<string, unknown> = {}) {
  vi.mocked(fetchRemcardUpstream).mockImplementation(async (path: string) => {
    if (path === "/api/account/cabinet-readiness") {
      return { ok: true, data: { ...cabinetReady, ...extra } };
    }
    if (path === "/api/pro/cabinet-ui-preferences") {
      return { ok: true, data: null };
    }
    if (path === "/api/partnership/list") {
      return { ok: true, data: { partnerships: [] } };
    }
    return { ok: true, data: denied };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  homeBranchFixtures.specialistHome = false;
  homeBranchFixtures.businessOwnerHome = false;
  homeBranchFixtures.businessPartnerType = null;
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "synthetic-partner", role: "PRO", staffRole: null, isBlocked: false,
  });
  vi.mocked(fetchRemcardUpstream).mockResolvedValue({ ok: true, data: denied });
  vi.mocked(resolveActiveAgentRootRedirect).mockReturnValue(null);
  vi.mocked(fetchRegistrationCapabilitiesServer).mockResolvedValue({
    welcomeEnabled: false, agentRegistrationPathEnabled: false,
  } as Awaited<ReturnType<typeof fetchRegistrationCapabilitiesServer>>);
});

function treeContainsType(node: unknown, type: unknown): boolean {
  if (!isValidElement(node)) return false;
  if (node.type === type) return true;
  return Children.toArray(node.props.children).some((child) => treeContainsType(child, type));
}

describe("server home-page staff redirect", () => {
  it.each(["OWNER", "ADMIN"])("redirects %s before partner readiness/profile/consent fetches", async (staffRole) => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "synthetic-staff", role: "CLIENT", staffRole, isBlocked: false,
    });
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/admin/overview");
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/admin/overview");
    expect(fetchRemcardUpstream).not.toHaveBeenCalled();
    expect(resolveActiveAgentRootRedirect).not.toHaveBeenCalled();
  });

  it("also redirects a staff account that has an independent PRO profile", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "synthetic-staff-pro", role: "PRO", staffRole: "ADMIN",
    });
    await expect(HomePage({ searchParams: Promise.resolve({ reason: "role" }) }))
      .rejects.toThrow("NEXT_REDIRECT:/admin/overview");
  });

  it.each(["OWNER", "ADMIN"])("does not bypass the blocked gate for %s", async (staffRole) => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "synthetic-blocked", staffRole, isBlocked: true,
    });
    const element = await HomePage({});
    expect(element.type).toBe(SessionGate);
    expect(element.props.reason).toBe("blocked");
    expect(redirect).not.toHaveBeenCalled();
    expect(fetchRemcardUpstream).not.toHaveBeenCalled();
  });

  it.each([null, "OPERATOR", "UNKNOWN"])("does not grant an admin redirect for staffRole=%s", async (staffRole) => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "synthetic-non-admin", role: "ADMIN", staffRole,
    });
    const element = await HomePage({});
    expect(element.type).toBe(SessionGate);
    expect(fetchRemcardUpstream).toHaveBeenCalledWith(
      "/api/account/cabinet-readiness", expect.any(Object),
    );
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("anonymous and guest fixtures", () => {
  it("keeps the guest login gate (SessionGate)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const element = await HomePage({});
    expect(element.type).toBe(SessionGate);
    expect(fetchRegistrationCapabilitiesServer).toHaveBeenCalled();
    expect(fetchRemcardUpstream).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("keeps PartnerWelcome when registration welcome path is enabled", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    vi.mocked(fetchRegistrationCapabilitiesServer).mockResolvedValue({
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
    } as Awaited<ReturnType<typeof fetchRegistrationCapabilitiesServer>>);
    const element = await HomePage({ searchParams: Promise.resolve({ invite: "tok", returnTo: "/join" }) });
    expect(element.type).toBe(PartnerWelcome);
    expect(element.props.inviteToken).toBe("tok");
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("readiness and onboarding fixtures", () => {
  it("keeps partner consent requirements", async () => {
    vi.mocked(fetchRemcardUpstream).mockResolvedValue({
      ok: true, data: {
        ...denied, missingConsents: [{ kind: "TERMS", status: "missing" }],
      },
    });
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/login?step=consents&returnTo=%2F");
  });

  it("keeps partner onboarding", async () => {
    vi.mocked(fetchRemcardUpstream).mockResolvedValue({
      ok: true, data: { ...denied, needsProfileOnboarding: true },
    });
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/onboarding?returnTo=%2F");
  });
});

describe("role parity at layout-shell-equivalent branch returns", () => {
  const clientUser = {
    id: "synthetic-client", role: "CLIENT" as const, staffRole: null, isBlocked: false,
  };

  it("non-PRO non-employee with active agentRoot: agentRoot redirect wins over role gate", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(clientUser);
    mockCabinetReadyUpstream({ isEmployee: false });
    vi.mocked(resolveActiveAgentRootRedirect).mockReturnValue("/certificates");
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/certificates");
    expect(redirect).toHaveBeenCalledExactlyOnceWith("/certificates");
  });

  it("non-PRO non-employee without agentRoot: role redirect on default dashboard branch (after list fetch)", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(clientUser);
    mockCabinetReadyUpstream({ isEmployee: false });
    vi.mocked(resolveActiveAgentRootRedirect).mockReturnValue(null);
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/?reason=role");
    expect(fetchRemcardUpstream).toHaveBeenCalledWith("/api/partnership/list", expect.any(Object));
  });

  it("non-PRO non-employee without agentRoot: role redirect on specialist branch", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(clientUser);
    mockCabinetReadyUpstream({ isEmployee: false });
    homeBranchFixtures.specialistHome = true;
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/?reason=role");
    expect(fetchRemcardUpstream).not.toHaveBeenCalledWith("/api/partnership/list", expect.any(Object));
  });

  it("non-PRO non-employee without agentRoot: role redirect on business-owner branch", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(clientUser);
    mockCabinetReadyUpstream({ isEmployee: false });
    homeBranchFixtures.businessOwnerHome = true;
    homeBranchFixtures.businessPartnerType = "STORE";
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/?reason=role");
    expect(fetchRemcardUpstream).not.toHaveBeenCalledWith("/api/partnership/list", expect.any(Object));
  });

  it("keeps ready ordinary and delegated test partners in their cabinet", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "synthetic-test-partner", role: "PRO", staffRole: null, isProfTestUser: true,
    });
    mockCabinetReadyUpstream();
    const element = await HomePage({});
    expect(element.type).toBe(CabinetShell);
    expect(treeContainsType(element, HomeDashboard)).toBe(true);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("ordinary eligible PRO renders specialist branch when selected", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "synthetic-master", role: "PRO", staffRole: null, partnerType: "MASTER",
    });
    mockCabinetReadyUpstream();
    homeBranchFixtures.specialistHome = true;
    const element = await HomePage({});
    expect(element.type).toBe(CabinetShell);
    expect(treeContainsType(element, SpecialistHomeDashboard)).toBe(true);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("ordinary eligible PRO renders business-owner branch when selected", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "synthetic-store", role: "PRO", staffRole: null, partnerType: "STORE",
    });
    mockCabinetReadyUpstream();
    homeBranchFixtures.businessOwnerHome = true;
    homeBranchFixtures.businessPartnerType = "STORE";
    const element = await HomePage({});
    expect(element.type).toBe(CabinetShell);
    expect(treeContainsType(element, BusinessOwnerHomeDashboard)).toBe(true);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("preserves the existing active-agent destination for PRO users", async () => {
    mockCabinetReadyUpstream();
    vi.mocked(resolveActiveAgentRootRedirect).mockReturnValue("/certificates");
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/certificates");
  });
});
