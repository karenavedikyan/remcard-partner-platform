import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { getSessionUser } from "@/lib/session";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { fetchRegistrationCapabilitiesServer } from "@/lib/registration/capabilities-server";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import { companyOrgEmployeeContext } from "@/lib/cabinet-presentation/test-fixtures";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AuthUser } from "@/lib/types";

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/remcard-server", () => ({ fetchRemcardUpstream: vi.fn() }));
vi.mock("@/lib/registration/capabilities-server", () => ({
  fetchRegistrationCapabilitiesServer: vi.fn(),
}));
vi.mock("@/lib/cabinet-presentation/server", () => ({
  fetchCabinetPresentationServer: vi.fn(),
}));
vi.mock("@/components/auth/SessionGate", () => ({ SessionGate: () => null }));
vi.mock("@/components/registration/PartnerWelcome", () => ({ PartnerWelcome: () => null }));
vi.mock("@/components/home/HomeDashboard", () => ({ HomeDashboard: () => null }));
vi.mock("@/components/home/SpecialistHomeDashboard", () => ({ SpecialistHomeDashboard: () => null }));
vi.mock("@/components/home/BusinessOwnerHomeDashboard", () => ({
  BusinessOwnerHomeDashboard: () => null,
}));
vi.mock("@/components/ui/PageHeading", () => ({ PageHeading: () => null }));
vi.mock("@/components/layout/CabinetShell", () => ({ CabinetShell: () => null }));
vi.mock("@/lib/specialist-r06/serverGate", () => ({
  fetchSpecialistR06GateServer: async () => null,
}));

const readyCabinet = {
  nextStep: "ready",
  missingConsents: [],
  needsProfileOnboarding: false,
  canAccessCabinet: true,
  isEmployee: true,
  isAdmin: false,
};

const agentPilotPrefs: CabinetUiPreferencesResponse = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "agent-wallet:actor",
  version: 1,
  theme: null,
  mobileNavKeys: ["certificates", "partners", "wallet", "profile"],
  permittedKeys: ["certificates", "clients", "partners", "wallet", "profile"],
  defaultMobileNavKeys: null,
};

describe("HomePage agent root redirect vs org workplace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchRegistrationCapabilitiesServer).mockResolvedValue({
      welcomeEnabled: false,
      agentRegistrationPathEnabled: false,
    } as Awaited<ReturnType<typeof fetchRegistrationCapabilitiesServer>>);
  });

  it("does not redirect org team member to certificates when pilot prefs are active", async () => {
    const user = {
      id: "org-team-agent",
      role: "PRO",
      partnerType: "AGENT",
      partnerActivities: ["AGENT"],
      staffRole: null,
      isBlocked: false,
    } satisfies AuthUser;

    vi.mocked(getSessionUser).mockResolvedValue(user);
    vi.mocked(fetchRemcardUpstream).mockImplementation(async (path: string) => {
      if (path === "/api/account/cabinet-readiness") {
        return { ok: true, data: readyCabinet };
      }
      if (path === "/api/pro/cabinet-ui-preferences") {
        return { ok: true, data: agentPilotPrefs };
      }
      if (path === "/api/partnership/list") {
        return { ok: true, data: { partnerships: [] } };
      }
      throw new Error(`unexpected fetch ${path}`);
    });
    vi.mocked(fetchCabinetPresentationServer).mockResolvedValue({
      presentation: cabinetPresentationFixture(user, companyOrgEmployeeContext),
    });

    await expect(HomePage({})).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("still redirects solo agent with pilot prefs to certificates", async () => {
    const user = {
      id: "solo-agent",
      role: "PRO",
      partnerType: "AGENT",
      partnerActivities: ["AGENT"],
      staffRole: null,
      isBlocked: false,
    } satisfies AuthUser;

    vi.mocked(getSessionUser).mockResolvedValue(user);
    vi.mocked(fetchRemcardUpstream).mockImplementation(async (path: string) => {
      if (path === "/api/account/cabinet-readiness") {
        return { ok: true, data: { ...readyCabinet, isEmployee: false } };
      }
      if (path === "/api/pro/cabinet-ui-preferences") {
        return { ok: true, data: agentPilotPrefs };
      }
      throw new Error(`unexpected fetch ${path}`);
    });
    vi.mocked(fetchCabinetPresentationServer).mockResolvedValue({
      presentation: cabinetPresentationFixture(user),
    });

    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/certificates");
  });
});
