"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { OnboardingStepAction } from "@/lib/onboarding-step/types";
import {
  resolveOnboardingStepAccessibleName,
  resolveOnboardingStepDisplayNote,
} from "@/lib/onboarding-step/read-only-history";
import { OnboardingStepChevron } from "./OnboardingStepChevron";
import shared from "./onboarding-step-item.module.css";

export type OnboardingStepHandlers = {
  openFind?: () => void;
  openLink?: () => void;
  openScanner?: () => void;
  onAddClient?: () => void;
  onCreateCertificate?: () => void;
  onInvite?: () => void;
  onStartFill?: () => void;
};

type Props = {
  index: number;
  title: string;
  note: string;
  action: OnboardingStepAction;
  handlers?: OnboardingStepHandlers;
  createHref?: string;
  /** Prefix for profile wizard steps, e.g. "Начать заполнение: " */
  startFillLabelPrefix?: string;
  stepNumClassName?: string;
  iconSlot: ReactNode;
  iconWrapClassName?: string;
  /** Extra class on actionable control (e.g. local grid tweaks). */
  actionClassName?: string;
  staticClassName?: string;
  titleClassName?: string;
  noteClassName?: string;
  /** data-testid for step control (optional). */
  testId?: string;
  /** When true, `onCreateCertificate` steps without a handler become a Link via `createHref`. */
  allowCreateHrefFallback?: boolean;
};

function resolveButtonClick(
  handler: OnboardingStepAction & { kind: "button" },
  handlers: OnboardingStepHandlers | undefined,
): (() => void) | undefined {
  switch (handler.handler) {
    case "openFind":
      return handlers?.openFind;
    case "openLink":
      return handlers?.openLink;
    case "openScanner":
      return handlers?.openScanner;
    case "onAddClient":
      return handlers?.onAddClient;
    case "onCreateCertificate":
      return handlers?.onCreateCertificate;
    case "onInvite":
      return handlers?.onInvite;
    case "onStartFill":
      return handlers?.onStartFill;
    default:
      return undefined;
  }
}

function resolveCreateHref(createHref?: string): string {
  return createHref ?? "/certificates/new";
}

export function OnboardingStepItem({
  index,
  title,
  note,
  action,
  handlers,
  createHref,
  startFillLabelPrefix = "Начать заполнение: ",
  stepNumClassName,
  iconSlot,
  iconWrapClassName,
  actionClassName,
  staticClassName,
  titleClassName,
  noteClassName,
  testId,
  allowCreateHrefFallback = false,
}: Props) {
  const displayNote = resolveOnboardingStepDisplayNote(action, note);
  const controlAccessibleName = resolveOnboardingStepAccessibleName(title, action, note);

  const meta = (
    <>
      <span className={stepNumClassName}>{index + 1}</span>
      <span className={iconWrapClassName}>{iconSlot}</span>
      <div className={shared.stepBody}>
        <strong className={titleClassName ?? shared.stepTitle}>{title}</strong>
        <small className={noteClassName ?? shared.stepNote}>{displayNote}</small>
      </div>
    </>
  );

  if (action.kind === "none") {
    return (
      <div
        className={`${shared.stepStatic} ${staticClassName ?? ""}`.trim()}
        data-onboarding-step="static"
      >
        {meta}
      </div>
    );
  }

  if (action.kind === "link") {
    return (
      <Link
        href={action.href}
        className={`${shared.stepAction} ${actionClassName ?? ""}`.trim()}
        aria-label={controlAccessibleName}
        data-testid={testId}
        data-onboarding-step="link"
      >
        {meta}
        <OnboardingStepChevron className={shared.chevron} />
      </Link>
    );
  }

  const onClick = resolveButtonClick(action, handlers);

  if (
    action.kind === "button" &&
    action.handler === "onCreateCertificate" &&
    !onClick &&
    allowCreateHrefFallback
  ) {
    const href = resolveCreateHref(createHref);
    return (
      <Link
        href={href}
        className={`${shared.stepAction} ${actionClassName ?? ""}`.trim()}
        aria-label={controlAccessibleName}
        data-testid={testId}
        data-onboarding-step="link"
      >
        {meta}
        <OnboardingStepChevron className={shared.chevron} />
      </Link>
    );
  }

  if (!onClick) {
    return (
      <div
        className={`${shared.stepStatic} ${staticClassName ?? ""}`.trim()}
        data-onboarding-step="static"
      >
        {meta}
      </div>
    );
  }

  const buttonLabel =
    action.handler === "onStartFill"
      ? `${startFillLabelPrefix}${title}`
      : controlAccessibleName;

  return (
    <button
      type="button"
      className={`${shared.stepAction} ${actionClassName ?? ""}`.trim()}
      aria-label={buttonLabel}
      data-testid={testId}
      data-onboarding-step="button"
      onClick={onClick}
    >
      {meta}
      <OnboardingStepChevron className={shared.chevron} />
    </button>
  );
}
