import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/** Opens purchase review and confirms (no extra preview POST). */
export async function confirmScannerPurchaseThroughReview(
  user: UserEvent,
  amount = "1000",
  categoryIndex = 0,
) {
  await screen.findByText(/введите суммы покупки/i);
  const amountInputs = screen.getAllByLabelText(/сумма покупки до скидки/i);
  const amountInput = amountInputs[categoryIndex];
  if (!amountInput) {
    throw new Error(`No amount input at index ${categoryIndex}`);
  }
  await user.clear(amountInput);
  await user.type(amountInput, amount);

  const openButtons = screen.getAllByRole("button", { name: /^подтвердить покупку$/i });
  await user.click(openButtons[0]!);
  await screen.findByTestId("purchase-review-dialog");
  await user.click(screen.getByTestId("purchase-review-confirm"));
}
