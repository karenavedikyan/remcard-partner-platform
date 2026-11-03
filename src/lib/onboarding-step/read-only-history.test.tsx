import { describe, expect, it } from "vitest";
import {
  ONBOARDING_HISTORY_AFTER_FIRST_SALE_HINT,
  ONBOARDING_READ_ONLY_HISTORY_HREF,
  ONBOARDING_SETTLEMENTS_LEDGER_HINT,
  ONBOARDING_SETTLEMENTS_WALLET_HREF,
  onboardingHistoryLinkAction,
  onboardingHistoryStepAccessibleName,
  onboardingSettlementsWalletLinkAction,
  resolveOnboardingHistoryLinkAction,
} from "./read-only-history";

describe("read-only history onboarding destination", () => {
  it("points at HistoryHub route", () => {
    expect(ONBOARDING_READ_ONLY_HISTORY_HREF).toBe("/history");
  });

  it("names history in accessible label", () => {
    expect(onboardingHistoryStepAccessibleName("Следите за покупками", "Сумма и статус — в карточке")).toContain(
      "Открыть историю",
    );
  });

  it("adds empty-history hint to link actions", () => {
    const action = onboardingHistoryLinkAction("Следите за покупками", "Сумма и статус — в карточке");
    expect(action.noteHint).toBe(ONBOARDING_HISTORY_AFTER_FIRST_SALE_HINT);
    expect(action.accessibleName).toContain(ONBOARDING_HISTORY_AFTER_FIRST_SALE_HINT);
  });

  it("resolveOnboardingHistoryLinkAction defaults to static without capability", () => {
    const action = resolveOnboardingHistoryLinkAction("Следите за покупками", "Сумма и статус — в карточке");
    expect(action.kind).toBe("none");
    if (action.kind === "none") {
      expect(action.noteOverride).toContain("недоступен");
    }
  });
});

describe("settlements wallet onboarding destination (specialist)", () => {
  it("points at master-wallet route", () => {
    expect(ONBOARDING_SETTLEMENTS_WALLET_HREF).toBe("/settlements");
  });

  it("adds ledger hint and wallet accessible label", () => {
    const action = onboardingSettlementsWalletLinkAction(
      "Следите за покупками",
      "Статусы и начисления — в карточке",
    );
    expect(action.noteHint).toBe(ONBOARDING_SETTLEMENTS_LEDGER_HINT);
    expect(action.accessibleName).toContain("Открыть кошелёк");
    expect(action.accessibleName).toContain(ONBOARDING_SETTLEMENTS_LEDGER_HINT);
  });
});
