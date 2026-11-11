import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CookieConsentProvider } from "@/contexts/CookieConsentContext";
import { RegistrationPreAuthConsent } from "./RegistrationPreAuthConsent";

describe("RegistrationPreAuthConsent", () => {
  it("keeps continue disabled until all required boxes are checked", async () => {
    const user = userEvent.setup();
  const onContinue = vi.fn();
    render(
      <CookieConsentProvider>
        <RegistrationPreAuthConsent kind="agent" onContinue={onContinue} onBack={() => undefined} />
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
  });
});
