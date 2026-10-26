"use client";

import { SpecialistWorkingProfileWizard } from "./SpecialistWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";

type Props = {
  onWorkingProfileSaved?: (next: ProProfileResponse) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

export function SpecialistProfileSection({ onWorkingProfileSaved, onDirtyChange }: Props) {
  return (
    <SpecialistWorkingProfileWizard
      onWorkingProfileSaved={onWorkingProfileSaved}
      onDirtyChange={onDirtyChange}
    />
  );
}
