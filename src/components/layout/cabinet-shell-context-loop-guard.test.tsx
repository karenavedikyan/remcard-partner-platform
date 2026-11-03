import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CabinetShellContextProvider,
  useCabinetShellContext,
} from "@/components/layout/cabinet-shell-context";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function RefreshProbe({ fresh }: { fresh: string }) {
  const shell = useCabinetShellContext();
  if (!shell) return null;
  if (shell.shellContextToken === fresh) {
    shell.acknowledgeShellContextMatch();
    return <div data-testid="matched">ok</div>;
  }
  shell.requestShellRefreshIfStale(fresh);
  return <div data-testid="stale">stale</div>;
}

describe("cabinet shell refresh loop guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows A->B->A->B refresh cycles without skipping the second stale pair", async () => {
    const { rerender } = render(
      <CabinetShellContextProvider shellContextToken="A">
        <RefreshProbe fresh="B" />
      </CabinetShellContextProvider>,
    );
    expect(refresh).toHaveBeenCalledTimes(1);

    rerender(
      <CabinetShellContextProvider shellContextToken="A">
        <RefreshProbe fresh="A" />
      </CabinetShellContextProvider>,
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

    rerender(
      <CabinetShellContextProvider shellContextToken="A">
        <RefreshProbe fresh="B" />
      </CabinetShellContextProvider>,
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  });

  it("retries once when shell token unchanged after refresh", () => {
    const { rerender } = render(
      <CabinetShellContextProvider shellContextToken="A">
        <RefreshProbe fresh="B" />
      </CabinetShellContextProvider>,
    );
    expect(refresh).toHaveBeenCalledTimes(1);
    rerender(
      <CabinetShellContextProvider shellContextToken="A">
        <RefreshProbe fresh="B" />
      </CabinetShellContextProvider>,
    );
    expect(refresh).toHaveBeenCalledTimes(2);
    rerender(
      <CabinetShellContextProvider shellContextToken="A">
        <RefreshProbe fresh="B" />
      </CabinetShellContextProvider>,
    );
    expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(refresh.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
