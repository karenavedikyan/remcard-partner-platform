"use client";

import { useEffect, useState } from "react";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import { SpecialistWorkingProfileWizard } from "./SpecialistWorkingProfileWizard";

type Props = {
  partnerType: string | null;
  onWorkingProfileSaved?: () => void;
  onR06ActiveChange?: (active: boolean) => void;
};

export function SpecialistProfileSection({
  partnerType,
  onWorkingProfileSaved,
  onR06ActiveChange,
}: Props) {
  const [eligible, setEligible] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchSpecialistR06Status()
      .then((status) => {
        if (cancelled) return;
        const active = Boolean(status.featureEnabled && status.eligible && partnerType === "MASTER");
        setEligible(active);
        onR06ActiveChange?.(active);
      })
      .catch(() => {
        if (!cancelled) {
          setEligible(false);
          onR06ActiveChange?.(false);
        }
      })
      .finally(() => {
        if (!cancelled) setChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [partnerType]);

  if (!checked || !eligible) return null;

  return (
    <SpecialistWorkingProfileWizard
      onWorkingProfileSaved={onWorkingProfileSaved}
    />
  );
}
