import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrationJoinFlow } from "./RegistrationJoinFlow";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
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

import { saveRegistrationWizardState } from "@/lib/registration/draft";

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
});
