import { fireEvent, screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/** Clicks through profile empty intro when present (incomplete working profile). */
export async function revealProfileWizardFromEmpty(user?: UserEvent) {
  const start = screen.queryByTestId("profile-empty-start");
  if (!start) return;
  if (user) {
    await user.click(start);
  } else {
    fireEvent.click(start);
  }
}
