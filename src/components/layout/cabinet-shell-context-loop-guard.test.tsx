import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CabinetShellContextProvider,
  useCabinetShellStableContext,
} from "@/components/layout/cabinet-shell-context";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

function RefreshProbe({ fresh }: { fresh: string }) {
  const shell = useCabinetShellStableContext();
  const shellContextToken = shell?.shellContextToken;
  const acknowledgeShellContextMatch = shell?.acknowledgeShellContextMatch;
  const requestShellRefreshIfStale = shell?.requestShellRefreshIfStale;

  useEffect(() => {
    if (!shellContextToken || !acknowledgeShellContextMatch || !requestShellRefreshIfStale) {
      return;
    }
    if (shellContextToken === fresh) {
      acknowledgeShellContextMatch();
      return;
    }
    requestShellRefreshIfStale(fresh);
  }, [shellContextToken, fresh, acknowledgeShellContextMatch, requestShellRefreshIfStale]);

  if (!shell) return null;
  if (shell.shellContextToken === fresh) {
    return <div data-testid="matched">ok</div>;
  }
  return <div data-testid="stale">stale</div>;
}

function PersistentShellHarness({
  shellToken,
  initialFresh,
}: {
  shellToken: string;
  initialFresh: string;
}) {
  const [fresh, setFresh] = useState(initialFresh);
  return (
    <>
      <button type="button" data-testid="set-fresh-a" onClick={() => setFresh("A")}>
        A
      </button>
      <button type="button" data-testid="set-fresh-b" onClick={() => setFresh("B")}>
        B
      </button>
      <CabinetShellContextProvider shellContextToken={shellToken}>
        <RefreshProbe fresh={fresh} />
      </CabinetShellContextProvider>
    </>
  );
}

describe("cabinet shell refresh loop guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows A->B->A->B refresh cycles without skipping the second stale pair", async () => {
    render(<PersistentShellHarness shellToken="A" initialFresh="B" />);
    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      screen.getByTestId("set-fresh-a").click();
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));

    await act(async () => {
      screen.getByTestId("set-fresh-b").click();
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  });

  it("caps at one refresh per stale pair while shell token is unchanged", async () => {
    render(<PersistentShellHarness shellToken="A" initialFresh="B" />);
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
