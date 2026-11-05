"use client";

import { useMemo, useState } from "react";
import type { ProfileCabinetAccess } from "@/lib/profile-cabinet-access";
import type { BusinessProfilePartnerType } from "@/lib/business-profile/eligibility";
import type { ProProfileResponse } from "@/lib/types";
import type { ProfileSectionId } from "@/lib/profile-sections";
import {
  staffAccessScopeBranchLines,
  staffAccessScopeHeadline,
  staffWorkingBranchLine,
} from "@/lib/profile-staff-cabinet";
import { ProfileBranchContextSwitcher } from "@/components/profile/ProfileBranchContextSwitcher";
import { ProfileTeamSection } from "@/components/profile/ProfileTeamSection";
import { ProfileCabinetAccessProvider } from "@/components/profile/ProfileCabinetAccessContext";
import styles from "./ProfileEditor.module.css";

const STAFF_SECTIONS: Array<{ id: ProfileSectionId; label: string }> = [
  { id: "overview", label: "Обзор" },
  { id: "team", label: "Команда" },
];

type Props = {
  initial: ProProfileResponse;
  cabinetAccess: ProfileCabinetAccess;
  partnerType: BusinessProfilePartnerType;
  section: ProfileSectionId;
};

export function ProfileOrgStaffWorkplace({
  initial,
  cabinetAccess,
  partnerType,
  section: initialSection,
}: Props) {
  const proContext = cabinetAccess.proContext;
  const orgName = proContext?.organization?.name?.trim() ?? "Организация";
  const sections = useMemo(() => {
    if (cabinetAccess.canOpenTeamSection) return STAFF_SECTIONS;
    return STAFF_SECTIONS.filter((s) => s.id === "overview");
  }, [cabinetAccess.canOpenTeamSection]);

  const [activeSection, setActiveSection] = useState<ProfileSectionId>(() => {
    if (initialSection === "team" && cabinetAccess.canOpenTeamSection) return "team";
    return "overview";
  });

  const scopeHeadline = staffAccessScopeHeadline(proContext);
  const branchLines = staffAccessScopeBranchLines(proContext);
  const workingBranch = staffWorkingBranchLine(proContext);
  const eyebrow = partnerType === "STORE" ? "Магазин" : "Компания";

  return (
    <ProfileCabinetAccessProvider value={cabinetAccess}>
    <div className={styles.shell} data-testid="profile-org-staff-workplace">
      <nav className={styles.sectionNav} aria-label="Разделы профиля">
        <ul className={styles.tabStrip} role="tablist">
          {sections.map((item) => (
            <li key={item.id} role="presentation">
              <button
                type="button"
                role="tab"
                aria-selected={activeSection === item.id}
                className={`${styles.tabButton} ${activeSection === item.id ? styles.tabButtonActive : ""}`}
                onClick={() => setActiveSection(item.id)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {activeSection === "overview" ? (
        <section className={styles.panel} aria-labelledby="staff-profile-overview">
          <p className={styles.hint}>{eyebrow}</p>
          <h2 id="staff-profile-overview">{orgName}</h2>
          <p className={styles.hint}>
            Вы вошли как {initial.user.displayName?.trim() || "сотрудник"}. Данные организации
            берутся из рабочего контекста, а не из личного профиля владельца.
          </p>
          {scopeHeadline ? (
            <p className={styles.hint}>
              <strong>Область доступа:</strong> {scopeHeadline}
            </p>
          ) : null}
          {workingBranch ? (
            <p className={styles.hint}>
              <strong>Текущий филиал:</strong> {workingBranch}
            </p>
          ) : null}
          <ProfileBranchContextSwitcher />
          {branchLines.length > 0 ? (
            <ul className={styles.hint}>
              {branchLines.map((b) => (
                <li key={b.id}>{b.line}</li>
              ))}
            </ul>
          ) : null}
          <p className={styles.hint} role="status">
            Каталог организации, регистрация юрлица и настройки владельца недоступны. Если раздел
            не открывается, сервер вернёт отказ доступа — пустые значения не подставляются.
          </p>
        </section>
      ) : null}

      {activeSection === "team" ? (
        cabinetAccess.canOpenTeamSection ? (
          <ProfileTeamSection businessPartnerType={partnerType} />
        ) : (
          <p className={styles.hint} role="status" data-testid="profile-team-blocked">
            Раздел «Команда» недоступен для вашей роли.
          </p>
        )
      ) : null}
    </div>
    </ProfileCabinetAccessProvider>
  );
}
