import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CabinetAppShellClient } from "@/components/layout/CabinetAppShellClient";
import type { CabinetUiPreferencesResponse } from "@/lib/cabinet-ui-preferences-types";

const mocks = vi.hoisted(() => ({
  remcardFetch: vi.fn(),
  pathname: "/",
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: mocks.remcardFetch,
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/prof-admin-management-api", () => ({
  recordProfSessionVisit: vi.fn().mockResolvedValue({ ok: true, recorded: false }),
  fetchManagementOverview: vi.fn(),
}));

vi.mock("@/components/account-session/AccountSessionMenu", () => ({
  AccountSessionMenu: () => <div data-testid="account-session-menu-fixture" />,
}));

function agentPrefs(overrides: Partial<CabinetUiPreferencesResponse>): CabinetUiPreferencesResponse {
  return {
    contractVersion: "2026-10-14.r01",
    pilotEnabled: true,
    pilotActive: true,
    contextKey: "ctx-a",
    version: 5,
    theme: "dark",
    mobileNavKeys: ["home", "clients", "certificates", "partners"],
    permittedKeys: ["home", "clients", "certificates", "partners", "profile"],
    defaultMobileNavKeys: null,
    ...overrides,
  };
}

function legacyPrefs(): CabinetUiPreferencesResponse {
  return {
    contractVersion: "2026-10-14.r01",
    pilotEnabled: false,
    pilotActive: false,
    contextKey: null,
    version: 0,
    theme: null,
    mobileNavKeys: null,
    permittedKeys: null,
    defaultMobileNavKeys: null,
  };
}

function renderShell(props: React.ComponentProps<typeof CabinetAppShellClient>) {
  return render(
    <ThemeProvider>
      <CookieConsentProvider>
        <CabinetAppShellClient {...props}>
          <div>page</div>
        </CabinetAppShellClient>
      </CookieConsentProvider>
    </ThemeProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/";
});

describe("CabinetAppShellClient branch keys", () => {
  it("agent user A v5 wide -> agent user B v2 narrow renders B prefs", async () => {
    mocks.remcardFetch.mockImplementation(async (path: string) => {
      if (path === "/api/pro/cabinet-ui-preferences") {
        return agentPrefs({ version: 2, contextKey: "ctx-b" });
      }
      return { partnerships: [] };
    });

    const { rerender } = renderShell({
      user: { id: "user-a", displayName: "A", role: "PRO" },
      incomingCount: 0,
      uiPrefs: agentPrefs({ version: 5 }),
      shellContextToken: "tok-a",
    });

    await waitFor(() => expect(screen.getByTestId("nav-mobile-partners")).toBeInTheDocument());

    rerender(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetAppShellClient
            user={{ id: "user-b", displayName: "B", role: "PRO" }}
            incomingCount={0}
            uiPrefs={agentPrefs({
              version: 2,
              contextKey: "ctx-b",
              theme: "light",
              mobileNavKeys: ["home"],
              permittedKeys: ["home"],
            })}
            shellContextToken="tok-b"
          >
            <div>page</div>
          </CabinetAppShellClient>
        </CookieConsentProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("nav-mobile-partners")).not.toBeInTheDocument();
      expect(screen.getByTestId("nav-mobile-home")).toBeInTheDocument();
    });
  });

  it("legacy branch resets when shell token changes", async () => {
    mocks.remcardFetch.mockImplementation(async (path: string) => {
      if (path === "/api/pro/cabinet-ui-preferences") return legacyPrefs();
      return { partnerships: [] };
    });

    const { rerender } = renderShell({
      user: { id: "user-a", displayName: "A", role: "PRO" },
      incomingCount: 0,
      uiPrefs: legacyPrefs(),
      shellContextToken: "legacy-a",
    });

    await waitFor(() => {
      const prefsCalls = mocks.remcardFetch.mock.calls.filter(
        (c) => c[0] === "/api/pro/cabinet-ui-preferences",
      );
      expect(prefsCalls.length).toBeGreaterThanOrEqual(1);
    });

    rerender(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetAppShellClient
            user={{ id: "user-b", displayName: "B", role: "PRO" }}
            incomingCount={0}
            uiPrefs={legacyPrefs()}
            shellContextToken="legacy-b"
          >
            <div>page</div>
          </CabinetAppShellClient>
        </CookieConsentProvider>
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText("B").length).toBeGreaterThanOrEqual(1);
      const prefsCalls = mocks.remcardFetch.mock.calls.filter(
        (c) => c[0] === "/api/pro/cabinet-ui-preferences",
      );
      expect(prefsCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
