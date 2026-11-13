import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { QA_PRE_AUTH_CONSENTS } from "@/lib/registration/pre-auth-consent-fixtures";
import { RegistrationPreAuthConsent } from "./RegistrationPreAuthConsent";

describe("RegistrationPreAuthConsent", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("keeps continue disabled until all required boxes are checked", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <CookieConsentProvider>
        <RegistrationPreAuthConsent
          kind="agent"
          preAuthConsents={QA_PRE_AUTH_CONSENTS}
          onContinue={onContinue}
        />
      </CookieConsentProvider>,
    );

    const submit = screen.getByRole("button", { name: /продолжить к max/i });
    expect(submit).toBeDisabled();

    const legalBoxes = [
      screen.getByRole("checkbox", { name: /персональных данных/i }),
      screen.getByRole("checkbox", { name: /пользовательское соглашение/i }),
      screen.getByRole("checkbox", { name: /публичную оферту/i }),
    ];
    for (const box of legalBoxes) {
      expect(box).not.toBeChecked();
      await user.click(box);
    }
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onContinue).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: /персональных данных/i })).toHaveAttribute(
      "href",
      expect.stringContaining("/privacy"),
    );
    expect(sessionStorage.getItem("remcard.registration.preAuthConsent.snapshot.v2:agent")).toBeTruthy();
  });

  it("does not continue to messenger when session storage is unavailable", async () => {
    const onContinue = vi.fn();
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const user = userEvent.setup();
    render(
      <CookieConsentProvider>
        <RegistrationPreAuthConsent
          kind="store"
          preAuthConsents={QA_PRE_AUTH_CONSENTS}
          onContinue={onContinue}
        />
      </CookieConsentProvider>,
    );
  const legalBoxes = [
    screen.getByRole("checkbox", { name: /персональных данных/i }),
    screen.getByRole("checkbox", { name: /пользовательское соглашение/i }),
    screen.getByRole("checkbox", { name: /публичную оферту/i }),
  ];
    for (const box of legalBoxes) await user.click(box);
    await user.click(screen.getByRole("button", { name: /продолжить к max/i }));
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/сохранить подтверждение в браузере/i);
    Storage.prototype.setItem = original;
  });

  it("blocks submit when capabilities report unavailable documents", async () => {
    const onContinue = vi.fn();
    render(
      <CookieConsentProvider>
        <RegistrationPreAuthConsent
          kind="company"
          preAuthConsents={{
            contractVersion: QA_PRE_AUTH_CONSENTS.contractVersion,
            available: false,
            requirements: [],
            reason: "NO_ACTIVE_DOCUMENT",
          }}
          onContinue={onContinue}
        />
      </CookieConsentProvider>,
    );
    expect(screen.getByRole("button", { name: /продолжить к max/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/временно недоступны/i);
  });
});
