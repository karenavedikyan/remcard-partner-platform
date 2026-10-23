"use client";

import type { ProProfileResponse } from "@/lib/types";
import type { BusinessProfilePartnerType } from "@/lib/business-profile/eligibility";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";
import surfaceStyles from "./BusinessProfileSurface.module.css";

type Props = {
  profile: ProProfileResponse;
  partnerType: BusinessProfilePartnerType;
  basicsEditable: boolean;
  onWorkingProfileSaved?: (next: ProProfileResponse) => void;
  onBasicsDirtyChange?: (dirty: boolean) => void;
  forceEditing?: boolean;
  forceStep?: number;
};

export function BusinessProfileSection({
  profile,
  partnerType,
  basicsEditable,
  onWorkingProfileSaved,
  onBasicsDirtyChange,
  forceEditing,
  forceStep,
}: Props) {
  return (
    <div className={surfaceStyles.businessScope} data-testid="business-profile-scope">
      <BusinessWorkingProfileWizard
        initialProfile={profile}
        partnerType={partnerType}
        basicsEditable={basicsEditable}
        onWorkingProfileSaved={onWorkingProfileSaved}
        onBasicsDirtyChange={onBasicsDirtyChange}
        forceEditing={forceEditing}
        forceStep={forceStep}
      />
    </div>
  );
}
