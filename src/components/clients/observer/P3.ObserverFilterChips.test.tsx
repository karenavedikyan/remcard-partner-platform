import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ObserverFilterChips } from "./ObserverFilterChips";

describe("P3.ObserverFilterChips", () => {
  it("renders search and period chips matching prototype labels", () => {
    render(
      <ObserverFilterChips q="  Анна " period="90" onClearQ={vi.fn()} onClearPeriod={vi.fn()} />,
    );
    expect(screen.getByTestId("ca-observer-filter-chips")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Сбросить поиск" }).textContent).toContain(
      "Поиск: Анна",
    );
    expect(screen.getByRole("button", { name: "Сбросить период направления" }).textContent).toBe(
      "Период: 90 дней ×",
    );
  });

  it("returns null when no filters are active", () => {
    const { container } = render(
      <ObserverFilterChips q="" period="all" onClearQ={vi.fn()} onClearPeriod={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("invokes clear handlers", async () => {
    const user = userEvent.setup();
    const onClearQ = vi.fn();
    const onClearPeriod = vi.fn();
    render(
      <ObserverFilterChips q="x" period="30" onClearQ={onClearQ} onClearPeriod={onClearPeriod} />,
    );
    await user.click(screen.getByRole("button", { name: "Сбросить поиск" }));
    await user.click(screen.getByRole("button", { name: "Сбросить период направления" }));
    expect(onClearQ).toHaveBeenCalledOnce();
    expect(onClearPeriod).toHaveBeenCalledOnce();
  });
});
