import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";
import { getSessionUser } from "@/lib/session";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { fetchRegistrationCapabilitiesServer } from "@/lib/registration/capabilities-server";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import { resolveCabinetPresentation } from "@/lib/cabinet-presentation/resolve";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AuthUser } from "@/lib/types";
import { CabinetPresentationBlockView } from "@/components/layout/CabinetPresentationBlock";

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

const readyEmployee = {
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

const agentEmployee: AuthUser = {
  id: "employee-agent",
  displayName: "Employee Agent",
  role: "PRO",
  partnerType: "AGENT",
  partnerActivities: ["AGENT"],
  staffRole: null,
  isBlocked: false,
};

function blockedPresentation(status: 403 | 503) {
  return resolveCabinetPresentation({
    user: agentEmployee,
    proContext: null,
    contextReady: false,
    contextHttpStatus: status,
  });
}

describe("HomePage employee presentation block before agent pilot redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchRegistrationCapabilitiesServer).mockResolvedValue({
      welcomeEnabled: false,
      agentRegistrationPathEnabled: false,
    } as Awaited<ReturnType<typeof fetchRegistrationCapabilitiesServer>>);
    vi.mocked(getSessionUser).mockResolvedValue(agentEmployee);
    vi.mocked(fetchRemcardUpstream).mockImplementation(async (path: string) => {
      if (path === "/api/account/cabinet-readiness") {
        return { ok: true, data: readyEmployee };
      }
      if (path === "/api/pro/cabinet-ui-preferences") {
        return { ok: true, data: agentPilotPrefs };
      }
      throw new Error(`unexpected upstream ${path}`);
    });
  });

  it.each([403, 503] as const)(
    "blocks employee on / with context %s and stale pilotActive (no /certificates redirect)",
    async (status) => {
      vi.mocked(fetchCabinetPresentationServer).mockResolvedValue({
        presentation: blockedPresentation(status),
      });

      const element = await HomePage({});
      expect(element.type).toBe(CabinetPresentationBlockView);
      expect(redirect).not.toHaveBeenCalled();
      expect(fetchRemcardUpstream).not.toHaveBeenCalledWith(
        "/api/partnership/list",
        expect.anything(),
      );
      expect(fetchRemcardUpstream).not.toHaveBeenCalledWith(
        "/api/pro/metrics",
        expect.anything(),
      );
    },
  );

  it("still redirects solo agent with pilot when presentation is not blocked", async () => {
    vi.mocked(getSessionUser).mockResolvedValue({
      ...agentEmployee,
      id: "solo-agent",
    });
    vi.mocked(fetchRemcardUpstream).mockImplementation(async (path: string) => {
      if (path === "/api/account/cabinet-readiness") {
        return { ok: true, data: { ...readyEmployee, isEmployee: false } };
      }
      if (path === "/api/pro/cabinet-ui-preferences") {
        return { ok: true, data: agentPilotPrefs };
      }
      throw new Error(`unexpected upstream ${path}`);
    });
    vi.mocked(fetchCabinetPresentationServer).mockResolvedValue({
      presentation: resolveCabinetPresentation({
        user: { ...agentEmployee, id: "solo-agent" },
        proContext: null,
        contextReady: false,
        contextHttpStatus: null,
      }),
    });

    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/certificates");
  });
});
