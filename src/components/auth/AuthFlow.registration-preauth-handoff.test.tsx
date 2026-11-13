import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthFlow } from "./AuthFlow";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { QA_PRE_AUTH_CONSENTS } from "@/lib/registration/pre-auth-consent-fixtures";
import {
  clearPreAuthConsentSnapshot,
  createPreAuthAttemptId,
  savePreAuthConsentSnapshot,
} from "@/lib/registration/pre-auth-consent";

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

vi.mock("@/lib/auth-session", () => ({
  fetchAuthMeSafe: vi.fn(),
  fetchReadinessSafe: vi.fn(),
  consentRequirementKey: (req: { kind: string; legalDocumentId: string | null }) =>
    `${req.kind}:${req.legalDocumentId ?? ""}`,
}));

import { remcardFetch, RemcardApiError } from "@/lib/api-client";
import { fetchAuthMeSafe, fetchReadinessSafe } from "@/lib/auth-session";

const registrationPending = {
  nextStep: "consents" as const,
  missingConsents: QA_PRE_AUTH_CONSENTS.requirements.map((req) => ({
    kind: req.kind,
    legalDocumentId: req.legalDocumentId,
    version: req.version,
    url: req.documentUrl,
    status: "missing" as const,
  })),
  needsProfileOnboarding: true,
  canAccessCabinet: false,
  isEmployee: false,
  isAdmin: false,
};

const registrationReady = {
  nextStep: "profile" as const,
  missingConsents: [],
  needsProfileOnboarding: true,
  canAccessCabinet: false,
  isEmployee: false,
  isAdmin: false,
};

