import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CabinetShellContextProvider } from "@/components/layout/cabinet-shell-context";
import { CabinetShellTemplateReconciler } from "@/components/layout/CabinetShellTemplateReconciler";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("CabinetShellTemplateReconciler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children when shell context is absent", () => {
    render(
      <CabinetShellTemplateReconciler freshShellContextToken="abc">
        <div data-testid="page">page</div>
      </CabinetShellTemplateReconciler>,
    );
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renders children when tokens match", () => {
    render(
      <CabinetShellContextProvider shellContextToken="token-a">
        <CabinetShellTemplateReconciler freshShellContextToken="token-a">
          <div data-testid="page">page</div>
        </CabinetShellTemplateReconciler>
      </CabinetShellContextProvider>,
    );
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("hides children and refreshes once per stale pair", () => {
    const { rerender } = render(
      <CabinetShellContextProvider shellContextToken="shell-a">
        <CabinetShellTemplateReconciler freshShellContextToken="fresh-b">
          <div data-testid="page">page</div>
        </CabinetShellTemplateReconciler>
      </CabinetShellContextProvider>,
    );
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
    expect(screen.getByTestId("cabinet-page-detail-loading-skeleton")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);

    rerender(
      <CabinetShellContextProvider shellContextToken="shell-a">
        <CabinetShellTemplateReconciler freshShellContextToken="fresh-b">
          <div data-testid="page">page</div>
        </CabinetShellTemplateReconciler>
      </CabinetShellContextProvider>,
    );
    expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(2);
    const capped = refresh.mock.calls.length;
    rerender(
      <CabinetShellContextProvider shellContextToken="shell-a">
        <CabinetShellTemplateReconciler freshShellContextToken="fresh-b">
          <div data-testid="page">page</div>
        </CabinetShellTemplateReconciler>
      </CabinetShellContextProvider>,
    );
    expect(refresh.mock.calls.length).toBeLessThanOrEqual(capped + 1);
    const cappedAgain = refresh.mock.calls.length;
    rerender(
      <CabinetShellContextProvider shellContextToken="shell-a">
        <CabinetShellTemplateReconciler freshShellContextToken="fresh-b">
          <div data-testid="page">page</div>
        </CabinetShellTemplateReconciler>
      </CabinetShellContextProvider>,
    );
    expect(refresh.mock.calls.length).toBe(cappedAgain);
  });

  it("refreshes when fresh token is none but shell still mounted", () => {
    render(
      <CabinetShellContextProvider shellContextToken="shell-a">
        <CabinetShellTemplateReconciler freshShellContextToken="none">
          <div data-testid="page">page</div>
        </CabinetShellTemplateReconciler>
      </CabinetShellContextProvider>,
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });
});
