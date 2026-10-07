import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

describe("AppShell", () => {
  it("renders logout in sidebar and mobile topbar", () => {
    render(
      <AppShell user={{ id: "user-1", displayName: "Тестовый партнёр", role: "PRO" }}>
        <div>content</div>
      </AppShell>,
    );

    const logoutButtons = screen.getAllByRole("button", { name: "Выйти" });
    expect(logoutButtons).toHaveLength(2);
    expect(screen.getByTestId("mobile-logout")).toBeTruthy();
  });
});
