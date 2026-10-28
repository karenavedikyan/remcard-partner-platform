import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AdminNav } from "./AdminNav";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/partners",
  useRouter: () => ({ replace, push: vi.fn() }),
}));

describe("Admin mobile navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows compact menu control and current section on narrow layout class hooks", async () => {
    render(
      <ThemeProvider>
        <AdminNav />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button", { name: "Разделы" })).toBeTruthy();
    expect(screen.getByText("Партнёры", { selector: "span" })).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "Администрирование" }).length).toBeGreaterThan(0);
  });

  it("opens dialog navigation and closes with button", async () => {
    const ui = userEvent.setup();
    render(
      <ThemeProvider>
        <AdminNav />
      </ThemeProvider>,
    );
    await ui.click(screen.getByRole("button", { name: "Разделы" }));
    const dialog = screen.getByRole("dialog", { name: "Навигация администратора" });
    expect(dialog).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "Модерация" }).length).toBeGreaterThan(0);
    await ui.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog", { name: "Навигация администратора" })).toBeNull();
  });
});
