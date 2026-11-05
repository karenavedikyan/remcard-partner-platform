"use client";

import { Panel } from "@/components/ui/Panel";
import {
  PROFILE_SECTION_ACCESS_DENIED,
  PROFILE_SECTION_OWNER_HINTS,
} from "@/lib/profile-section-access";
import type { ProfileSectionId } from "@/lib/profile-sections";
import styles from "./ProfileEditor.module.css";

const SECTION_PANEL_TITLES: Record<ProfileSectionId, string> = {
  overview: "Обзор",
  basics: "Основные данные",
  catalog: "Каталог RemCard",
  branches: "Филиалы",
  team: "Сотрудники",
  notifications: "Уведомления",
};

type Props = {
  sectionId: ProfileSectionId;
};

/** Honest access state inside the shared profile template (no privileged fetches). */
export function ProfileSectionAccessGate({ sectionId }: Props) {
  return (
    <Panel
      title={SECTION_PANEL_TITLES[sectionId]}
      hint={PROFILE_SECTION_OWNER_HINTS[sectionId]}
    >
      <p className={styles.hint} role="status" data-testid="profile-section-access-denied">
        {PROFILE_SECTION_ACCESS_DENIED}
      </p>
    </Panel>
  );
}