describe("AuthFlow registration pre-auth handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    replace.mockReset();
    vi.stubGlobal("open", vi.fn());
    vi.mocked(fetchAuthMeSafe).mockResolvedValue({ ok: false, kind: "unauthorized" });
  });

  it("records server consents after verify without second consent form", async () => {
    savePreAuthConsentSnapshot("agent", QA_PRE_AUTH_CONSENTS.requirements, createPreAuthAttemptId());
    let sessionActive = false;
    const recorded: string[] = [];
    let readinessCalls = 0;

    vi.mocked(fetchAuthMeSafe).mockImplementation(async () =>
      sessionActive
        ? { ok: true, data: { user: { id: "reg-user-1", role: "PRO" } } }
        : { ok: false, kind: "unauthorized" },
    );
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/auth/verify-code") {
        sessionActive = true;
        return { ok: true };
      }
      if (path === "/api/account/consent") {
        recorded.push((init?.body as { kind: string }).kind);
        return { ok: true };
      }
      return { ok: true };
    });
    vi.mocked(fetchReadinessSafe).mockImplementation(async () => {
      readinessCalls += 1;
      return {
        ok: true,
        data: readinessCalls === 1 ? registrationPending : registrationReady,
      };
    });

    const ui = userEvent.setup();
    render(
      <CookieConsentProvider>
        <AuthFlow
          returnTo="/join?phase=finish&role=agent"
          checkSessionOnMount={false}
          registrationAgentJoin
          registrationJoinKind="agent"
          registrationMessengerGateReady
        />
      </CookieConsentProvider>,
    );

    await ui.click(await screen.findByRole("button", { name: /продолжить с max/i }));
    await ui.type(screen.getByPlaceholderText("000000"), "123456");
    await ui.click(screen.getByRole("button", { name: /подтвердить и продолжить/i }));

    await waitFor(() => {
      expect(recorded).toEqual(["PERSONAL_DATA", "TERMS", "PUBLIC_OFFER_PRO"]);
    });
    expect(screen.queryByText(/обязательные соглашения/i)).toBeNull();
    clearPreAuthConsentSnapshot("agent");
  });

  it("shows consent step when snapshot version does not match readiness", async () => {
    savePreAuthConsentSnapshot("specialist", QA_PRE_AUTH_CONSENTS.requirements, createPreAuthAttemptId());
    let sessionActive = false;
    const termsV2 = {
      kind: "TERMS" as const,
      legalDocumentId: "terms-v2",
      version: "2026-12-01",
      url: "/terms",
      status: "missing" as const,
    };
    const readinessTermsChanged = {
      ...registrationPending,
      missingConsents: registrationPending.missingConsents.map((row) =>
        row.kind === "TERMS" ? termsV2 : row,
      ),
    };
    const readinessTermsOnly = {
      ...registrationPending,
      missingConsents: [termsV2],
    };
    let readinessCalls = 0;
    vi.mocked(fetchAuthMeSafe).mockImplementation(async () =>
      sessionActive
        ? { ok: true, data: { user: { id: "reg-user-2", role: "PRO" } } }
        : { ok: false, kind: "unauthorized" },
    );
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        sessionActive = true;
        return { ok: true };
      }
      return { ok: true };
    });
    vi.mocked(fetchReadinessSafe).mockImplementation(async () => {
      readinessCalls += 1;
      return {
        ok: true,
        data: readinessCalls === 1 ? readinessTermsChanged : readinessTermsOnly,
      };
    });

    const ui = userEvent.setup();
    render(
      <CookieConsentProvider>
        <AuthFlow
          returnTo="/join?phase=finish&role=specialist"
          checkSessionOnMount={false}
          registrationAgentJoin
          registrationJoinKind="specialist"
          registrationMessengerGateReady
        />
      </CookieConsentProvider>,
    );

    await ui.click(await screen.findByRole("button", { name: /продолжить с max/i }));
    await ui.type(screen.getByPlaceholderText("000000"), "654321");
    await ui.click(screen.getByRole("button", { name: /подтвердить и продолжить/i }));

    expect(await screen.findByText(/обязательные соглашения/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /пользовательское соглашение/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /обработку персональных данных/i })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /публичную оферту/i })).toBeNull();
    clearPreAuthConsentSnapshot("specialist");
  });

  it("after partial pre-auth record shows only remaining consent checkboxes (company)", async () => {
    savePreAuthConsentSnapshot("company", QA_PRE_AUTH_CONSENTS.requirements, createPreAuthAttemptId());
    let sessionActive = false;
    const recorded: string[] = [];
    const termsV2 = {
      kind: "TERMS" as const,
      legalDocumentId: "terms-v2",
      version: "2026-12-01",
      url: "/terms",
      status: "missing" as const,
    };
    const readinessAllThreeTermsChanged = {
      ...registrationPending,
      missingConsents: registrationPending.missingConsents.map((row) =>
        row.kind === "TERMS" ? termsV2 : row,
      ),
    };
    const readinessTermsOnly = {
      ...registrationPending,
      missingConsents: [termsV2],
    };
    let readinessCalls = 0;

    vi.mocked(fetchAuthMeSafe).mockImplementation(async () =>
      sessionActive
        ? { ok: true, data: { user: { id: "reg-user-company-partial", role: "PRO" } } }
        : { ok: false, kind: "unauthorized" },
    );
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      if (path === "/api/auth/verify-code") {
        sessionActive = true;
        return { ok: true };
      }
      if (path === "/api/account/consent") {
        recorded.push((init?.body as { kind: string }).kind);
        return { ok: true };
      }
      return { ok: true };
    });
    vi.mocked(fetchReadinessSafe).mockImplementation(async () => {
      readinessCalls += 1;
      return {
        ok: true,
        data: readinessCalls === 1 ? readinessAllThreeTermsChanged : readinessTermsOnly,
      };
    });

    const ui = userEvent.setup();
    render(
      <CookieConsentProvider>
        <AuthFlow
          returnTo="/join?phase=finish&role=company"
          checkSessionOnMount={false}
          registrationAgentJoin
          registrationJoinKind="company"
          registrationMessengerGateReady
        />
      </CookieConsentProvider>,
    );

    await ui.click(await screen.findByRole("button", { name: /продолжить с telegram/i }));
    await ui.type(screen.getByPlaceholderText("000000"), "444444");
    await ui.click(screen.getByRole("button", { name: /подтвердить и продолжить/i }));

    await waitFor(() => {
      expect(recorded).toEqual(["PERSONAL_DATA", "PUBLIC_OFFER_PRO"]);
    });
    expect(await screen.findByText(/обязательные соглашения/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /пользовательское соглашение/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /обработку персональных данных/i })).toBeNull();
    expect(screen.queryByRole("checkbox", { name: /публичную оферту/i })).toBeNull();
    clearPreAuthConsentSnapshot("company");
  });

  it("opens session retry (not consent checkboxes) when consent POST fails with 5xx", async () => {
    savePreAuthConsentSnapshot("agent", QA_PRE_AUTH_CONSENTS.requirements, createPreAuthAttemptId());
    let sessionActive = false;
    vi.mocked(fetchAuthMeSafe).mockImplementation(async () =>
      sessionActive
        ? { ok: true, data: { user: { id: "reg-user-5xx", role: "PRO" } } }
        : { ok: false, kind: "unauthorized" },
    );
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        sessionActive = true;
        return { ok: true };
      }
      if (path === "/api/account/consent") {
        throw new RemcardApiError(503, "upstream", { error: "UPSTREAM" });
      }
      return { ok: true };
    });
    vi.mocked(fetchReadinessSafe).mockResolvedValue({ ok: true, data: registrationPending });

    const ui = userEvent.setup();
    render(
      <CookieConsentProvider>
        <AuthFlow
          returnTo="/join?phase=finish&role=agent"
          checkSessionOnMount={false}
          registrationAgentJoin
          registrationJoinKind="agent"
          registrationMessengerGateReady
        />
      </CookieConsentProvider>,
    );

    await ui.click(await screen.findByRole("button", { name: /продолжить с max/i }));
    await ui.type(screen.getByPlaceholderText("000000"), "222222");
    await ui.click(screen.getByRole("button", { name: /подтвердить и продолжить/i }));

    expect(await screen.findByText(/попробуйте снова|не удалось/i)).toBeInTheDocument();
    expect(screen.queryByText(/обязательные соглашения/i)).toBeNull();
    clearPreAuthConsentSnapshot("agent");
  });

  it("opens session retry when readiness refresh fails after successful consent POST", async () => {
    savePreAuthConsentSnapshot("company", QA_PRE_AUTH_CONSENTS.requirements, createPreAuthAttemptId());
    let sessionActive = false;
    let readinessCalls = 0;
    vi.mocked(fetchAuthMeSafe).mockImplementation(async () =>
      sessionActive
        ? { ok: true, data: { user: { id: "reg-user-readiness", role: "PRO" } } }
        : { ok: false, kind: "unauthorized" },
    );
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        sessionActive = true;
        return { ok: true };
      }
      if (path === "/api/account/consent") {
        return { ok: true };
      }
      return { ok: true };
    });
    vi.mocked(fetchReadinessSafe).mockImplementation(async () => {
      readinessCalls += 1;
      if (readinessCalls === 1) {
        return { ok: true, data: registrationPending };
      }
      return { ok: false, kind: "network" };
    });

    const ui = userEvent.setup();
    render(
      <CookieConsentProvider>
        <AuthFlow
          returnTo="/join?phase=finish&role=company"
          checkSessionOnMount={false}
          registrationAgentJoin
          registrationJoinKind="company"
          registrationMessengerGateReady
        />
      </CookieConsentProvider>,
    );

    await ui.click(await screen.findByRole("button", { name: /продолжить с telegram/i }));
    await ui.type(screen.getByPlaceholderText("000000"), "333333");
    await ui.click(screen.getByRole("button", { name: /подтвердить и продолжить/i }));

    expect(await screen.findByText(/проверьте соединение/i)).toBeInTheDocument();
    expect(screen.queryByText(/обязательные соглашения/i)).toBeNull();
    clearPreAuthConsentSnapshot("company");
  });

  it("surfaces 409 mismatch from consent API without redirect", async () => {
    savePreAuthConsentSnapshot("store", QA_PRE_AUTH_CONSENTS.requirements, createPreAuthAttemptId());
    let sessionActive = false;
    vi.mocked(fetchAuthMeSafe).mockImplementation(async () =>
      sessionActive
        ? { ok: true, data: { user: { id: "reg-user-3", role: "PRO" } } }
        : { ok: false, kind: "unauthorized" },
    );
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (path === "/api/auth/verify-code") {
        sessionActive = true;
        return { ok: true };
      }
      if (path === "/api/account/consent") {
        throw new RemcardApiError(409, "Документ обновился", { error: "DOCUMENT_VERSION_MISMATCH" });
      }
      return { ok: true };
    });
    vi.mocked(fetchReadinessSafe).mockResolvedValue({ ok: true, data: registrationPending });

    const ui = userEvent.setup();
    render(
      <CookieConsentProvider>
        <AuthFlow
          returnTo="/join?phase=finish&role=store"
          checkSessionOnMount={false}
          registrationAgentJoin
          registrationJoinKind="store"
          registrationMessengerGateReady
        />
      </CookieConsentProvider>,
    );

    await ui.click(await screen.findByRole("button", { name: /продолжить с telegram/i }));
    await ui.type(screen.getByPlaceholderText("000000"), "111111");
    await ui.click(screen.getByRole("button", { name: /подтвердить и продолжить/i }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    clearPreAuthConsentSnapshot("store");
  });
});
