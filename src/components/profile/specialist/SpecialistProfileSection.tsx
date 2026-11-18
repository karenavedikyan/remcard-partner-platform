"use client";

import {
  SpecialistWorkingProfileWizard,
  type SpecialistOverviewCardProps,
} from "./SpecialistWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";

type Props = {
  onWorkingProfileSaved?: (next: ProProfileResponse) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Overview CTA already showed empty intro — open wizard directly on basics. */
  initialWizardRevealed?: boolean;
  overviewCard?: SpecialistOverviewCardProps;
};

export function SpecialistProfileSection({
  onWorkingProfileSaved,
  onDirtyChange,
  initialWizardRevealed = false,
  overviewCard,
}: Props) {
  return (
    <SpecialistWorkingProfileWizard
      onWorkingProfileSaved={onWorkingProfileSaved}
      onDirtyChange={onDirtyChange}
      initialWizardRevealed={initialWizardRevealed}
      overviewCard={overviewCard}
    />
  );
}
