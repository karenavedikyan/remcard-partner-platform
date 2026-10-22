import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppShell } from "./AppShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => ({ get: () => null }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/account-session/AccountSessionMenu", () => ({
  AccountSessionMenu: ({ displayName, roleLabel }: { displayName: string; roleLabel: string }) => (
    <div data-testid="account-session-menu-fixture">
      {displayName} · {roleLabel}
    </div>
  ),
}));

function renderShell() {
  return render(
    <ThemeProvider>
      <AppShell user={{ id: "user-1", displayName: "Тестовый партнёр", role: "PRO" }}>
        <div>content</div>
      </AppShell>
    </ThemeProvider>,
  );
}

describe("AppShell", () => {
  it("renders account session menu in topbar", () => {
    renderShell();
    expect(screen.getByTestId("account-session-menu-fixture")).toHaveTextContent("Тестовый партнёр");
    expect(screen.getByTestId("account-session-menu-fixture")).toHaveTextContent("Владелец профиля");
  });

  it("exposes theme toggle and notification bell composition slot", () => {
    renderShell();

    expect(screen.getByTestId("theme-toggle")).toBeTruthy();
    expect(document.querySelector("[data-prof-notification-bell-slot]")).toBeTruthy();
  });
});
