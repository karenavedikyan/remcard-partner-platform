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

import { getAuthMe, remcardFetch, RemcardApiError } from "@/lib/api-client";

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
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "store-1", role: "PRO" },
    });
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        return { user: { id: "store-1", role: "PRO" } };
      }
      if (path === "/api/account/cabinet-readiness") {
        return readyReadiness;
      }
      return { ok: true };
    });
  });

  it("checks existing session on mount before showing code form", async () => {
    render(<AuthFlow returnTo="/scanner" />);

    await waitFor(() => {
      expect(getAuthMe).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/scanner");
    });
  });

  it("shows code form when no session exists", async () => {
    vi.mocked(getAuthMe).mockResolvedValue({ user: null });
    render(<AuthFlow returnTo="/scanner" />);

    expect(await screen.findByRole("heading", { name: /присоединяйтесь к remcard prof/i })).toBeInTheDocument();
  });

  it("submits code then confirms session and skips consents when ready", async () => {
    let sessionActive = false;
    vi.mocked(getAuthMe).mockImplementation(async () => ({
      user: sessionActive ? { id: "store-1", role: "PRO" } : null,
    }));
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        sessionActive = true;
        return { ok: true };
      }
      if (path === "/api/account/cabinet-readiness") {
        return readyReadiness;
      }
      return { ok: true };
    });

    const ui = userEvent.setup();
    render(<AuthFlow returnTo="/scanner" />);

    await screen.findByRole("heading", { name: /присоединяйтесь к remcard prof/i });
    await ui.type(screen.getByPlaceholderText("000000"), "123456");
    await ui.click(screen.getByRole("button", { name: /продолжить/i }));

    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/auth/verify-code", {
        method: "POST",
        body: { code: "123456" },
      });
    });
    expect(getAuthMe.mock.calls.length).toBeGreaterThanOrEqual(2);
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/scanner");
    });
  });

  it("offers retry after readiness failure without re-showing invalid code", async () => {
    let sessionActive = false;
    vi.mocked(getAuthMe).mockImplementation(async () => ({
      user: sessionActive ? { id: "store-1", role: "PRO" } : null,
    }));
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        sessionActive = true;
        return { ok: true };
      }
      if (path === "/api/account/cabinet-readiness") {
        throw new RemcardApiError(503, "Service unavailable", { error: "x" });
      }
      return { ok: true };
    });

    const ui = userEvent.setup();
    render(<AuthFlow returnTo="/scanner" />);
    await screen.findByRole("heading", { name: /присоединяйтесь к remcard prof/i });
    await ui.type(screen.getByPlaceholderText("000000"), "123456");
    await ui.click(screen.getByRole("button", { name: /продолжить/i }));

    expect(await screen.findByRole("button", { name: /повторить проверку/i })).toBeInTheDocument();
    expect(screen.queryByText(/неверный/i)).not.toBeInTheDocument();
  });

  it("shows consents before onboarding when CLIENT needs both", async () => {
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
            {
              kind: "PUBLIC_OFFER_PRO",
              legalDocumentId: "doc-offer",
              version: "1.0",
              url: "/legal/public-offer-pro",
              status: "missing",
            },
          ],
          needsProfileOnboarding: true,
          canAccessCabinet: false,
          isEmployee: false,
          isAdmin: false,
        };
      }
      return { ok: true };
    });

    render(<AuthFlow returnTo="/scanner" />);

    expect(await screen.findByText(/обязательные соглашения/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("/onboarding"));
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

    render(<AuthFlow returnTo="/scanner" />);

    expect(await screen.findByText(/обязательные соглашения/i)).toBeInTheDocument();
    expect(screen.getByText(/версия 1.0/i)).toBeInTheDocument();
  });

  it("shows access denied when consents are empty but cabinet access is false", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/account/cabinet-readiness") {
        return {
          nextStep: "ready",
          missingConsents: [],
          needsProfileOnboarding: false,
          canAccessCabinet: false,
          isEmployee: false,
          isAdmin: true,
        };
      }
      return { ok: true };
    });

    render(<AuthFlow returnTo="/scanner" />);

    expect(await screen.findByRole("heading", { name: /доступ ограничен/i })).toBeInTheDocument();
    expect(screen.queryByText(/загружаем список соглашений/i)).not.toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /повторить проверку/i });
    expect(retryButton).not.toBeDisabled();
  });

  it("routes OWNER+PRO with cabinet access to returnTo", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/account/cabinet-readiness") {
        return {
          nextStep: "ready",
          missingConsents: [],
          needsProfileOnboarding: false,
          canAccessCabinet: true,
          isEmployee: false,
          isAdmin: true,
        };
      }
      return { ok: true };
    });

    render(<AuthFlow returnTo="/scanner" />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/scanner");
    });
  });

  it("skips registration when partner is already ready for cabinet", async () => {
    render(<AuthFlow returnTo="/partners" />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/partners");
    });
    expect(replace).not.toHaveBeenCalledWith(expect.stringContaining("/onboarding"));
  });

  it("shows Telegram and MAX bot links on code step", async () => {
    vi.mocked(getAuthMe).mockResolvedValue({ user: null });
    render(<AuthFlow returnTo="/scanner" />);

    expect(await screen.findByRole("link", { name: /получить код в telegram/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /получить код в max/i })).toBeInTheDocument();
    expect(screen.getByText(/шаг 1\. получите код/i)).toBeInTheDocument();
    expect(screen.getByText(/шаг 2\. введите код/i)).toBeInTheDocument();
    expect(screen.queryByText(/^или$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/нет кода\? отправьте боту команду \/login/i)).toBeInTheDocument();
  });
});
