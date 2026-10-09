"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { EmployeesOverviewResponse } from "@/lib/employees-overview-types";
import {
  effectiveCatalogStatus,
  showRevisionBanner,
} from "@/lib/profile-catalog-state";
import {
  partnerTypeLabel,
  savedDirectionLabels,
  workingProfileReadyLabel,
  workingProfileTitle,
} from "@/lib/profile-overview-display";
import type { ProfileDraft } from "@/lib/profile-save";
import type { ProProfileResponse } from "@/lib/types";
import { CATALOG_STATUS_LABELS } from "@/lib/partnership-labels";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ProfileSectionId } from "@/lib/profile-sections";
import styles from "./ProfileOverviewSection.module.css";

type ProfileOverviewSectionProps = {
  profile: ProProfileResponse;
  draft: ProfileDraft;
  onNavigateSection: (section: ProfileSectionId) => void;
};

function isPubliclyVisible(profile: ProProfileResponse): boolean {
  return profile.catalogPublication?.isLivePublic === true;
}

function avatarInitials(title: string): string {
  const parts = title.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ProfileOverviewSection({
  profile,
  draft,
  onNavigateSection,
}: ProfileOverviewSectionProps) {
  const [teamOverview, setTeamOverview] = useState<EmployeesOverviewResponse | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [soloEmployeeCount, setSoloEmployeeCount] = useState<number | null>(null);

  const partnerType = draft.partnerType ?? profile.user.partnerType ?? "MASTER";
  const hasOrganization = Boolean(profile.organization);
  const showBranchesTools =
    hasOrganization && (partnerType === "STORE" || partnerType === "COMPANY");

  const loadTeamSummary = useCallback(async () => {
    if (!showBranchesTools && partnerType !== "MASTER") {
      return;
    }
    setTeamLoading(true);
    setTeamError("");
    setSoloEmployeeCount(null);
    try {
      const data = await remcardFetch<EmployeesOverviewResponse>(
        "/api/pro/organization/employees-overview",
      );
      setTeamOverview(data);
      if (data.myRole === "SOLO_PARTNER") {
        try {
          const solo = await remcardFetch<{ employees: unknown[] }>("/api/pro/employees");
          setSoloEmployeeCount(solo.employees?.length ?? 0);
        } catch {
          setSoloEmployeeCount(null);
        }
      }
    } catch (caught) {
      setTeamOverview(null);
      if (caught instanceof RemcardApiError && caught.status === 403) {
        setTeamError("");
      } else {
        setTeamError(
          caught instanceof RemcardApiError
            ? caught.message
            : "Не удалось загрузить сводку по команде",
        );
      }
    } finally {
      setTeamLoading(false);
    }
  }, [partnerType, showBranchesTools]);

  useEffect(() => {
    void loadTeamSummary();
  }, [loadTeamSummary]);

  const title = workingProfileTitle(profile, draft);
  const ready = workingProfileReadyLabel(draft);
  const directions = savedDirectionLabels(profile, draft);
  const catalogStatus = effectiveCatalogStatus(profile);
  const catalogLabel = CATALOG_STATUS_LABELS[catalogStatus] ?? catalogStatus;
  const published = isPubliclyVisible(profile);
  const needsRevision = showRevisionBanner(profile);

  const branchCount = useMemo(() => {
    if (!showBranchesTools) return null;
    if (teamOverview) {
      return teamOverview.branches.length;
    }
    if (teamLoading || teamError) return null;
    return profile.organization?.branchCount ?? null;
  }, [profile.organization, showBranchesTools, teamError, teamLoading, teamOverview]);

  const employeeCount = useMemo(() => {
    if (teamOverview?.myRole === "SOLO_PARTNER" && soloEmployeeCount != null) {
      return soloEmployeeCount;
    }
    if (teamOverview) {
      return teamOverview.summary.totalEmployees;
    }
    return null;
  }, [soloEmployeeCount, teamOverview]);

  const catalogPrimaryAction = published
    ? { label: "Управлять карточкой", section: "catalog" as const }
    : { label: "Подготовить публикацию", section: "catalog" as const };

  return (
    <div className={styles.grid}>
      {needsRevision ? (
        <div className={styles.revisionBanner} role="status">
          <strong>Нужно исправить публикацию в каталоге</strong>
          <p className={styles.subline}>
            Откройте раздел «Каталог RemCard», внесите правки и отправьте повторно.
          </p>
          <Button type="button" variant="secondary" onClick={() => onNavigateSection("catalog")}>
            Перейти к замечанию
          </Button>
        </div>
      ) : null}

      <Panel title="Рабочий профиль" className={styles.identityPanel}>
        <div className={styles.identityRow}>
          <div className={styles.avatar} aria-hidden>
            {profile.user.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.user.photoUrl} alt="" />
            ) : (
              avatarInitials(title)
            )}
          </div>
          <div className={styles.titleBlock}>
            <h2>{title}</h2>
            <p className={styles.subline}>
              {partnerTypeLabel(partnerType)}
              {draft.city.trim() || profile.user.city
                ? ` · ${draft.city.trim() || profile.user.city}`
                : ""}
            </p>
          </div>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>Представитель</dt>
            <dd>{draft.displayName.trim() || profile.user.displayName || "—"}</dd>
          </div>
          <div>
            <dt>Статус заполнения</dt>
            <dd>
              <StatusBadge
                label={ready.label}
                tone={ready.ready ? "active" : "pending"}
              />
            </dd>
          </div>
          <div>
            <dt>Направления</dt>
            <dd>
              {directions.length ? (
                <ul className={styles.chips}>
                  {directions.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : (
                "Пока не указаны"
              )}
            </dd>
          </div>
        </dl>

        <div className={styles.panelFoot}>
          <p className={styles.subline}>
            Данные для партнёрства; публикация в каталоге необязательна.
          </p>
          <Button type="button" variant="secondary" onClick={() => onNavigateSection("basics")}>
            Изменить
          </Button>
        </div>
      </Panel>

      <aside className={styles.catalogTeaser} aria-label="Каталог RemCard">
        <span className={styles.catalogEyebrow}>Каталог RemCard</span>
        <h2>Пусть новые клиенты найдут вас</h2>
        <p>
          Расскажите, какие товары вы продаёте или какие услуги оказываете. Можно указать одно
          направление или оба, чтобы клиенты нашли именно вас.
        </p>
        <p className={styles.catalogStatus}>
          Статус: {needsRevision ? "Нужно исправить" : catalogLabel}
          {published ? " · опубликовано" : ""}
        </p>
        <div className={styles.catalogActions}>
          {needsRevision ? (
            <Button type="button" onClick={() => onNavigateSection("catalog")}>
              Исправить публикацию
            </Button>
          ) : (
            <Button type="button" onClick={() => onNavigateSection(catalogPrimaryAction.section)}>
              {catalogPrimaryAction.label}
            </Button>
          )}
        </div>
      </aside>

      {(showBranchesTools || teamOverview || teamError || teamLoading) && (
        <div className={styles.wideRow}>
          <div className={styles.tools}>
            {showBranchesTools ? (
              <button
                type="button"
                className={styles.toolLink}
                onClick={() => onNavigateSection("branches")}
              >
                <div className={styles.toolBody}>
                  <strong>Филиалы</strong>
                  <p>Адреса и публикация филиалов в каталоге.</p>
                </div>
                {teamError ? (
                  <span className={styles.toolCountMuted}>—</span>
                ) : teamLoading && branchCount == null ? (
                  <span className={styles.toolCountMuted}>…</span>
                ) : branchCount != null ? (
                  <span className={styles.toolCount}>{branchCount}</span>
                ) : (
                  <span className={styles.toolCountMuted}>—</span>
                )}
              </button>
            ) : null}
            <button
              type="button"
              className={styles.toolLink}
              onClick={() => onNavigateSection("team")}
            >
              <div className={styles.toolBody}>
                <strong>Сотрудники</strong>
                <p>Приглашения и доступы в рамках ваших прав.</p>
              </div>
              {teamError ? (
                <span className={styles.toolCountMuted}>—</span>
              ) : teamLoading && employeeCount == null ? (
                <span className={styles.toolCountMuted}>…</span>
              ) : employeeCount != null ? (
                <span className={styles.toolCount}>{employeeCount}</span>
              ) : (
                <span className={styles.toolCountMuted}>—</span>
              )}
            </button>
          </div>
          {teamError ? (
            <div className={styles.noticeStrip}>
              <div className={styles.errorBox} role="alert">
                {teamError}
                <Button type="button" variant="secondary" onClick={() => void loadTeamSummary()}>
                  Повторить
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <div className={styles.wideRow}>
        <div className={styles.noticeStrip}>
          <span className={styles.subline}>
            Настройте, куда приходят события кабинета (Telegram, MAX и др.).
          </span>
          <Button type="button" variant="secondary" onClick={() => onNavigateSection("notifications")}>
            Настройки уведомлений
          </Button>
        </div>
      </div>
    </div>
  );
}
