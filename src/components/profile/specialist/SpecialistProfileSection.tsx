"use client";

import { SpecialistWorkingProfileWizard } from "./SpecialistWorkingProfileWizard";
import type { ProProfileResponse } from "@/lib/types";

type Props = {
  onWorkingProfileSaved?: (next: ProProfileResponse) => void;
};

export function SpecialistProfileSection({ onWorkingProfileSaved }: Props) {
  return <SpecialistWorkingProfileWizard onWorkingProfileSaved={onWorkingProfileSaved} />;
}
