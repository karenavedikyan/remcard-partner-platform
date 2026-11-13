import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrationJoinFlow } from "./RegistrationJoinFlow";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  joinSearchParams: new URLSearchParams(""),
  onJoinNavigate: null as (() => void) | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace, push: navigation.push, refresh: vi.fn() }),
  useSearchParams: () => navigation.joinSearchParams,
}));

const { qaPreAuthConsents } = vi.hoisted(() => ({
  qaPreAuthConsents: {
    contractVersion: "2026-11-13.pre-auth-consent.v1",
    available: true,
    requirements: [
      {
        kind: "PERSONAL_DATA",
        legalDocumentId: "qa-privacy",
        version: "2026-11-01",
        documentUrl: "/privacy",
      },
      {
        kind: "TERMS",
        legalDocumentId: "qa-terms",
        version: "2026-11-01",
        documentUrl: "/terms",
      },
      {
        kind: "PUBLIC_OFFER_PRO",
        legalDocumentId: "qa-offer",
        version: "2026-11-01",
        documentUrl: "/legal/public-offer-pro",
      },
    ],
  },
}));

vi.mock("@/lib/registration/capabilities", () => ({
  fetchRegistrationCapabilitiesClient: vi.fn().mockResolvedValue({
    contractVersion: "test",
    welcomeEnabled: true,
    agentRegistrationPathEnabled: true,
    joinRegistrationPathEnabled: true,
    legacyLoginPathEnabled: true,
    preAuthConsents: qaPreAuthConsents,
  }),
}));

vi.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => null,
}));

const { fetchAuthMeSafeMock, postFinishMock } = vi.hoisted(() => ({
  fetchAuthMeSafeMock: vi.fn(),
  postFinishMock: vi.fn(),
}));

vi.mock("@/lib/auth-session", () => ({
  fetchAuthMeSafe: fetchAuthMeSafeMock,
}));

vi.mock("@/lib/registration/join-finish", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/registration/join-finish")>();
  return {
    ...actual,
    postRegistrationJoinFinish: postFinishMock,
    waitForRegistrationReady: vi.fn().mockResolvedValue({
      canAccessCabinet: true,
      needsProfileOnboarding: false,
    }),
  };
});

vi.mock("@/components/auth/AuthFlow", () => ({
  AuthFlow: (props: {
    returnTo?: string;
    onAuthenticated?: (userId: string) => void;
    registrationMessengerGateReady?: boolean;
  }) => (
    <div data-testid="auth-flow" data-messenger-ready={String(props.registrationMessengerGateReady)}>
      <button
        type="button"
        data-testid="auth-flow-simulate-complete"
        onClick={() => {
          props.onAuthenticated?.("qa-new-owner");
          if (props.returnTo) {
            navigation.replace(props.returnTo);
          }
        }}
      >
        Завершить вход
      </button>
    </div>
  ),
}));

import {
  bindRegistrationDraftOwner,
  mergeRegistrationDraftFields,
  saveRegistrationWizardState,
} from "@/lib/registration/draft";
import {
  clearPreAuthConsentSnapshot,
  createPreAuthAttemptId,
  savePreAuthConsentSnapshot,
} from "@/lib/registration/pre-auth-consent";

function seedPreAuthAck(kind: "agent" | "specialist" | "store" | "company") {
  savePreAuthConsentSnapshot(kind, qaPreAuthConsents.requirements, createPreAuthAttemptId());
}

function JoinNavHarness() {
  const [searchEpoch, setSearchEpoch] = useState(0);
  useEffect(() => {
    navigation.onJoinNavigate = () => setSearchEpoch((value) => value + 1);
    return () => {
      navigation.onJoinNavigate = null;
    };
  }, []);
  return (
    <>
      <span data-nav-epoch={searchEpoch} hidden />
      <RegistrationJoinFlow />
    </>
  );
}

function renderJoin() {
  return render(
    <CookieConsentProvider>
      <JoinNavHarness />
    </CookieConsentProvider>,
  );
}

