import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("SSR markup ignores document data-theme until client hydrate", async () => {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("remcard-theme", "dark");

    const html = renderToString(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(html).toContain("Включить тёмную тему");

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("theme-toggle")).toHaveAttribute(
        "aria-label",
        "Включить светлую тему",
      );
    });
  });

  it("toggles data-theme on documentElement", async () => {
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.removeItem("remcard-theme");

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("theme-toggle"));

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("remcard-theme")).toBe("dark");
  });

  it("does not throw when localStorage.setItem fails", async () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    document.documentElement.setAttribute("data-theme", "dark");

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const user = userEvent.setup();
    await expect(user.click(screen.getByTestId("theme-toggle"))).resolves.toBeUndefined();
    spy.mockRestore();
  });
});
