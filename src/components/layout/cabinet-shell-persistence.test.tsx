import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppShell } from "@/components/layout/AppShell";
import { isCabinetNavItemActive } from "@/lib/cabinet-nav/active";

const pathnameState = vi.hoisted(() => ({ value: "/" }));

vi.mock("@/lib/prof-admin-management-api", () => ({
  recordProfSessionVisit: vi.fn().mockResolvedValue({ ok: true, recorded: false }),
  fetchManagementOverview: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({ partnerships: [] }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
  useSearchParams: () => new URLSearchParams(""),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/account-session/AccountSessionMenu", () => ({
  AccountSessionMenu: () => <div data-testid="account-session-menu-fixture" />,
}));

function renderShell() {
  return render(
    <ThemeProvider>
      <CookieConsentProvider>
        <AppShell user={{ id: "user-1", displayName: "Тестовый партнёр", role: "PRO" }}>
          <div data-testid="page-content">content</div>
        </AppShell>
      </CookieConsentProvider>
    </ThemeProvider>,
  );
}

describe("persistent cabinet shell harness", () => {
  it("keeps the sidebar node across pathname changes", () => {
    pathnameState.value = "/";
    const { rerender } = renderShell();
    const sidebarBefore = screen.getByLabelText("Основная навигация");

    pathnameState.value = "/clients";
    rerender(
      <ThemeProvider>
        <CookieConsentProvider>
          <AppShell user={{ id: "user-1", displayName: "Тестовый партнёр", role: "PRO" }}>
            <div data-testid="page-content">content</div>
          </AppShell>
        </CookieConsentProvider>
      </ThemeProvider>,
    );

    const sidebarAfter = screen.getByLabelText("Основная навигация");
    expect(sidebarBefore).toBe(sidebarAfter);
  });

  it("marks the active nav item for nested routes", () => {
    expect(isCabinetNavItemActive("/clients", "/clients/abc", new URLSearchParams())).toBe(true);
    expect(isCabinetNavItemActive("/partners", "/partners", new URLSearchParams("section=find"))).toBe(
      true,
    );
  });
});
