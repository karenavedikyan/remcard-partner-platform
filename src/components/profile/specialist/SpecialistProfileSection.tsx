"use client";

import { SpecialistWorkingProfileWizard } from "./SpecialistWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";

type Props = {
  onWorkingProfileSaved?: (next: ProProfileResponse) => void;
  onDirtyChange?: (dirty: boolean) => void;
  /** Overview CTA already showed empty intro — open wizard directly on basics. */
  initialWizardRevealed?: boolean;
};

export function SpecialistProfileSection({
  onWorkingProfileSaved,
  onDirtyChange,
  initialWizardRevealed = false,
}: Props) {
  return (
    <SpecialistWorkingProfileWizard
      onWorkingProfileSaved={onWorkingProfileSaved}
      onDirtyChange={onDirtyChange}
      initialWizardRevealed={initialWizardRevealed}
    />
  );
}
