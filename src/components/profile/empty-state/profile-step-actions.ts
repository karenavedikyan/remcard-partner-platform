import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import { onboardingStepAccessibleName } from "@/lib/onboarding-step/read-only-history";
import type { ProfileEmptyRole, ProfileEmptyStep } from "./profile-empty-copy";

const REQUISITES_WALLET_HINT = "Вкладка «Реквизиты» в кошельке";

export function profileEmptyStepAction(
  step: ProfileEmptyStep,
  role: ProfileEmptyRole,
): OnboardingStepAction {
  if (step.icon === "card") {
    if (role === "specialist" || role === "store" || role === "company") {
      return {
        kind: "link",
        href: "/settlements",
        noteHint: REQUISITES_WALLET_HINT,
        accessibleName: onboardingStepAccessibleName(
          step.title,
          `${step.note}. ${REQUISITES_WALLET_HINT}`,
        ),
      };
    }
    return {
      kind: "none",
      noteOverride:
        "Реквизиты заполняются в профиле после основных данных — отдельного шага нет",
    };
  }
  return { kind: "button", handler: "onStartFill" };
}
