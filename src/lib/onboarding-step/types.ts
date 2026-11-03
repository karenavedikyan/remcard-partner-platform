/** Step interaction wired in empty-state onboarding lists (verified destinations only). */

export type OnboardingStepLinkAction = {
  kind: "link";
  href: string;
  /** When set, used as the control accessible name instead of title + note. */
  accessibleName?: string;
  /** Shown after base note (visible hint). */
  noteHint?: string;
};

export type OnboardingStepButtonHandler =
  | "openFind"
  | "openLink"
  | "openScanner"
  | "onAddClient"
  | "onCreateCertificate"
  | "onInvite"
  | "onStartFill";

export type OnboardingStepButtonAction = {
  kind: "button";
  handler: OnboardingStepButtonHandler;
  accessibleName?: string;
  /** Shown after base note (visible hint). */
  noteHint?: string;
};

export type OnboardingStepNoneAction = {
  kind: "none";
  /** Replaces step note when the default copy would imply a click. */
  noteOverride?: string;
};

export type OnboardingStepAction =
  | OnboardingStepLinkAction
  | OnboardingStepButtonAction
  | OnboardingStepNoneAction;

export function onboardingStepAccessibleName(title: string, note: string): string {
  return `${title}. ${note}`;
}
