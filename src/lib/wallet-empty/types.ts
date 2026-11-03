import type { OnboardingStepAction } from "@/lib/onboarding-step/types";

export type WalletEmptyAudienceRole = "agent" | "specialist" | "store" | "company";

export type WalletEmptyStepCopy = {
  icon: WalletEmptyIconName;
  title: string;
  note: string;
  action: OnboardingStepAction;
};

export type WalletEmptyCopy = {
  kicker: string;
  title: string;
  lead: string;
  steps: WalletEmptyStepCopy[];
  primaryCta: string;
  cardFootLabel: string;
};

export type WalletEmptyIconName =
  | "wallet"
  | "bag"
  | "clock"
  | "check"
  | "scan"
  | "ticket"
  | "user"
  | "handshake"
  | "share"
  | "sparkles";
