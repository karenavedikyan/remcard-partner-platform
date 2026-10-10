import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppShell } from "./AppShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/auth/LogoutButton", () => ({
  LogoutButton: ({ className }: { className?: string }) => (
    <button type="button" className={className}>
      Выйти
    </button>
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
  it("renders logout in sidebar and mobile topbar", () => {
    renderShell();

    const logoutButtons = screen.getAllByRole("button", { name: "Выйти" });
    expect(logoutButtons).toHaveLength(2);
    expect(screen.getByTestId("mobile-logout")).toBeTruthy();
  });

  it("exposes theme toggle and notification bell composition slot", () => {
    renderShell();

    expect(screen.getByTestId("theme-toggle")).toBeTruthy();
    expect(document.querySelector("[data-prof-notification-bell-slot]")).toBeTruthy();
  });
});
