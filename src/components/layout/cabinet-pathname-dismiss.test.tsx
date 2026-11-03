import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppShell } from "@/components/layout/AppShell";
import { AgentAppShellWithPrefsState } from "@/components/layout/agent/AgentAppShell.test-props";
import { AccountSessionMenu } from "@/components/account-session/AccountSessionMenu";
import { ProfNotificationBell } from "@/components/notifications/ProfNotificationBell";

const pathnameState = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
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

vi.mock("@/lib/prof-admin-management-api", () => ({
  recordProfSessionVisit: vi.fn(),
  fetchManagementOverview: vi.fn(),
}));

vi.mock("@/hooks/useProfNotifications", () => ({
  useProfNotifications: () => ({
    unreadCount: 0,
    refreshList: vi.fn(),
    items: [],
    loading: false,
    markRead: vi.fn(),
  }),
}));

vi.mock("@/components/account-session/useAccountSessionExit", () => ({
  useAccountSessionExit: () => ({
    pending: false,
    error: null,
    confirmAllOpen: false,
    exitCurrent: vi.fn(),
    openConfirmAll: vi.fn(),
    closeConfirmAll: vi.fn(),
    confirmExitAll: vi.fn(),
    clearError: vi.fn(),
  }),
}));

const agentInitialPrefs = {
  contractVersion: "2026-10-14.r01",
  pilotEnabled: true,
  pilotActive: true,
  contextKey: "ctx",
  version: 1,
  theme: null,
  mobileNavKeys: ["home"],
  permittedKeys: ["home", "clients", "certificates"],
  defaultMobileNavKeys: null,
} as const;

describe("pathname change dismisses transient shell UI", () => {
  it("closes AppShell mobile menu and more sheet on pathname change", () => {
    pathnameState.value = "/";
    const { rerender } = render(
      <ThemeProvider>
        <CookieConsentProvider>
          <AppShell user={{ id: "u1", displayName: "Test", role: "PRO" }}>
            <div>content</div>
          </AppShell>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    const menuButton = screen.getByRole("button", { name: /Открыть меню/i });
    fireEvent.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");

    pathnameState.value = "/clients";
    rerender(
      <ThemeProvider>
        <CookieConsentProvider>
          <AppShell user={{ id: "u1", displayName: "Test", role: "PRO" }}>
            <div>content</div>
          </AppShell>
        </CookieConsentProvider>
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: /Открыть меню/i })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes AgentAppShell more and editor on pathname change", async () => {
    pathnameState.value = "/";
    const ui = userEvent.setup();
    const { rerender } = render(
      <ThemeProvider>
        <AgentAppShellWithPrefsState
          user={{ id: "u1", displayName: "Test", role: "PRO" }}
          initialPrefs={agentInitialPrefs}
        >
          <div>content</div>
        </AgentAppShellWithPrefsState>
      </ThemeProvider>,
    );
    await ui.click(screen.getByTestId("mobile-nav-more"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    pathnameState.value = "/clients";
    rerender(
      <ThemeProvider>
        <AgentAppShellWithPrefsState
          user={{ id: "u1", displayName: "Test", role: "PRO" }}
          initialPrefs={agentInitialPrefs}
        >
          <div>content</div>
        </AgentAppShellWithPrefsState>
      </ThemeProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("closes AccountSessionMenu on pathname change", async () => {
    pathnameState.value = "/";
    const ui = userEvent.setup();
    const { rerender } = render(
      <AccountSessionMenu displayName="Test User" roleLabel="Партнёр" />,
    );
    await ui.click(screen.getByTestId("account-menu-trigger"));
    expect(screen.getByTestId("account-menu-trigger")).toHaveAttribute("aria-expanded", "true");

    pathnameState.value = "/profile";
    rerender(<AccountSessionMenu displayName="Test User" roleLabel="Партнёр" />);
    expect(screen.getByTestId("account-menu-trigger")).toHaveAttribute("aria-expanded", "false");
  });

  it("closes ProfNotificationBell panel on pathname change", async () => {
    pathnameState.value = "/";
    const ui = userEvent.setup();
    const { rerender } = render(<ProfNotificationBell />);
    await ui.click(screen.getByRole("button", { name: /Уведомления/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    pathnameState.value = "/history";
    rerender(<ProfNotificationBell />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
