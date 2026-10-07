import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthFlow } from "./AuthFlow";

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  getAuthMe: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    body: { error?: string } | null;
    constructor(status: number, message: string, body: { error?: string } | null = null) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
}));

import { getAuthMe, remcardFetch } from "@/lib/api-client";

const readyReadiness = {
  nextStep: "ready" as const,
  missingConsents: [],
  needsProfileOnboarding: false,
  canAccessCabinet: true,
  isEmployee: false,
  isAdmin: false,
};

describe("AuthFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        return { user: { id: "store-1", role: "PRO" } };
      }
      if (path === "/api/account/cabinet-readiness") {
        return readyReadiness;
      }
      return { ok: true };
    });
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "store-1", role: "PRO" },
    });
  });

  it("submits code then confirms session and skips consents when ready", async () => {
    const ui = userEvent.setup();
    render(<AuthFlow returnTo="/scanner" />);

    await ui.type(screen.getByPlaceholderText("000000"), "123456");
    await ui.click(screen.getByRole("button", { name: /продолжить/i }));

    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/auth/verify-code", {
        method: "POST",
        body: { code: "123456" },
      });
    });
    expect(getAuthMe).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/scanner");
  });

  it("shows consents step when readiness requires them", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/account/cabinet-readiness") {
        return {
          nextStep: "consents",
          missingConsents: [
            {
              kind: "TERMS",
              legalDocumentId: "doc-1",
              version: "1.0",
              url: "/terms",
              status: "missing",
            },
          ],
          needsProfileOnboarding: false,
          canAccessCabinet: false,
          isEmployee: false,
          isAdmin: false,
        };
      }
      return { ok: true };
    });

    render(<AuthFlow initialStep="consents" returnTo="/scanner" />);

    expect(await screen.findByText(/обязательные соглашения/i)).toBeInTheDocument();
    expect(screen.getByText(/версия 1.0/i)).toBeInTheDocument();
  });
});
