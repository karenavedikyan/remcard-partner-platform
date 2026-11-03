"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ProfileSectionEmptyState } from "./ProfileSectionEmptyState";
import type { ProfileEmptyRole } from "./profile-empty-copy";

type Props = {
  /** Show onboarding when profile is genuinely empty (successful API, no draft). */
  showEmptyIntro: boolean;
  role: ProfileEmptyRole;
  onRevealWizard?: () => void;
  children: ReactNode;
};

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
