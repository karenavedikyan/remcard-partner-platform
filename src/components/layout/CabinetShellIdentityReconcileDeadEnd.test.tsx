import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CabinetShellIdentityReconcileDeadEnd } from "@/components/layout/CabinetShellIdentityReconcileDeadEnd";

const STATUS_COPY =
  "Обновляем кабинет. Если страница не обновилась, нажмите «Обновить страницу».";

describe("CabinetShellIdentityReconcileDeadEnd", () => {
  it("shows status role, neutral copy, and reload button with skeleton geometry", () => {
    render(<CabinetShellIdentityReconcileDeadEnd />);
    const root = screen.getByTestId("cabinet-shell-identity-reconcile-dead-end");
    expect(root).toHaveAttribute("role", "status");
    expect(root).toHaveAttribute("aria-live", "polite");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(within(root).getByText(STATUS_COPY)).toBeInTheDocument();
    expect(screen.queryByText(/Не удалось/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/ошиб/i)).not.toBeInTheDocument();
    expect(screen.getByTestId("cabinet-page-heading-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("cabinet-page-loading-body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Обновить страницу" })).toBeInTheDocument();
  });

  it("calls window.location.reload on button click", () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    render(<CabinetShellIdentityReconcileDeadEnd />);
    fireEvent.click(screen.getByRole("button", { name: "Обновить страницу" }));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});
