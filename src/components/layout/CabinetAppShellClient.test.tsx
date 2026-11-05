import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CabinetAppShellClient } from "./CabinetAppShellClient";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import {
  companyOrgEmployeeContext,
  storeOrgEmployeeContext,
} from "@/lib/cabinet-presentation/test-fixtures";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";
import type { AuthUser } from "@/lib/types";

vi.mock("./AppShell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="business-app-shell">{children}</div>
  ),
}));

vi.mock("./agent/AgentAppShell", () => ({
  AgentAppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="agent-app-shell">{children}</div>
  ),
}));

vi.mock("@/components/notifications", () => ({
  ProfNotificationBell: () => null,
}));

vi.mock("@/components/layout/CabinetPresentationRefreshListener", () => ({
  CabinetPresentationRefreshListener: () => null,
}));

const pilotPrefs: CabinetUiPreferencesResponse = {
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

describe("CabinetAppShellClient agent pilot dispatch", () => {
  it("uses business AppShell for org employee with stale agent pilot prefs", () => {
    const user = {
      id: "org-agent-employee",
      role: "PRO",
      partnerType: "AGENT",
      partnerActivities: ["AGENT"],
    } satisfies AuthUser;
    const presentation = cabinetPresentationFixture(user, companyOrgEmployeeContext);

    render(
      <CabinetAppShellClient
        user={user}
        presentation={presentation}
        incomingCount={0}
        uiPrefs={pilotPrefs}
      >
        <span>content</span>
      </CabinetAppShellClient>,
    );

    expect(screen.getByTestId("business-app-shell")).toBeTruthy();
    expect(screen.queryByTestId("agent-app-shell")).toBeNull();
  });

  it("uses AgentAppShell for solo agent with pilot prefs", () => {
    const user = {
      id: "solo-agent",
      role: "PRO",
      partnerType: "AGENT",
      partnerActivities: ["AGENT"],
    } satisfies AuthUser;
    const presentation = cabinetPresentationFixture(user);

    render(
      <CabinetAppShellClient
        user={user}
        presentation={presentation}
        incomingCount={0}
        uiPrefs={pilotPrefs}
      >
        <span>content</span>
      </CabinetAppShellClient>,
    );

    expect(screen.getByTestId("agent-app-shell")).toBeTruthy();
    expect(screen.queryByTestId("business-app-shell")).toBeNull();
  });

  it("uses business AppShell for store org employee CLIENT with pilot prefs", () => {
    const user = {
      id: "store-staff",
      role: "CLIENT",
      partnerType: null,
      partnerActivities: [],
    } satisfies AuthUser;
    const presentation = cabinetPresentationFixture(user, storeOrgEmployeeContext);

    render(
      <CabinetAppShellClient
        user={user}
        presentation={presentation}
        incomingCount={0}
        uiPrefs={pilotPrefs}
      >
        <span>content</span>
      </CabinetAppShellClient>,
    );

    expect(screen.getByTestId("business-app-shell")).toBeTruthy();
  });
});
