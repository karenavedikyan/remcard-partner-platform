import type { OnboardingStepAction, OnboardingStepLinkAction } from "./types";
import { onboardingStepAccessibleName } from "./types";

export { onboardingStepAccessibleName };

/** Read-only HistoryHub (`/history`) — purchases and accruals, no sale/confirm actions on the hub. */
export const ONBOARDING_READ_ONLY_HISTORY_HREF = "/history";

export const ONBOARDING_HISTORY_AFTER_FIRST_SALE_HINT =
  "История появится после первой продажи";

export const ONBOARDING_PARTNER_FIRST_HINT = "Сначала выберите партнёра";

/** Shown when onboarding must not link to `/history` (staff / unknown capability). */
export const ONBOARDING_HISTORY_UNAVAILABLE_HINT =
  "Раздел «История» недоступен для вашей роли";

export function onboardingHistoryStepAccessibleName(title: string, note: string): string {
  return `${title}. ${note}. Открыть историю`;
}

export function onboardingHistoryLinkAction(
  title: string,
  baseNote: string,
): OnboardingStepLinkAction {
  const noteHint = ONBOARDING_HISTORY_AFTER_FIRST_SALE_HINT;
  return {
    kind: "link",
    href: ONBOARDING_READ_ONLY_HISTORY_HREF,
    noteHint,
    accessibleName: onboardingHistoryStepAccessibleName(
      title,
      `${baseNote}. ${noteHint}`,
    ),
  };
}

/**
 * `canLinkReadOnlyHistory === true` → link to `/history`.
 * Absent or false → STATIC with honest unavailable hint (safe default).
 */
export function resolveOnboardingHistoryLinkAction(
  title: string,
  baseNote: string,
  canLinkReadOnlyHistory?: boolean,
): OnboardingStepAction {
  if (canLinkReadOnlyHistory !== true) {
    return {
      kind: "none",
      noteOverride: `${baseNote}. ${ONBOARDING_HISTORY_UNAVAILABLE_HINT}`,
    };
  }
  return onboardingHistoryLinkAction(title, baseNote);
}

/** Specialist ledger lives on `/settlements` (master-wallet), not HistoryHub store purchases. */
export const ONBOARDING_SETTLEMENTS_WALLET_HREF = "/settlements";

export const ONBOARDING_SETTLEMENTS_LEDGER_HINT = "Начисления и выплаты — в кошельке";

export function onboardingSettlementsWalletStepAccessibleName(
  title: string,
  note: string,
): string {
  return `${title}. ${note}. Открыть кошелёк`;
}

export function onboardingSettlementsWalletLinkAction(
  title: string,
  baseNote: string,
): OnboardingStepLinkAction {
  const noteHint = ONBOARDING_SETTLEMENTS_LEDGER_HINT;
  const noteWithHint = `${baseNote}. ${noteHint}`;
  return {
    kind: "link",
    href: ONBOARDING_SETTLEMENTS_WALLET_HREF,
    noteHint,
    accessibleName: onboardingSettlementsWalletStepAccessibleName(title, noteWithHint),
  };
}

export function resolveOnboardingStepDisplayNote(
  action: OnboardingStepAction,
  baseNote: string,
): string {
  if (action.kind === "none") {
    return action.noteOverride ?? baseNote;
  }
  if (action.noteHint) {
    return `${baseNote}. ${action.noteHint}`;
  }
  return baseNote;
}

export function resolveOnboardingStepAccessibleName(
  title: string,
  action: OnboardingStepAction,
  baseNote: string,
): string {
  const displayNote = resolveOnboardingStepDisplayNote(action, baseNote);
  if (action.kind === "link" && action.accessibleName) {
    return action.accessibleName;
  }
  if (action.kind === "button" && action.accessibleName) {
    return action.accessibleName;
  }
  return onboardingStepAccessibleName(title, displayNote);
}
