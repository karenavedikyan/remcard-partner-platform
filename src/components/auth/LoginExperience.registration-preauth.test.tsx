import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { LoginExperience } from "./LoginExperience";
import { saveRegistrationWizardState } from "@/lib/registration/draft";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("./AuthFlow", () => ({
  AuthFlow: (props: { registrationMessengerGateReady?: boolean }) => (
    <div
      data-testid="auth-flow"
      data-messenger-ready={String(props.registrationMessengerGateReady ?? true)}
    />
  ),
}));

vi.mock("@/lib/prof-admin-api", () => ({
  fetchProfAdminCapabilities: vi.fn().mockResolvedValue({
    adminPasswordLogin: false,
    adminTestUsers: false,
  }),
  adminPasswordLogin: vi.fn(),
}));

describe("LoginExperience registration pre-auth", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows local consent before AuthFlow for join finish returnTo", async () => {
    const user = userEvent.setup();
    render(
      <CookieConsentProvider>
        <LoginExperience
          registrationAgentJoin
          returnTo="/join?phase=finish&role=agent"
        />
      </CookieConsentProvider>,
    );
    expect(screen.getByTestId("registration-pre-auth-consent")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-flow")).toBeNull();
    for (const label of [/персональных данных/i, /пользовательское/i, /публичную оферту/i]) {
      await user.click(screen.getByRole("checkbox", { name: label }));
    }
    await user.click(screen.getByRole("button", { name: /продолжить к max/i }));
    const flow = await screen.findByTestId("auth-flow");
    expect(flow).toHaveAttribute("data-messenger-ready", "true");
  });

  it("blocks AuthFlow when join kind missing from returnTo and wizard", () => {
    render(
      <CookieConsentProvider>
        <LoginExperience registrationAgentJoin returnTo="/join?phase=finish" />
      </CookieConsentProvider>,
    );
    expect(screen.getByText(/не удалось определить тип регистрации/i)).toBeInTheDocument();
    expect(screen.queryByTestId("auth-flow")).toBeNull();
  });

  it("leaves ordinary login without pre-auth gate", () => {
    render(
      <CookieConsentProvider>
        <LoginExperience returnTo="/scanner" />
      </CookieConsentProvider>,
    );
    expect(screen.getByTestId("auth-flow")).toHaveAttribute("data-messenger-ready", "true");
    expect(screen.queryByTestId("registration-pre-auth-consent")).toBeNull();
  });

  it("resolves join kind from wizard when returnTo has phase only", async () => {
    saveRegistrationWizardState({ step: "auth", kind: "specialist", updatedAt: Date.now() });
    render(
      <CookieConsentProvider>
        <LoginExperience registrationAgentJoin returnTo="/join?phase=finish&role=specialist" />
      </CookieConsentProvider>,
    );
    expect(screen.getByTestId("registration-pre-auth-consent")).toBeInTheDocument();
  });
});
