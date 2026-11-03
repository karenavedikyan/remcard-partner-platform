import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CabinetShellIdentityReconcileDeadEnd } from "@/components/layout/CabinetShellIdentityReconcileDeadEnd";

describe("CabinetShellIdentityReconcileDeadEnd", () => {
  it("shows Russian copy and reload button with skeleton geometry", () => {
    render(<CabinetShellIdentityReconcileDeadEnd />);
    expect(screen.getByTestId("cabinet-shell-identity-reconcile-dead-end")).toBeInTheDocument();
    expect(screen.getByTestId("cabinet-page-heading-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("cabinet-page-loading-body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Обновить страницу" })).toBeInTheDocument();
    expect(screen.getByText(/Не удалось обновить кабинет/)).toBeInTheDocument();
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
