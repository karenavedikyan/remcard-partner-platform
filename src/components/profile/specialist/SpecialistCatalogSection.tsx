"use client";

import { effectiveCatalogStatus } from "@/lib/profile-catalog-state";
import { SpecialistCatalogPendingView } from "./SpecialistCatalogPendingView";
import { SpecialistCatalogWizard, type SpecialistCatalogWizardProps } from "./SpecialistCatalogWizard";

export function SpecialistCatalogSection(props: SpecialistCatalogWizardProps) {
  const status = effectiveCatalogStatus(props.profile);
  if (status === "PENDING") {
    return <SpecialistCatalogPendingView profile={props.profile} draft={props.draft} />;
  }
  return <SpecialistCatalogWizard {...props} />;
}
