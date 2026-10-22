"use client";

import type { ProProfileResponse } from "@/lib/types";
import type { BusinessProfilePartnerType } from "@/lib/business-profile/eligibility";
import { BusinessWorkingProfileWizard } from "./BusinessWorkingProfileWizard";

type Props = {
  profile: ProProfileResponse;
  partnerType: BusinessProfilePartnerType;
  basicsEditable: boolean;
  onWorkingProfileSaved?: (next: ProProfileResponse) => void;
};

export function BusinessProfileSection({
  profile,
  partnerType,
  basicsEditable,
  onWorkingProfileSaved,
}: Props) {
  return (
    <BusinessWorkingProfileWizard
      key={profile.user.id}
      initialProfile={profile}
      partnerType={partnerType}
      basicsEditable={basicsEditable}
      onWorkingProfileSaved={onWorkingProfileSaved}
    />
  );
}
