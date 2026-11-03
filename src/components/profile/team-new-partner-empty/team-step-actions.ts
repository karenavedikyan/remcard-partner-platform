import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import type { TeamNewPartnerEmptyStep } from "@/lib/team-new-partner-empty-copy";

export function teamNewPartnerEmptyStepAction(
  step: TeamNewPartnerEmptyStep,
  options: { canInvite: boolean },
): OnboardingStepAction {
  if (step.icon === "mapPin") {
    return { kind: "link", href: "/profile?section=branches" };
  }
  if (!options.canInvite) {
    return { kind: "none", noteOverride: "Доступно владельцу с правом приглашать" };
  }
  if (step.icon === "send" || step.icon === "shield") {
    return { kind: "button", handler: "onInvite" };
  }
  return { kind: "none" };
}
