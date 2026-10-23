"use client";

import { effectiveCatalogStatus } from "@/lib/profile-catalog-state";
import { SpecialistCatalogPendingView } from "../specialist/SpecialistCatalogPendingView";
import {
  OrganizationCatalogWizard,
  type OrganizationCatalogWizardProps,
} from "./OrganizationCatalogWizard";

export function OrganizationCatalogSection(props: OrganizationCatalogWizardProps) {
  const status = effectiveCatalogStatus(props.profile);
  if (status === "PENDING") {
    return (
      <SpecialistCatalogPendingView
        profile={props.profile}
        draft={props.draft}
        previewVariant="default"
      />
    );
  }
  return <OrganizationCatalogWizard {...props} />;
}
