import { act, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { useAgentThemeSync } from "@/components/layout/agent/useAgentThemeSync";
import type { ThemePreference } from "@/lib/theme-preference";

function ThemeSyncHarness({
  pilotActive,
  serverTheme,
  onPersist,
}: {
  pilotActive: boolean;
  serverTheme: ThemePreference;
  onPersist: (theme: ThemePreference) => Promise<void>;
}) {
  useAgentThemeSync(pilotActive, serverTheme, onPersist);
  const { theme, toggleLightDark } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button type="button" data-testid="toggle" onClick={() => toggleLightDark()}>
        toggle
      </button>
    </div>
  );
}

describe("useAgentThemeSync integration", () => {
  it("hydrates server dark without PATCH when client storage is light", async () => {
    localStorage.setItem("remcard-theme", "light");
    document.documentElement.setAttribute("data-theme", "light");

    const onPersist = vi.fn(async () => {});

    render(
      <ThemeProvider>
        <ThemeSyncHarness pilotActive serverTheme="dark" onPersist={onPersist} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });
    await waitFor(() => {
      expect(onPersist).not.toHaveBeenCalled();
    });
    expect(localStorage.getItem("remcard-theme")).toBe("dark");
  });

  it("hydrates server light without PATCH when client storage is dark", async () => {
    localStorage.setItem("remcard-theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");

    const onPersist = vi.fn(async () => {});

    render(
      <ThemeProvider>
        <ThemeSyncHarness pilotActive serverTheme="light" onPersist={onPersist} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    });
    await waitFor(() => {
      expect(onPersist).not.toHaveBeenCalled();
    });
  });

  it("explicit toggle sends exactly one PATCH", async () => {
    localStorage.setItem("remcard-theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");

    const onPersist = vi.fn(async () => {});

    render(
      <ThemeProvider>
        <ThemeSyncHarness pilotActive serverTheme="dark" onPersist={onPersist} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    const user = userEvent.setup();
    await user.click(document.querySelector("[data-testid=toggle]")!);

    await waitFor(() => {
      expect(onPersist).toHaveBeenCalledTimes(1);
    });
    expect(onPersist.mock.calls[0]?.[0]).toBe("light");
  });

  it("queues the latest theme when a second toggle happens during in-flight PATCH", async () => {
    localStorage.setItem("remcard-theme", "dark");
    document.documentElement.setAttribute("data-theme", "dark");

    let resolveFirst: () => void = () => {};
    const first = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const onPersist = vi.fn(async (theme: ThemePreference) => {
      if (onPersist.mock.calls.length === 1) {
        await first;
      }
      void theme;
    });

    render(
      <ThemeProvider>
        <ThemeSyncHarness pilotActive serverTheme="dark" onPersist={onPersist} />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    });

    const user = userEvent.setup();
    await user.click(document.querySelector("[data-testid=toggle]")!);
    await waitFor(() => {
      expect(onPersist).toHaveBeenCalledTimes(1);
    });

    await user.click(document.querySelector("[data-testid=toggle]")!);

    await act(async () => {
      resolveFirst();
    });

    await waitFor(() => {
      expect(onPersist).toHaveBeenCalledTimes(2);
    });
    expect(onPersist.mock.calls[1]?.[0]).toBe("dark");
  });
});
