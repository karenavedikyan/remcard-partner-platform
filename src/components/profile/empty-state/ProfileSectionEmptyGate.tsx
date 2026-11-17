"use client";

import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { PROFILE_FILL_PARAM } from "@/lib/profile-sections";
import { ProfileSectionEmptyState } from "./ProfileSectionEmptyState";
import type { ProfileEmptyRole } from "./profile-empty-copy";

type Props = {
  /** Show onboarding when profile is genuinely empty (successful API, no draft). */
  showEmptyIntro: boolean;
  role: ProfileEmptyRole;
  onRevealWizard?: () => void;
  children: ReactNode;
};

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ProfileSectionEmptyGate({
  showEmptyIntro,
  role,
  onRevealWizard,
  children,
}: Props) {
  const [wizardRevealed, setWizardRevealed] = useState(false);

  useEffect(() => {
    if (!showEmptyIntro) {
      setWizardRevealed(false);
    }
  }, [showEmptyIntro]);

  // `?fill=1` (home «Заполнить профиль») = the state after «Изменить» → «Перейти к заполнению».
  useIsomorphicLayoutEffect(() => {
    if (!showEmptyIntro || wizardRevealed) return;
    if (new URLSearchParams(window.location.search).get(PROFILE_FILL_PARAM) !== "1") return;
    setWizardRevealed(true);
    onRevealWizard?.();
  }, [showEmptyIntro, wizardRevealed, onRevealWizard]);

  if (showEmptyIntro && !wizardRevealed) {
    return (
      <ProfileSectionEmptyState
        role={role}
        onStartFill={() => {
          setWizardRevealed(true);
          onRevealWizard?.();
        }}
      />
    );
  }

  return children;
}
