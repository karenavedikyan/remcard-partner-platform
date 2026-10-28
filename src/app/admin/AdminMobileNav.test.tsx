import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ADMIN_DESKTOP_NAV_MEDIA, AdminNav } from "./AdminNav";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/partners",
  useRouter: () => ({ replace, push: vi.fn() }),
}));

describe("Admin mobile navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
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

  it("closes dialog when viewport crosses desktop breakpoint", async () => {
    const listeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>();
    const mql: MediaQueryList = {
      media: ADMIN_DESKTOP_NAV_MEDIA,
      matches: false,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: (type, fn) => {
        if (type !== "change") return;
        const set = listeners.get(type) ?? new Set();
        set.add(fn as (e: MediaQueryListEvent) => void);
        listeners.set(type, set);
      },
      removeEventListener: (type, fn) => {
        listeners.get(type)?.delete(fn as (e: MediaQueryListEvent) => void);
      },
      dispatchEvent: () => true,
    };
    vi.spyOn(window, "matchMedia").mockImplementation(() => mql);

    const ui = userEvent.setup();
    render(
      <ThemeProvider>
        <AdminNav />
      </ThemeProvider>,
    );
    await ui.click(screen.getByRole("button", { name: "Разделы" }));
    expect(screen.getByRole("dialog", { name: "Навигация администратора" })).toBeTruthy();

    mql.matches = true;
    for (const fn of listeners.get("change") ?? []) {
      fn({ matches: true } as MediaQueryListEvent);
    }
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Навигация администратора" })).toBeNull(),
    );
  });

  it("closes with Escape and restores focus to the menu button", async () => {
    const ui = userEvent.setup();
    render(
      <ThemeProvider>
        <AdminNav />
      </ThemeProvider>,
    );
    const menuButton = screen.getByRole("button", { name: "Разделы" });
    await ui.click(menuButton);
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Навигация администратора" })).toBeTruthy(),
    );
    const dialog = screen.getByRole("dialog", { name: "Навигация администратора" });
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Навигация администратора" })).toBeNull(),
    );
    await waitFor(() => expect(document.activeElement).toBe(menuButton));
  });
});
