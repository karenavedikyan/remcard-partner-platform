import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppShell } from "./AppShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/components/auth/AccountSessionActions", () => ({
  AccountSessionActions: () => (
    <>
      <button type="button">Выйти</button>
      <button type="button" data-testid="sign-out-all-devices">
        Выйти со всех устройств
      </button>
    </>
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

    expect(screen.getAllByRole("button", { name: "Выйти" })).toHaveLength(2);
    expect(screen.getAllByTestId("sign-out-all-devices")).toHaveLength(2);
    expect(screen.getByTestId("mobile-logout")).toBeTruthy();
  });

  it("exposes theme toggle and notification bell composition slot", () => {
    renderShell();

    expect(screen.getByTestId("theme-toggle")).toBeTruthy();
    expect(document.querySelector("[data-prof-notification-bell-slot]")).toBeTruthy();
  });
});
