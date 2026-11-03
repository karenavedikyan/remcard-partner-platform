import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";
import { CabinetShellContextProvider } from "@/components/layout/cabinet-shell-context";

const mocks = vi.hoisted(() => ({
  remcardFetch: vi.fn(),
  pathname: "/",
  refresh: vi.fn(),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    remcardFetch: mocks.remcardFetch,
  };
});

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ refresh: mocks.refresh, push: vi.fn() }),
}));

import { useIncomingPartnersCount } from "@/hooks/useIncomingPartnersCount";

function BadgeProbe({ initial, userId = "user-1" }: { initial: number; userId?: string }) {
  const count = useIncomingPartnersCount(initial, userId);
  return <span data-testid="badge-count">{count}</span>;
}

function PersistentHarness({
  shellToken,
  initial,
  userId = "user-1",
}: {
  shellToken: string;
  initial: number;
  userId?: string;
}) {
  return (
    <CabinetShellContextProvider shellContextToken={shellToken}>
      <BadgeProbe initial={initial} userId={userId} />
    </CabinetShellContextProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  mocks.pathname = "/";
  mocks.remcardFetch.mockResolvedValue({ partnerships: [] });
});

describe("useIncomingPartnersCount", () => {
  it("clears badge and requests shell refresh on HTTP 401", async () => {
    mocks.remcardFetch.mockRejectedValue(new RemcardApiError(401, "Unauthorized", null));
    render(<PersistentHarness shellToken="shell-a" initial={5} />);
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("badge-count")).toHaveTextContent("0"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(mocks.remcardFetch).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("clears badge on HTTP 403 without refresh or refetch loop", async () => {
    mocks.remcardFetch.mockRejectedValueOnce(new RemcardApiError(403, "Forbidden", null));
    mocks.remcardFetch.mockRejectedValueOnce(new RemcardApiError(401, "Unauthorized", null));
    render(<PersistentHarness shellToken="shell-a" initial={5} />);
    await waitFor(() => expect(screen.getByTestId("badge-count")).toHaveTextContent("0"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(mocks.remcardFetch).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(0);
  });

  it("does not refetch when authFailureEpoch bumps inside the provider", async () => {
    mocks.remcardFetch.mockRejectedValue(new RemcardApiError(401, "Unauthorized", null));
    render(<PersistentHarness shellToken="shell-a" initial={3} />);
    await waitFor(() => expect(mocks.remcardFetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 500));
    });
    expect(mocks.remcardFetch).toHaveBeenCalledTimes(1);
    expect(mocks.refresh.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("ignores late responses after pathname change (abort)", async () => {
    let resolve!: (value: { partnerships: [] }) => void;
    mocks.remcardFetch.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    function PathHarness() {
      return (
        <CabinetShellContextProvider shellContextToken="tok">
          <BadgeProbe initial={0} />
        </CabinetShellContextProvider>
      );
    }
    const { rerender } = render(<PathHarness />);
    mocks.pathname = "/clients";
    rerender(<PathHarness />);
    resolve({ partnerships: [] });
    await waitFor(() => expect(mocks.remcardFetch.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(mocks.remcardFetch.mock.calls.length).toBeLessThanOrEqual(3);
  });
});
