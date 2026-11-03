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

function compactStatText(value: string): string {
  return value.replace(/[\u00a0\u202f\s]/g, "");
}

function getStatStrong(text: string): HTMLElement {
  const expected = compactStatText(text);
  return screen.getByText((_, element) => {
    return (
      element?.tagName === "STRONG" &&
      compactStatText(element.textContent ?? "") === expected
    );
  });
}

describe("SpecialistHomeDashboard malformed MASTER wallet", () => {
  beforeEach(() => {
    cleanup();
    vi.mocked(remcardFetch).mockReset();
  });

  it("renders without crash when paidRub is missing and shows dash for received", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/pro/wallet/balance") {
        return {
          role: "MASTER",
          totalRub: 1500,
          pendingRub: 700,
          count: 2,
        };
      }
      if (path === "/api/store/certificate") {
        return { certificates: [{ id: "c1" }] };
      }
      if (path === "/api/partnership/list") {
        return { partnerships: [{ id: "p1" }] };
      }
      throw new Error(path);
    });

    render(<SpecialistHomeDashboard />);

    await waitFor(() => {
      expect(document.querySelector("#specialist-home-hero")).toBeInTheDocument();
    });
    expect(getStatStrong("—")).toBeInTheDocument();
    expect(getStatStrong("1500₽")).toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });
});
