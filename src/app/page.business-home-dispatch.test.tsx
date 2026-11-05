import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";
import { getSessionUser } from "@/lib/session";
import { fetchRemcardUpstream } from "@/lib/remcard-server";
import { fetchRegistrationCapabilitiesServer } from "@/lib/registration/capabilities-server";
import { fetchCabinetPresentationServer } from "@/lib/cabinet-presentation/server";
import { resolveCabinetPresentation } from "@/lib/cabinet-presentation/resolve";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AuthUser } from "@/lib/types";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

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
vi.mock("@/components/home/HomeDashboard", () => ({
  HomeDashboard: () => <div data-testid="legacy-home-dashboard">Моя главная</div>,
}));
vi.mock("@/components/home/SpecialistHomeDashboard", () => ({ SpecialistHomeDashboard: () => null }));
vi.mock("@/components/home/BusinessOwnerHomeDashboard", () => ({
  BusinessOwnerHomeDashboard: (props: {
    homeAccessMode?: string;
    partnerType?: string;
  }) => (
    <div
      data-testid="business-owner-home"
      data-access-mode={props.homeAccessMode ?? ""}
      data-partner-type={props.partnerType ?? ""}
    />
  ),
}));
vi.mock("@/components/ui/PageHeading", () => ({
  PageHeading: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock("@/components/layout/CabinetShell", () => ({
  CabinetShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
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
  needsProfileCompletion: false,
  catalogStatus: "DRAFT",
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

function presentationFor(user: AuthUser, proContext: ProContextSnapshot) {
  return resolveCabinetPresentation({
    user,
    proContext,
    contextReady: true,
    contextHttpStatus: 200,
  });
}

describe("HomePage business home dispatch for org staff with personal AGENT", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchRegistrationCapabilitiesServer).mockResolvedValue({
      welcomeEnabled: false,
      agentRegistrationPathEnabled: false,
    } as Awaited<ReturnType<typeof fetchRegistrationCapabilitiesServer>>);
    vi.mocked(fetchRemcardUpstream).mockImplementation(async (path: string) => {
      if (path === "/api/account/cabinet-readiness") {
        return { ok: true, data: readyCabinet };
      }
      if (path === "/api/pro/cabinet-ui-preferences") {
        return { ok: true, data: agentPilotPrefs };
      }
      throw new Error(`unexpected upstream ${path}`);
    });
  });

  it.each([
    {
      label: "STORE BRANCH_MANAGER PRO AGENT",
      user: {
        id: "store-branch-agent",
        displayName: "Branch Agent",
        role: "PRO",
        partnerType: "AGENT",
        partnerActivities: ["AGENT"],
        staffRole: null,
        isBlocked: false,
      } satisfies AuthUser,
      proContext: {
        role: "BRANCH_MANAGER",
        organization: { id: "org-store", name: "Store Org", partnerType: "STORE" },
        branches: [],
        activeBranch: null,
        teamCapabilities: {
          canOpenTeamSection: false,
          canFetchEmployeesOverview: false,
          canManageEmployeesByBranchId: {},
        },
      } satisfies ProContextSnapshot,
      expectedPartnerType: "STORE",
    },
    {
      label: "COMPANY ORG_TEAM_MEMBER PRO AGENT",
      user: {
        id: "company-team-agent",
        displayName: "Team Agent",
        role: "PRO",
        partnerType: "AGENT",
        partnerActivities: ["AGENT"],
        staffRole: null,
        isBlocked: false,
      } satisfies AuthUser,
      proContext: {
        role: "ORG_TEAM_MEMBER",
        organization: { id: "org-co", name: "Company Org", partnerType: "COMPANY" },
        branches: [],
        activeBranch: null,
        teamCapabilities: {
          canOpenTeamSection: true,
          canFetchEmployeesOverview: true,
          canManageEmployeesByBranchId: {},
        },
      } satisfies ProContextSnapshot,
      expectedPartnerType: "COMPANY",
    },
    {
      label: "STORE PRO MASTER+AGENT",
      user: {
        id: "store-master-agent",
        displayName: "Master Agent",
        role: "PRO",
        partnerType: "MASTER",
        partnerActivities: ["MASTER", "AGENT"],
        staffRole: null,
        isBlocked: false,
      } satisfies AuthUser,
      proContext: {
        role: "BRANCH_MANAGER",
        organization: { id: "org-store-2", name: "Store Org 2", partnerType: "STORE" },
        branches: [],
        activeBranch: null,
        teamCapabilities: {
          canOpenTeamSection: false,
          canFetchEmployeesOverview: false,
          canManageEmployeesByBranchId: {},
        },
      } satisfies ProContextSnapshot,
      expectedPartnerType: "STORE",
    },
  ])("$label renders business org-staff home", async ({ user, proContext, expectedPartnerType }) => {
    vi.mocked(getSessionUser).mockResolvedValue(user);
    vi.mocked(fetchCabinetPresentationServer).mockResolvedValue({
      presentation: presentationFor(user, proContext),
    });

    const element = await HomePage({});
    render(element);

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.queryByTestId("legacy-home-dashboard")).toBeNull();
    const businessHome = screen.getByTestId("business-owner-home");
    expect(businessHome.getAttribute("data-access-mode")).toBe("org-staff-view");
    expect(businessHome.getAttribute("data-partner-type")).toBe(expectedPartnerType);
    expect(screen.getByRole("heading", { name: "Ваш кабинет" })).toBeTruthy();
    expect(fetchRemcardUpstream).not.toHaveBeenCalledWith("/api/partnership/list", expect.anything());
  });
});
