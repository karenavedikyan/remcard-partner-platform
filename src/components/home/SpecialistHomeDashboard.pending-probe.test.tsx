import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpecialistHomeDashboard } from "./SpecialistHomeDashboard";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
}));

const { remcardFetch } = await import("@/lib/api-client");

const zeroWallet = {
  role: "MASTER",
  totalRub: 0,
  paidRub: 0,
  pendingRub: 0,
  awaitingRub: 0,
  suspendedRub: 0,
  balanceRub: 0,
  count: 0,
};

function expectPendingSupplementalShell() {
  expect(screen.getByTestId("home-supplemental-skeleton")).toHaveAttribute("aria-busy", "true");
  expect(document.querySelector("#specialist-home-hero")).toBeNull();
  expect(screen.queryByRole("link", { name: /Создать сертификат/ })).not.toBeInTheDocument();
  expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
}

describe("SpecialistHomeDashboard pending supplemental probe", () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(remcardFetch).mockReset();
  });

  it("shows supplemental skeleton (no hero or dashboard CTAs) until partnership probe settles", async () => {
    let resolvePartnership!: (value: { partnerships: unknown[] }) => void;
    const partnershipGate = new Promise<{ partnerships: unknown[] }>((resolve) => {
      resolvePartnership = resolve;
    });

    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") return zeroWallet;
      if (path === "/api/store/certificate") return { certificates: [] };
      if (path === "/api/partnership/list") return partnershipGate;
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expectPendingSupplementalShell();
    });

    resolvePartnership({ partnerships: [] });

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
    expect(document.querySelector("#specialist-home-hero")).toBeNull();
  });

  it("restores dashboard when partnership probe finds activity", async () => {
    let resolvePartnership!: (value: { partnerships: unknown[] }) => void;
    const partnershipGate = new Promise<{ partnerships: unknown[] }>((resolve) => {
      resolvePartnership = resolve;
    });

    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") return zeroWallet;
      if (path === "/api/store/certificate") return { certificates: [] };
      if (path === "/api/partnership/list") return partnershipGate;
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expectPendingSupplementalShell();
    });

    resolvePartnership({ partnerships: [{ id: "p1" }] });

    await waitFor(() => {
      expect(document.querySelector("#specialist-home-hero")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("home-supplemental-skeleton")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("restores dashboard when partnership probe errors", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") return zeroWallet;
      if (path === "/api/store/certificate") return { certificates: [] };
      if (path === "/api/partnership/list") {
        throw new Error("network");
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(screen.queryByTestId("home-supplemental-skeleton")).not.toBeInTheDocument();
      expect(document.querySelector("#specialist-home-hero")).toBeInTheDocument();
      expect(screen.getAllByText("0", { selector: "strong" }).length).toBeGreaterThan(0);
    });
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
