import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrationJoinFlow } from "./RegistrationJoinFlow";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";

const replace = vi.fn();
const push = vi.fn();
let joinSearchParams = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push, refresh: vi.fn() }),
  useSearchParams: () => joinSearchParams,
}));

vi.mock("@/lib/registration/capabilities", () => ({
  fetchRegistrationCapabilitiesClient: vi.fn().mockResolvedValue({
    contractVersion: "test",
    welcomeEnabled: true,
    agentRegistrationPathEnabled: true,
    joinRegistrationPathEnabled: true,
    legacyLoginPathEnabled: true,
  }),
}));

vi.mock("@/components/layout/ThemeToggle", () => ({
  ThemeToggle: () => null,
}));

vi.mock("@/components/auth/AuthFlow", () => ({
  AuthFlow: (props: { registrationMessengerGateReady?: boolean }) => (
    <div data-testid="auth-flow" data-messenger-ready={String(props.registrationMessengerGateReady)} />
  ),
}));

import {
  mergeRegistrationDraftFields,
  saveRegistrationWizardState,
} from "@/lib/registration/draft";

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

function renderJoin() {
  return render(
    <CookieConsentProvider>
      <RegistrationJoinFlow />
    </CookieConsentProvider>,
  );
}

describe("RegistrationJoinFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    joinSearchParams = new URLSearchParams("");
    fetchAuthMeSafeMock.mockResolvedValue({ ok: false });
    postFinishMock.mockReset();
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
    });
    const user = userEvent.setup();
    renderJoin();
    await waitFor(() => expect(screen.getByTestId("registration-types-grid")).toBeInTheDocument());
    await user.click(screen.getByRole("radio", { name: /агент/i }));
    await user.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(await screen.findByText(/регистрация агента временно недоступна/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("does not send agent to legacy onboarding when joinRegistrationPathEnabled is false", async () => {
    const { fetchRegistrationCapabilitiesClient } = await import("@/lib/registration/capabilities");
    vi.mocked(fetchRegistrationCapabilitiesClient).mockResolvedValueOnce({
      contractVersion: "test",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      joinRegistrationPathEnabled: false,
      legacyLoginPathEnabled: true,
    });
    const user = userEvent.setup();
    renderJoin();
    await waitFor(() => expect(screen.getByTestId("registration-types-grid")).toBeInTheDocument());
    await user.click(screen.getByRole("radio", { name: /агент/i }));
    await user.click(screen.getByRole("button", { name: /продолжить/i }));
    expect(await screen.findByText(/регистрация агента временно недоступна/i)).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("shows recovery when finish role mismatches wizard draft", async () => {
    joinSearchParams = new URLSearchParams("phase=finish&role=company");
    saveRegistrationWizardState({ step: "auth", kind: "agent", updatedAt: Date.now() });
    renderJoin();
    expect(
      await screen.findByTestId("registration-finish-recovery"),
    ).toBeInTheDocument();
    expect(screen.getByText(/не совпадает/i)).toBeInTheDocument();
  });

  it("shows recovery when finish has no resolvable kind", async () => {
    joinSearchParams = new URLSearchParams("phase=finish");
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
    });
    fetchAuthMeSafeMock.mockResolvedValue({
      ok: true,
      data: { user: { id: "user-finish-mismatch" } },
    });
    joinSearchParams = new URLSearchParams("phase=finish&role=company");
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

  it("shows unavailable UI for restored auth step when join path is disabled", async () => {
    const { fetchRegistrationCapabilitiesClient } = await import("@/lib/registration/capabilities");
    vi.mocked(fetchRegistrationCapabilitiesClient).mockResolvedValueOnce({
      contractVersion: "test",
      welcomeEnabled: true,
      agentRegistrationPathEnabled: true,
      joinRegistrationPathEnabled: false,
      legacyLoginPathEnabled: true,
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
