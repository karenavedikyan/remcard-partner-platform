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
    expect(screen.getByRole("button", { name: "Открыть меню" })).toBeTruthy();
    const currentSection = screen.getByText("Партнёры", {
      selector: 'span[aria-current="page"]',
    });
    expect(currentSection).toBeTruthy();
    expect(currentSection.getAttribute("aria-current")).toBe("page");
    expect(currentSection.textContent).toBe("Партнёры");
    expect(screen.getAllByRole("navigation", { name: "Администрирование" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Главное меню")).toBeNull();
  });

  it("opens left drawer navigation and closes with button", async () => {
    const ui = userEvent.setup();
    render(
      <ThemeProvider>
        <AdminNav />
      </ThemeProvider>,
    );
    await ui.click(screen.getByRole("button", { name: "Открыть меню" }));
    const dialog = screen.getByRole("dialog", { name: "Меню" });
    expect(dialog).toBeTruthy();
    expect(dialog.className).toMatch(/navDrawer/);
    expect(screen.getAllByText("Контроль и развитие").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Модерация" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Команда" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Уведомления" }).length).toBeGreaterThan(0);
    await ui.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(screen.queryByRole("dialog", { name: "Меню" })).toBeNull();
  });

  it("closes drawer when viewport crosses desktop breakpoint", async () => {
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
    await ui.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(screen.getByRole("dialog", { name: "Меню" })).toBeTruthy();

    mql.matches = true;
    for (const fn of listeners.get("change") ?? []) {
      fn({ matches: true } as MediaQueryListEvent);
    }
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Меню" })).toBeNull());
  });

  it("closes with Escape and restores focus to the menu button", async () => {
    const ui = userEvent.setup();
    render(
      <ThemeProvider>
        <AdminNav />
      </ThemeProvider>,
    );
    const menuButton = screen.getByRole("button", { name: "Открыть меню" });
    await ui.click(menuButton);
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Меню" })).toBeTruthy());
    const dialog = screen.getByRole("dialog", { name: "Меню" });
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Меню" })).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(menuButton));
  });

  it("closes drawer after navigation click", async () => {
    const ui = userEvent.setup();
    render(
      <ThemeProvider>
        <AdminNav />
      </ThemeProvider>,
    );
    await ui.click(screen.getByRole("button", { name: "Открыть меню" }));
    expect(screen.getByRole("dialog", { name: "Меню" })).toBeTruthy();
    const teamLinks = screen.getAllByRole("link", { name: "Команда" });
    await ui.click(teamLinks[teamLinks.length - 1]!);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Меню" })).toBeNull());
  });
});
