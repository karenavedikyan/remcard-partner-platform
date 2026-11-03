import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { CabinetShellContextProvider } from "@/components/layout/cabinet-shell-context";
import { CabinetShellTemplateReconciler } from "@/components/layout/CabinetShellTemplateReconciler";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function ReconcilerHarness({
  shellToken,
  initialFresh,
}: {
  shellToken: string;
  initialFresh: string;
}) {
  const [fresh, setFresh] = useState(initialFresh);
  return (
    <>
      <button type="button" data-testid="fresh-a" onClick={() => setFresh("shell-a")}>
        a
      </button>
      <button type="button" data-testid="fresh-b" onClick={() => setFresh("fresh-b")}>
        b
      </button>
      <button type="button" data-testid="fresh-none" onClick={() => setFresh("none")}>
        none
      </button>
      <CabinetShellContextProvider shellContextToken={shellToken}>
        <CabinetShellTemplateReconciler freshShellContextToken={fresh}>
          <div data-testid="page">page</div>
        </CabinetShellTemplateReconciler>
      </CabinetShellContextProvider>
    </>
  );
}

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
      <CabinetShellContextProvider shellContextToken="shell-a">
        <CabinetShellTemplateReconciler freshShellContextToken="shell-a">
          <div data-testid="page">page</div>
        </CabinetShellTemplateReconciler>
      </CabinetShellContextProvider>,
    );
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("hides children, refreshes once, then shows dead-end UI for persistent mismatch", async () => {
    render(<ReconcilerHarness shellToken="shell-a" initialFresh="fresh-b" />);
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByTestId("cabinet-shell-identity-reconcile-dead-end")).toBeInTheDocument(),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not refresh again when remounting the same stale pair in a persistent provider", async () => {
    render(<ReconcilerHarness shellToken="shell-a" initialFresh="fresh-b" />);
    await waitFor(() =>
      expect(screen.getByTestId("cabinet-shell-identity-reconcile-dead-end")).toBeInTheDocument(),
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("fresh-b"));
    expect(refresh).toHaveBeenCalledTimes(1);
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

  it("resets cap after tokens match via harness fresh token", async () => {
    render(<ReconcilerHarness shellToken="shell-a" initialFresh="fresh-b" />);
    expect(refresh).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("fresh-a"));
    await waitFor(() => expect(screen.getByTestId("page")).toBeInTheDocument());
    expect(refresh).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId("fresh-b"));
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
