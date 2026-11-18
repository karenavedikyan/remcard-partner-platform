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
import {
  agentEmployeeContext,
  specialistEmployeeContext,
  storeOrgEmployeeContext,
} from "@/lib/cabinet-presentation/test-fixtures";

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
vi.mock("@/components/home/SpecialistHomeDashboard", () => ({
  SpecialistHomeDashboard: (props: { needsProfileCompletion?: boolean; employeeView?: boolean }) => (
    <div
      data-testid="specialist-home"
      data-needs-profile={String(props.needsProfileCompletion)}
      data-employee-view={String(Boolean(props.employeeView))}
    />
  ),
}));
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

const inactivePrefs: CabinetUiPreferencesResponse = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: false,
  contextKey: null,
  version: 0,
  theme: null,
  mobileNavKeys: null,
  permittedKeys: null,
  defaultMobileNavKeys: null,
};

const employeeUser = {
  id: "emp-1",
  displayName: "Сотрудник",
  role: "CLIENT",
  partnerType: null,
  partnerActivities: [],
  staffRole: null,
  isBlocked: false,
} satisfies AuthUser;

function presentationFor(user: AuthUser, proContext: ProContextSnapshot) {
  return resolveCabinetPresentation({ user, proContext, contextReady: true, contextHttpStatus: 200 });
}

describe("HomePage for employees of a specialist / agent (v9.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchRegistrationCapabilitiesServer).mockResolvedValue({
      welcomeEnabled: false,
      agentRegistrationPathEnabled: false,
    } as Awaited<ReturnType<typeof fetchRegistrationCapabilitiesServer>>);
    vi.mocked(fetchRemcardUpstream).mockImplementation(async (path: string) => {
      if (path === "/api/account/cabinet-readiness") return { ok: true, data: readyCabinet };
      if (path === "/api/pro/cabinet-ui-preferences") return { ok: true, data: inactivePrefs };
      throw new Error(`unexpected upstream ${path}`);
    });
    vi.mocked(getSessionUser).mockResolvedValue(employeeUser);
  });

  it("agent employee never sees the old home: root leads to the agent certificates", async () => {
    vi.mocked(fetchCabinetPresentationServer).mockResolvedValue({
      presentation: presentationFor(employeeUser, agentEmployeeContext),
    });
    await expect(HomePage({})).rejects.toThrow("NEXT_REDIRECT:/certificates");
    expect(screen.queryByTestId("legacy-home-dashboard")).toBeNull();
  });

  it("specialist employee gets the specialist home, not «Моя главная», without owner profile prompts", async () => {
    vi.mocked(fetchCabinetPresentationServer).mockResolvedValue({
      presentation: presentationFor(employeeUser, specialistEmployeeContext),
    });
    render(await HomePage({}));
    expect(screen.getByTestId("specialist-home").getAttribute("data-needs-profile")).toBe("false");
    expect(screen.getByTestId("specialist-home").getAttribute("data-employee-view")).toBe("true");
    expect(screen.queryByTestId("legacy-home-dashboard")).toBeNull();
  });

  it("store employee still gets the business home", async () => {
    vi.mocked(fetchCabinetPresentationServer).mockResolvedValue({
      presentation: presentationFor(employeeUser, storeOrgEmployeeContext),
    });
    render(await HomePage({}));
    expect(screen.getByTestId("business-owner-home").getAttribute("data-partner-type")).toBe("STORE");
  });
});
