import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
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
