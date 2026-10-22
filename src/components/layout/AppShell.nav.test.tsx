import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import type { AuthUser } from "@/lib/types";
import { AppShell } from "./AppShell";

let mockPathname = "/";
let mockSearch = "";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => ({
    get(name: string) {
      const params = new URLSearchParams(mockSearch);
      return params.get(name);
    },
  }),
}));

vi.mock("@/components/account-session/AccountSessionMenu", () => ({
  AccountSessionMenu: () => <div data-testid="account-session-menu-fixture" />,
}));

function renderNav(user: AuthUser) {
  return render(
    <ThemeProvider>
      <AppShell user={user}>
        <div>content</div>
      </AppShell>
    </ThemeProvider>,
  );
}

function sidebarLabels() {
  const nav = screen.getByLabelText("Основная навигация");
  return within(nav)
    .getAllByRole("link")
    .map((el) => el.textContent?.replace(/\d+$/, "").trim());
}

describe("AppShell business nav matrix", () => {
  it("renders store owner prototype labels", () => {
    mockPathname = "/";
    mockSearch = "";
    renderNav({
      id: "u1",
      displayName: "Магазин",
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["STORE"],
    });
    expect(sidebarLabels()).toEqual([
      "Главная",
      "Клиенты",
      "Сертификаты",
      "Сканер",
      "Партнёры",
      "Кошелёк",
      "Профиль",
    ]);
  });

  it("renders company employees item linking to profile team section", () => {
    mockPathname = "/";
    renderNav({
      id: "u2",
      displayName: "Компания",
      role: "PRO",
      partnerType: "COMPANY",
      partnerActivities: ["STORE"],
    });
    const nav = screen.getByLabelText("Основная навигация");
    const team = within(nav).getByRole("link", { name: "Сотрудники" });
    expect(team.getAttribute("href")).toContain("/profile?section=team");
  });

  it("keeps legacy nav for pure-agent activities on STORE partnerType", () => {
    mockPathname = "/";
    renderNav({
      id: "u3",
      displayName: "Агент",
      role: "PRO",
      partnerType: "STORE",
      partnerActivities: ["AGENT"],
    });
    expect(sidebarLabels()).toEqual([
      "Главная",
      "Партнёры",
      "Рекомендации",
      "Сканер",
      "История",
      "Взаиморасчёты",
      "Профиль",
    ]);
    expect(screen.queryByTestId("cabinet-mobile-nav-more")).toBeNull();
  });

  it("marks only team nav active on profile?section=team", () => {
    mockPathname = "/profile";
    mockSearch = "section=team";
    renderNav({
      id: "u4",
      displayName: "Компания",
      role: "PRO",
      partnerType: "COMPANY",
    });
    const nav = screen.getByLabelText("Основная навигация");
    expect(within(nav).getByRole("link", { name: "Сотрудники" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Профиль" })).not.toHaveAttribute("aria-current");
  });
});
