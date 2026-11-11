import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { LoginExperience, resolveRegistrationJoinKindAfterHydration } from "./LoginExperience";
import { saveRegistrationWizardState } from "@/lib/registration/draft";
import { savePreAuthConsentAck } from "@/lib/registration/pre-auth-consent";

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

function renderRegistrationLogin(returnTo: string) {
  return render(
    <CookieConsentProvider>
      <LoginExperience registrationAgentJoin returnTo={returnTo} />
    </CookieConsentProvider>,
  );
}

describe("LoginExperience registration pre-auth", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("shows local consent before AuthFlow for join finish returnTo", async () => {
    const user = userEvent.setup();
    renderRegistrationLogin("/join?phase=finish&role=agent");
    expect(await screen.findByTestId("registration-pre-auth-consent")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-flow")).toBeNull();
    for (const label of [/персональных данных/i, /пользовательское/i, /публичную оферту/i]) {
      await user.click(screen.getByRole("checkbox", { name: label }));
    }
    await user.click(screen.getByRole("button", { name: /продолжить к max/i }));
    const flow = await screen.findByTestId("auth-flow");
    expect(flow).toHaveAttribute("data-messenger-ready", "true");
  });

  it("restores wizard kind only after hydration helper runs (not from URL-only parse)", () => {
    saveRegistrationWizardState({ step: "auth", kind: "specialist", updatedAt: Date.now() });
    expect(resolveRegistrationJoinKindAfterHydration("/join?phase=finish")).toBe("specialist");
    expect(resolveRegistrationJoinKindAfterHydration("/join?phase=finish&role=agent")).toBe("agent");
  });

  it("opens AuthFlow after hydration when pre-auth ack is already stored", async () => {
    savePreAuthConsentAck("agent");
    renderRegistrationLogin("/join?phase=finish&role=agent");
    expect(await screen.findByTestId("auth-flow")).toBeInTheDocument();
    expect(screen.queryByTestId("registration-pre-auth-consent")).toBeNull();
  });

  it("blocks AuthFlow when join kind missing from returnTo and wizard", async () => {
    renderRegistrationLogin("/join?phase=finish");
    expect(await screen.findByTestId("login-registration-missing-kind")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-flow")).toBeNull();
  });

  it("leaves ordinary login without pre-auth gate or hydration shell", () => {
    render(
      <CookieConsentProvider>
        <LoginExperience returnTo="/scanner" />
      </CookieConsentProvider>,
    );
    expect(screen.getByTestId("auth-flow")).toHaveAttribute("data-messenger-ready", "true");
    expect(screen.queryByTestId("registration-pre-auth-consent")).toBeNull();
    expect(screen.queryByTestId("login-registration-hydrating")).toBeNull();
  });

  it("resolves join kind from wizard when returnTo has phase only", async () => {
    saveRegistrationWizardState({ step: "auth", kind: "specialist", updatedAt: Date.now() });
    renderRegistrationLogin("/join?phase=finish");
    await waitFor(() => {
      expect(screen.queryByTestId("login-registration-hydrating")).toBeNull();
    });
    expect(await screen.findByTestId("registration-pre-auth-consent")).toBeInTheDocument();
    expect(screen.queryByTestId("login-registration-missing-kind")).toBeNull();
  });
});
