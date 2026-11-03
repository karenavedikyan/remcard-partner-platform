import { readFileSync } from "node:fs";
import path from "node:path";
import { Children, Fragment, isValidElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { getSessionUser } from "@/lib/session";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { fetchRegistrationCapabilitiesServer } from "@/lib/registration/capabilities-server";
import { resolveActiveAgentRootRedirect } from "@/lib/agent-nav/root-destination";
import { SessionGate } from "@/components/auth/SessionGate";
import { PartnerWelcome } from "@/components/registration/PartnerWelcome";
import { HomeDashboard } from "@/components/home/HomeDashboard";
const redirect = vi.hoisted(() => vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
}));

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/remcard-server", () => ({ fetchRemcardUpstream: vi.fn() }));
vi.mock("@/lib/registration/capabilities-server", () => ({
  fetchRegistrationCapabilitiesServer: vi.fn(),
}));
vi.mock("@/components/auth/SessionGate", () => ({ SessionGate: () => null }));
vi.mock("@/components/registration/PartnerWelcome", () => ({ PartnerWelcome: () => null }));
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

const denied = {
  nextStep: "ready", missingConsents: [], needsProfileOnboarding: false,
  canAccessCabinet: false, isEmployee: false, isAdmin: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue({
    id: "synthetic-partner", role: "PRO", staffRole: null, isBlocked: false,
  });
  vi.mocked(fetchRemcardUpstream).mockResolvedValue({ ok: true, data: denied });
  vi.mocked(resolveActiveAgentRootRedirect).mockReturnValue(null);
  vi.mocked(fetchRegistrationCapabilitiesServer).mockResolvedValue({
    welcomeEnabled: false, agentRegistrationPathEnabled: false,
  } as Awaited<ReturnType<typeof fetchRegistrationCapabilitiesServer>>);
});

describe("server home-page staff redirect", () => {
  it("does not wrap content in CabinetShell (persistent (cabinet)/layout owns the shell)", () => {
    const src = readFileSync(path.join(import.meta.dirname, "page.tsx"), "utf8");
    expect(src).not.toMatch(/CabinetShell/);
  });

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

  it("keeps the guest login gate", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    const element = await HomePage({});
    expect(element.type).toBe(SessionGate);
    expect(fetchRegistrationCapabilitiesServer).toHaveBeenCalled();
    expect(fetchRemcardUpstream).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("keeps PartnerWelcome for guests when registration welcome path is enabled", async () => {
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

  it("keeps ready ordinary and delegated test partners in their cabinet", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      id: "synthetic-test-partner", role: "PRO", staffRole: null, isProfTestUser: true,
    });
    vi.mocked(fetchRemcardUpstream).mockResolvedValue({
      ok: true, data: { ...denied, canAccessCabinet: true, partnerships: [] },
    });
    const element = await HomePage({});
    expect(element.type).toBe(Fragment);
    const kids = Children.toArray(element.props.children);
    expect(
      kids.some((child) => isValidElement(child) && child.type === HomeDashboard),
    ).toBe(true);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("preserves the existing active-agent destination", async () => {
    vi.mocked(fetchRemcardUpstream).mockResolvedValue({
      ok: true, data: { ...denied, canAccessCabinet: true },
    });
    vi.mocked(resolveActiveAgentRootRedirect).mockReturnValue("/certificates");
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/certificates");
  });
});
