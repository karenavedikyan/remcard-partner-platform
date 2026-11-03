"use client";

import { useEffect, useState, type ReactNode } from "react";
import { fetchSpecialistProfileDraft } from "@/lib/specialist-r06/api";
import { ProfileSectionEmptyState } from "./ProfileSectionEmptyState";
import {
  specialistOverviewIntroModeFromDraft,
  type SpecialistOverviewIntroMode,
} from "./specialist-profile-empty-intro";

type Props = {
  onStartFill: () => void;
  /** Legacy overview (dashes, Изменить, catalog promo). Shown while pending and when not true-zero. */
  children: ReactNode;
};

export function SpecialistOverviewEmptyGate({ onStartFill, children }: Props) {
  const [mode, setMode] = useState<SpecialistOverviewIntroMode>("pending");

  useEffect(() => {
    let cancelled = false;
    setMode("pending");
    void fetchSpecialistProfileDraft()
      .then((data) => {
        if (cancelled) return;
        setMode(specialistOverviewIntroModeFromDraft(data));
      })
      .catch(() => {
        if (!cancelled) setMode("legacy");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (mode === "empty") {
    return <ProfileSectionEmptyState role="specialist" onStartFill={onStartFill} />;
  }

  return children;
}
