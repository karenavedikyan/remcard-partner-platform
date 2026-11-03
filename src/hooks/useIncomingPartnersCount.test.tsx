import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RemcardApiError } from "@/lib/api-client";

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

function BadgeProbe({ initial }: { initial: number }) {
  const count = useIncomingPartnersCount(initial, "user-1");
  return <span data-testid="badge-count">{count}</span>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pathname = "/";
  mocks.remcardFetch.mockResolvedValue({ partnerships: [] });
});

describe("useIncomingPartnersCount", () => {
  it("clears badge and refreshes router on auth failure", async () => {
    mocks.remcardFetch.mockRejectedValue(new RemcardApiError(401, "Unauthorized", null));
    render(<BadgeProbe initial={5} />);
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId("badge-count")).toHaveTextContent("0"));
  });

  it("ignores late responses after pathname change (abort)", async () => {
    let resolve!: (value: { partnerships: [] }) => void;
    mocks.remcardFetch.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const { rerender } = render(<BadgeProbe initial={0} />);
    mocks.pathname = "/clients";
    rerender(<BadgeProbe initial={0} />);
    resolve({ partnerships: [] });
    await waitFor(() => expect(mocks.remcardFetch).toHaveBeenCalledTimes(2));
  });
});