describe("RegistrationJoinFlow", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    sessionStorage.clear();
    navigation.joinSearchParams = new URLSearchParams("");
    fetchAuthMeSafeMock.mockResolvedValue({ ok: false });
    postFinishMock.mockReset();
    const { fetchRegistrationCapabilitiesClient } = await import("@/lib/registration/capabilities");
    vi.mocked(fetchRegistrationCapabilitiesClient).mockResolvedValue({
      contractVersion: "test",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      joinRegistrationPathEnabled: true,
      legacyLoginPathEnabled: true,
      preAuthConsents: qaPreAuthConsents,
    });
    navigation.replace.mockImplementation((href: string) => {
      const query = href.includes("?") ? href.split("?")[1] : "";
      navigation.joinSearchParams = new URLSearchParams(query);
      navigation.onJoinNavigate?.();
    });
  });

  it("shows pre-auth consent before AuthFlow on auth step", async () => {
    saveRegistrationWizardState({ step: "auth", kind: "agent", updatedAt: Date.now() });
    renderJoin();
    await waitFor(() =>
      expect(screen.getByTestId("registration-pre-auth-consent")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("auth-flow")).toBeNull();
  });

  it("blocks agent registration when capability is off without legacy onboarding redirect", async () => {
    const { fetchRegistrationCapabilitiesClient } = await import("@/lib/registration/capabilities");
    vi.mocked(fetchRegistrationCapabilitiesClient).mockResolvedValueOnce({
      contractVersion: "test",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: false,
      joinRegistrationPathEnabled: true,
      legacyLoginPathEnabled: true,
      preAuthConsents: qaPreAuthConsents,
    });
    const user = userEvent.setup();
    renderJoin();
    await waitFor(() => expect(screen.getByTestId("registration-types-grid")).toBeInTheDocument());
    await user.click(screen.getByRole("radio", { name: /агент/i }));
    await user.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(await screen.findByText(/регистрация агента временно недоступна/i)).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("does not send agent to legacy onboarding when joinRegistrationPathEnabled is false", async () => {
    const { fetchRegistrationCapabilitiesClient } = await import("@/lib/registration/capabilities");
    vi.mocked(fetchRegistrationCapabilitiesClient).mockResolvedValueOnce({
      contractVersion: "test",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      joinRegistrationPathEnabled: false,
      legacyLoginPathEnabled: true,
      preAuthConsents: qaPreAuthConsents,
    });
    const user = userEvent.setup();
    renderJoin();
    await waitFor(() => expect(screen.getByTestId("registration-types-grid")).toBeInTheDocument());
    await user.click(screen.getByRole("radio", { name: /агент/i }));
    await user.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(await screen.findByText(/регистрация агента временно недоступна/i)).toBeInTheDocument();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it("shows recovery when finish role mismatches wizard draft", async () => {
    navigation.joinSearchParams = new URLSearchParams("phase=finish&role=company");
    saveRegistrationWizardState({ step: "auth", kind: "agent", updatedAt: Date.now() });
    renderJoin();
    expect(
      await screen.findByTestId("registration-finish-recovery"),
    ).toBeInTheDocument();
    expect(screen.getByText(/не совпадает/i)).toBeInTheDocument();
  });

  it("shows recovery when finish has no resolvable kind", async () => {
    navigation.joinSearchParams = new URLSearchParams("phase=finish");
    renderJoin();
    expect(
      await screen.findByTestId("registration-finish-recovery"),
    ).toBeInTheDocument();
  });

  it("does not call join finish when authenticated but finish context mismatches", async () => {
    const { fetchRegistrationCapabilitiesClient } = await import("@/lib/registration/capabilities");
    vi.mocked(fetchRegistrationCapabilitiesClient).mockResolvedValue({
      contractVersion: "test",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      joinRegistrationPathEnabled: true,
      legacyLoginPathEnabled: true,
      preAuthConsents: qaPreAuthConsents,
    });
    fetchAuthMeSafeMock.mockResolvedValue({
      ok: true,
      data: { user: { id: "user-finish-mismatch" } },
    });
    navigation.joinSearchParams = new URLSearchParams("phase=finish&role=company");
    saveRegistrationWizardState({ step: "finish", kind: "agent", updatedAt: Date.now() });
    mergeRegistrationDraftFields("agent", {
      displayName: "Test Agent",
      city: "Москва",
    });
    renderJoin();
    expect(
      await screen.findByTestId("registration-finish-recovery"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(postFinishMock).not.toHaveBeenCalled();
    });
    expect(fetchAuthMeSafeMock).not.toHaveBeenCalled();
  });

  it("clears stale profile and never posts finish after owner mismatch on finish", async () => {
    bindRegistrationDraftOwner("qa-old-owner");
    saveRegistrationWizardState({ step: "auth", kind: "agent", updatedAt: Date.now() });
    mergeRegistrationDraftFields("agent", {
      displayName: "QA чужой черновик",
      city: "QA чужой город",
    });
    seedPreAuthAck("agent");
    fetchAuthMeSafeMock.mockResolvedValue({
      ok: true,
      data: { user: { id: "qa-new-owner" } },
    });
    navigation.joinSearchParams = new URLSearchParams("phase=finish&role=agent");
    renderJoin();
    expect(
      await screen.findByText(/черновик принадлежал другому входу/i),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(navigation.joinSearchParams.get("phase")).toBeNull();
      expect(navigation.joinSearchParams.get("role")).toBe("agent");
    });
    const nameField = await screen.findByRole("textbox", { name: /имя/i });
    await waitFor(() => {
      expect(nameField).toHaveValue("");
      expect(postFinishMock).not.toHaveBeenCalled();
    });
    expect(screen.queryByText(/завершение регистрации/i)).not.toBeInTheDocument();
  });

  it("completes finish with new profile after owner mismatch recovery", async () => {
    const user = userEvent.setup();
    bindRegistrationDraftOwner("qa-old-owner");
    mergeRegistrationDraftFields("agent", {
      displayName: "QA чужой черновик",
      city: "QA чужой город",
    });
    saveRegistrationWizardState({ step: "auth", kind: "agent", updatedAt: Date.now() });
    seedPreAuthAck("agent");
    fetchAuthMeSafeMock.mockResolvedValue({
      ok: true,
      data: { user: { id: "qa-new-owner" } },
    });
    navigation.joinSearchParams = new URLSearchParams("phase=finish&role=agent");
    renderJoin();

    await screen.findByText(/черновик принадлежал другому входу/i);
    await waitFor(() => expect(navigation.joinSearchParams.get("phase")).toBeNull());

    const newName = "Новое имя QA";
    const newCity = "Новый город QA";
    await user.type(await screen.findByRole("textbox", { name: /имя/i }), newName);
    await user.click(screen.getByRole("button", { name: /^продолжить$/i }));
    await user.type(await screen.findByRole("textbox", { name: /город/i }), newCity);
    await user.click(screen.getByRole("button", { name: /^продолжить$/i }));

    await waitFor(() =>
      expect(screen.getByTestId("registration-pre-auth-consent")).toBeInTheDocument(),
    );
    await waitFor(() => {
      const personal = screen.getByRole("checkbox", { name: /обработку персональных данных/i });
      expect(personal).toBeEnabled();
    });
    for (const label of [
      /обработку персональных данных/i,
      /пользовательское соглашение/i,
      /публичную оферту/i,
    ]) {
      await user.click(screen.getByRole("checkbox", { name: label }));
    }
    await user.click(screen.getByRole("button", { name: /продолжить к max/i }));
    await user.click(await screen.findByTestId("auth-flow-simulate-complete"));

    await waitFor(() => {
      expect(postFinishMock).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: "agent",
          displayName: newName,
          city: newCity,
        }),
      );
    });
    expect(postFinishMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ displayName: "QA чужой черновик" }),
    );
  });

  it("stays on empty name step when finish has no profile fields for current owner", async () => {
    bindRegistrationDraftOwner("qa-new-owner");
    saveRegistrationWizardState({ step: "auth", kind: "agent", updatedAt: Date.now() });
    fetchAuthMeSafeMock.mockResolvedValue({
      ok: true,
      data: { user: { id: "qa-new-owner" } },
    });
    navigation.joinSearchParams = new URLSearchParams("phase=finish&role=agent");
    renderJoin();
    const nameField = await screen.findByRole("textbox", { name: /имя/i });
    await waitFor(() => {
      expect(nameField).toHaveValue("");
      expect(postFinishMock).not.toHaveBeenCalled();
    });
    expect(screen.queryByText(/завершение регистрации/i)).not.toBeInTheDocument();
  });

  it("shows unavailable UI for restored auth step when join path is disabled", async () => {
    const { fetchRegistrationCapabilitiesClient } = await import("@/lib/registration/capabilities");
    vi.mocked(fetchRegistrationCapabilitiesClient).mockResolvedValueOnce({
      contractVersion: "test",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      joinRegistrationPathEnabled: false,
      legacyLoginPathEnabled: true,
      preAuthConsents: qaPreAuthConsents,
    });
    saveRegistrationWizardState({ step: "auth", kind: "agent", updatedAt: Date.now() });
    renderJoin();
    expect(
      await screen.findByTestId("registration-auth-unavailable"),
    ).toBeInTheDocument();
    expect(screen.getByText(/регистрация агента временно недоступна/i)).toBeInTheDocument();
    expect(screen.queryByTestId("auth-flow")).toBeNull();
    expect(screen.queryByTestId("registration-pre-auth-consent")).toBeNull();
  });
});
