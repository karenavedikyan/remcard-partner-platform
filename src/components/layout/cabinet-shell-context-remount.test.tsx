import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppShell } from "@/components/layout/AppShell";
import { AgentAppShell } from "@/components/layout/agent/AgentAppShell";
import { CabinetShellContextProvider } from "@/components/layout/cabinet-shell-context";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

const pathnameState = vi.hoisted(() => ({ value: "/" }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  recordProfSessionVisit: vi.fn().mockResolvedValue({ ok: true, recorded: false }),
  fetchManagementOverview: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({ partnerships: [] }),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/account-session/AccountSessionMenu", () => ({
  AccountSessionMenu: () => <div data-testid="account-session-menu-fixture" />,
}));

const agentPrefs: CabinetUiPreferencesResponse = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "ctx-1",
  version: 1,
  theme: "system",
  mobileNavKeys: ["home"],
  permittedKeys: ["home", "clients"],
  defaultMobileNavKeys: null,
};

describe("cabinet shell context token remount", () => {
  it("remounts legacy AppShell when identity token changes", () => {
    pathnameState.value = "/";
    const { rerender } = render(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetShellContextProvider shellContextToken="token-user-a">
            <AppShell
              key="token-user-a"
              user={{ id: "user-a", displayName: "User A", role: "PRO" }}
            >
              <div data-testid="page-content">content</div>
            </AppShell>
          </CabinetShellContextProvider>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    const sidebarBefore = screen.getByLabelText("Основная навигация");

    rerender(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetShellContextProvider shellContextToken="token-user-b">
            <AppShell
              key="token-user-b"
              user={{ id: "user-b", displayName: "User B", role: "PRO" }}
            >
              <div data-testid="page-content">content</div>
            </AppShell>
          </CabinetShellContextProvider>
        </CookieConsentProvider>
      </ThemeProvider>,
    );

    const sidebarAfter = screen.getByLabelText("Основная навигация");
    expect(sidebarBefore).not.toBe(sidebarAfter);
  });

  it("remounts legacy AppShell on branch token change for same user id", () => {
    const { rerender } = render(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetShellContextProvider shellContextToken="token-branch-a">
            <AppShell
              key="token-branch-a"
              user={{ id: "user-1", displayName: "Same", role: "PRO" }}
            >
              <div>content</div>
            </AppShell>
          </CabinetShellContextProvider>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    const sidebarBefore = screen.getByLabelText("Основная навигация");

    rerender(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetShellContextProvider shellContextToken="token-branch-b">
            <AppShell
              key="token-branch-b"
              user={{ id: "user-1", displayName: "Same", role: "PRO" }}
            >
              <div>content</div>
            </AppShell>
          </CabinetShellContextProvider>
        </CookieConsentProvider>
      </ThemeProvider>,
    );

    expect(sidebarBefore).not.toBe(screen.getByLabelText("Основная навигация"));
  });

  it("remounts AgentAppShell when shell context token changes", () => {
    const { rerender } = render(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetShellContextProvider shellContextToken="ctx-a">
            <AgentAppShell
              key="ctx-a:ctx-1:user-1"
              user={{ id: "user-1", displayName: "Agent", role: "PRO" }}
              initialPrefs={agentPrefs}
            >
              <div data-testid="agent-page">agent</div>
            </AgentAppShell>
          </CabinetShellContextProvider>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    const navBefore = screen.getByLabelText("Основная навигация");

    rerender(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetShellContextProvider shellContextToken="ctx-b">
            <AgentAppShell
              key="ctx-b:ctx-1:user-1"
              user={{ id: "user-1", displayName: "Agent", role: "PRO" }}
              initialPrefs={agentPrefs}
            >
              <div data-testid="agent-page">agent</div>
            </AgentAppShell>
          </CabinetShellContextProvider>
        </CookieConsentProvider>
      </ThemeProvider>,
    );

    expect(navBefore).not.toBe(screen.getByLabelText("Основная навигация"));
  });
});
