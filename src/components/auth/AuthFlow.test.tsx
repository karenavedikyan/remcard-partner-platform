import { render as rtlRender, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthFlow } from "./AuthFlow";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { COOKIE_CONSENT_HTTP, COOKIE_CONSENT_KEY } from "@/lib/cookie-consent";

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: CookieConsentProvider });
}

const replace = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh }),
}));

vi.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => null,
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
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    document.cookie = `${COOKIE_CONSENT_HTTP}=;path=/;max-age=0`;
    vi.stubGlobal("open", vi.fn());
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

  it("shows provider step when no session exists", async () => {
    vi.mocked(getAuthMe).mockResolvedValue({ user: null });
    render(<AuthFlow returnTo="/scanner" />);

    expect(await screen.findByRole("heading", { name: /с возвращением/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /продолжить с max/i })).toBeInTheDocument();
    expect(screen.queryByTestId("analytics-consent-login")).toBeNull();
    expect(screen.queryByText("Аналитика кабинета")).toBeNull();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
  });

  it.each([true, false])("saves the optional analytics choice only after actual legal completion: %s", async enabled => {
    const recorded: string[] = [];
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/account/consent") {
        recorded.push((init?.body as { kind: string }).kind);
        return { ok: true };
      }
      if (path === "/api/account/cabinet-readiness") {
        return recorded.length === 2 ? readyReadiness : {
          ...readyReadiness, nextStep: "consents", canAccessCabinet: false,
          missingConsents: [
            { kind: "PERSONAL_DATA", legalDocumentId: "qa-privacy", version: "1", url: "/privacy", status: "missing" },
            { kind: "TERMS", legalDocumentId: "qa-terms", version: "1", url: "/terms", status: "missing" },
          ],
        };
      }
      return { ok: true };
    });
    const ui = userEvent.setup();
    render(<AuthFlow returnTo="/scanner" />);
    const analytics = await screen.findByRole("checkbox", { name: /разрешить учёт посещений/i });
    expect(analytics).toBeChecked();
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
    if (!enabled) await ui.click(analytics);
    await ui.click(screen.getByRole("checkbox", { name: /я принимаю обработку/i }));
    await ui.click(screen.getByRole("checkbox", { name: /я принимаю пользовательское/i }));
    await ui.click(screen.getByRole("button", { name: "Продолжить" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/scanner"));
    await waitFor(() => expect(JSON.parse(localStorage.getItem(COOKIE_CONSENT_KEY)!)).toMatchObject({ analytics: enabled, marketing: false }));
    expect(recorded).toEqual(["PERSONAL_DATA", "TERMS"]);
  });

  it.each([409, 503])("does not turn analytics on after rejected legal submission: %s", async status => {
    vi.mocked(remcardFetch).mockImplementation(async path => {
      if (path === "/api/account/consent") throw new RemcardApiError(status, "QA failure", {
        error: status === 409 ? "DOCUMENT_VERSION_MISMATCH" : "UNAVAILABLE",
      });
      return {
        ...readyReadiness, nextStep: "consents", canAccessCabinet: false,
        missingConsents: [{ kind: "TERMS", legalDocumentId: "qa-terms", version: "1", url: "/terms", status: "missing" }],
      };
    });
    const ui = userEvent.setup();
    render(<AuthFlow returnTo="/scanner" />);
    await ui.click(await screen.findByRole("checkbox", { name: /я принимаю пользовательское/i }));
    await ui.click(screen.getByRole("button", { name: "Продолжить" }));
    await screen.findByRole("alert");
    if (status === 409) {
      await waitFor(() => expect(screen.getByRole("checkbox", { name: /я принимаю пользовательское/i })).not.toBeChecked());
    }
    expect(localStorage.getItem(COOKIE_CONSENT_KEY)).toBeNull();
    expect(replace).not.toHaveBeenCalled();
  });

  it("does not automatically check or redirect a partner session during admin entry", async () => {
    render(<AuthFlow checkSessionOnMount={false} />);

    expect(await screen.findByRole("heading", { name: /с возвращением/i })).toBeInTheDocument();
    expect(getAuthMe).not.toHaveBeenCalled();
    expect(remcardFetch).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not redirect after unmount during delayed readiness", async () => {
    vi.mocked(getAuthMe).mockResolvedValue({
      user: { id: "store-1", role: "PRO" },
    });
    vi.mocked(remcardFetch).mockImplementation((path) => {
      if (path === "/api/account/cabinet-readiness") {
        return new Promise((resolve) => {
          setTimeout(() => resolve(readyReadiness), 80);
        });
      }
      return Promise.resolve({ ok: true });
    });

    const { unmount } = render(<AuthFlow returnTo="/admin/test-users" />);
    await waitFor(() => {
      expect(getAuthMe).toHaveBeenCalled();
    });
    unmount();
    await new Promise((r) => setTimeout(r, 120));
    expect(replace).not.toHaveBeenCalled();
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

    await screen.findByRole("heading", { name: /с возвращением/i });
    await ui.click(screen.getByRole("button", { name: /продолжить с max/i }));
    await screen.findByRole("heading", { name: /введите одноразовый код/i });
    await ui.type(screen.getByPlaceholderText("000000"), "123456");
    await ui.click(screen.getByRole("button", { name: /подтвердить и продолжить/i }));

    await waitFor(() => {
      expect(remcardFetch).toHaveBeenCalledWith("/api/auth/verify-code", {
        method: "POST",
        body: { code: "123456", entrySite: "prof" },
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
    await screen.findByRole("heading", { name: /с возвращением/i });
    await ui.click(screen.getByRole("button", { name: /продолжить с max/i }));
    await screen.findByRole("heading", { name: /введите одноразовый код/i });
    await ui.type(screen.getByPlaceholderText("000000"), "123456");
    await ui.click(screen.getByRole("button", { name: /подтвердить и продолжить/i }));

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

  it("opens messenger once when choosing provider and supports switch without second open", async () => {
    vi.mocked(getAuthMe).mockResolvedValue({ user: null });
    const openSpy = vi.mocked(window.open);
    const ui = userEvent.setup();
    render(<AuthFlow returnTo="/scanner" />);

    await screen.findByRole("heading", { name: /с возвращением/i });
    await ui.click(screen.getByRole("button", { name: /продолжить с max/i }));
    expect(openSpy).toHaveBeenCalledTimes(1);

    await ui.click(screen.getByRole("button", { name: /другой способ входа/i }));
    await screen.findByRole("button", { name: /продолжить с telegram/i });
    expect(openSpy).toHaveBeenCalledTimes(1);

    await ui.click(screen.getByRole("button", { name: /продолжить с telegram/i }));
    expect(openSpy).toHaveBeenCalledTimes(2);
  });

  it("resend opens messenger again", async () => {
    vi.mocked(getAuthMe).mockResolvedValue({ user: null });
    const openSpy = vi.mocked(window.open);
    const ui = userEvent.setup();
    render(<AuthFlow returnTo="/scanner" />);

    await ui.click(await screen.findByRole("button", { name: /продолжить с max/i }));
    await ui.click(screen.getByRole("button", { name: /получить код повторно/i }));
    expect(openSpy).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/дождитесь кода/i);
    });
  });
});
