"use client";

import { useEffect, useState } from "react";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import { SpecialistCatalogWizard, type SpecialistCatalogWizardProps } from "./SpecialistCatalogWizard";

type Props = SpecialistCatalogWizardProps & {
  partnerType: string | null;
};

export function SpecialistCatalogSection({ partnerType, ...wizardProps }: Props) {
  const [eligible, setEligible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSpecialistR06Status()
      .then((status) => {
        if (cancelled) return;
        setEligible(Boolean(status.featureEnabled && status.eligible && partnerType === "MASTER"));
      })
      .catch(() => {
        if (!cancelled) setEligible(false);
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerType]);

  if (!checked || !eligible) return null;

  return <SpecialistCatalogWizard {...wizardProps} />;
}
