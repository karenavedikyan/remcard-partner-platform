import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
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

const legacyLayoutPrefs: CabinetUiPreferencesResponse = {
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

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/";
  mocks.remcardFetch.mockImplementation(async (path: string) => {
    if (path === "/api/pro/cabinet-ui-preferences") {
      return legacyLayoutPrefs;
    }
    return { partnerships: [] };
  });
});

describe("CabinetAppShellClient prefs path refresh", () => {
  it("fetches cabinet-ui-preferences once per pathname (legacy branch)", async () => {
    const { rerender } = render(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetAppShellClient
            user={{ id: "u1", displayName: "Partner", role: "PRO" }}
            incomingCount={0}
            uiPrefs={legacyLayoutPrefs}
            shellContextToken="tok"
          >
            <div>page</div>
          </CabinetAppShellClient>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    await waitFor(() => {
      const prefsCalls = mocks.remcardFetch.mock.calls.filter(
        (c) => c[0] === "/api/pro/cabinet-ui-preferences",
      );
      expect(prefsCalls).toHaveLength(1);
    });

    mocks.pathname = "/clients";
    rerender(
      <ThemeProvider>
        <CookieConsentProvider>
          <CabinetAppShellClient
            user={{ id: "u1", displayName: "Partner", role: "PRO" }}
            incomingCount={0}
            uiPrefs={legacyLayoutPrefs}
            shellContextToken="tok"
          >
            <div>page</div>
          </CabinetAppShellClient>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    await waitFor(() => {
      const prefsCalls = mocks.remcardFetch.mock.calls.filter(
        (c) => c[0] === "/api/pro/cabinet-ui-preferences",
      );
      expect(prefsCalls).toHaveLength(2);
    });
  });
});
