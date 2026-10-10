"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { EmployeesOverviewResponse } from "@/lib/employees-overview-types";
import {
  effectiveCatalogStatus,
  showRevisionBanner,
} from "@/lib/profile-catalog-state";
import {
  partnerTypeLabel,
  savedCity,
  savedDirectionLabels,
  savedRepresentativeName,
  savedWorkingProfileReadyLabel,
  savedWorkingProfileTitle,
  savedPartnerSearchVisibleLabel,
} from "@/lib/profile-overview-display";
import type { ProProfileResponse } from "@/lib/types";
import { CATALOG_STATUS_LABELS } from "@/lib/partnership-labels";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ProfileSectionId } from "@/lib/profile-sections";
import { useProfileCabinetAccess } from "./ProfileCabinetAccessContext";
import styles from "./ProfileOverviewSection.module.css";

type ProfileOverviewSectionProps = {
  profile: ProProfileResponse;
  onNavigateSection: (section: ProfileSectionId) => void;
  hasUnsavedBasicsChanges?: boolean;
  /** Dev/screenshot fixture only — skips live fetch. */
  fixtureOverview?: EmployeesOverviewResponse | null;
};

type SoloEmployeesState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; count: number }
  | { status: "empty" }
  | { status: "error"; message: string };

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
  onNavigateSection,
  hasUnsavedBasicsChanges = false,
  fixtureOverview,
}: ProfileOverviewSectionProps) {
  const { canFetchEmployeesOverview, contextReady } = useProfileCabinetAccess();
  const [teamOverview, setTeamOverview] = useState<EmployeesOverviewResponse | null>(
    fixtureOverview ?? null,
  );
  const fetchGenerationRef = useRef(0);
  const [overviewLoading, setOverviewLoading] = useState(!fixtureOverview);
  const [overviewForbidden, setOverviewForbidden] = useState(false);
  const [overviewError, setOverviewError] = useState("");
  const [soloEmployees, setSoloEmployees] = useState<SoloEmployeesState>({ status: "idle" });

  const partnerType = profile.user.partnerType ?? "MASTER";
  const hasOrganization = Boolean(profile.organization);
  const showBranchesTools =
    hasOrganization && (partnerType === "STORE" || partnerType === "COMPANY");

  const loadSoloEmployees = useCallback(async () => {
    setSoloEmployees({ status: "loading" });
    try {
      const solo = await remcardFetch<{ employees: unknown[] }>("/api/pro/employees");
      const count = solo.employees?.length ?? 0;
      setSoloEmployees(count === 0 ? { status: "empty" } : { status: "ok", count });
    } catch (caught) {
      setSoloEmployees({
        status: "error",
        message:
          caught instanceof RemcardApiError
            ? caught.message
            : "Не удалось загрузить список сотрудников",
      });
    }
  }, []);

  const loadTeamSummary = useCallback(async () => {
    if (fixtureOverview) {
      setTeamOverview(fixtureOverview);
      setOverviewLoading(false);
      if (fixtureOverview.myRole === "SOLO_PARTNER") {
        await loadSoloEmployees();
      }
      return;
    }
    if (!contextReady || !canFetchEmployeesOverview) {
      setTeamOverview(null);
      setOverviewLoading(false);
      setOverviewForbidden(!canFetchEmployeesOverview && contextReady);
      setOverviewError("");
      setSoloEmployees({ status: "idle" });
      return;
    }
    if (!showBranchesTools && partnerType !== "MASTER") {
      return;
    }
    const generation = fetchGenerationRef.current;
    setOverviewLoading(true);
    setOverviewForbidden(false);
    setOverviewError("");
    setTeamOverview(null);
    setSoloEmployees({ status: "idle" });
    try {
      const data = await remcardFetch<EmployeesOverviewResponse>(
        "/api/pro/organization/employees-overview",
      );
      if (generation !== fetchGenerationRef.current) return;
      setTeamOverview(data);
      if (data.myRole === "SOLO_PARTNER") {
        await loadSoloEmployees();
      }
    } catch (caught) {
      if (generation !== fetchGenerationRef.current) return;
      setTeamOverview(null);
      if (caught instanceof RemcardApiError && caught.status === 403) {
        setOverviewForbidden(true);
      } else {
        setOverviewError(
          caught instanceof RemcardApiError
            ? caught.message
            : "Не удалось загрузить сводку по команде",
        );
      }
    } finally {
      setOverviewLoading(false);
    }
  }, [
    canFetchEmployeesOverview,
    contextReady,
    fixtureOverview,
    loadSoloEmployees,
    partnerType,
    showBranchesTools,
  ]);

  useEffect(() => {
    fetchGenerationRef.current += 1;
    setTeamOverview(null);
    setOverviewForbidden(false);
    setOverviewError("");
    setSoloEmployees({ status: "idle" });
  }, [canFetchEmployeesOverview, contextReady, profile.user.id]);

  useEffect(() => {
    void loadTeamSummary();
  }, [loadTeamSummary]);

  const title = savedWorkingProfileTitle(profile);
  const ready = savedWorkingProfileReadyLabel(profile);
  const directions = savedDirectionLabels(profile);
  const catalogStatus = effectiveCatalogStatus(profile);
  const catalogLabel = CATALOG_STATUS_LABELS[catalogStatus] ?? catalogStatus;
  const published = isPubliclyVisible(profile);
  const needsRevision = showRevisionBanner(profile);

  const branchCount = useMemo(() => {
    if (!showBranchesTools || overviewForbidden || overviewError) return null;
    if (overviewLoading) return null;
    if (teamOverview) return teamOverview.branches.length;
    return null;
  }, [
    overviewError,
    overviewForbidden,
    overviewLoading,
    showBranchesTools,
    teamOverview,
  ]);

  const employeeCountDisplay = useMemo((): {
    kind: "loading" | "hidden" | "dash" | "count" | "error";
    count?: number;
    message?: string;
  } => {
    if (overviewForbidden) return { kind: "hidden" };
    if (overviewError) return { kind: "dash" };
    if (overviewLoading) return { kind: "loading" };
    if (!teamOverview) return { kind: "dash" };
    if (teamOverview.myRole === "SOLO_PARTNER") {
      if (soloEmployees.status === "loading" || soloEmployees.status === "idle") {
        return { kind: "loading" };
      }
      if (soloEmployees.status === "error") {
        return { kind: "error", message: soloEmployees.message };
      }
      if (soloEmployees.status === "empty") {
        return { kind: "count", count: 0 };
      }
      return { kind: "count", count: soloEmployees.count };
    }
    return { kind: "count", count: teamOverview.summary.totalEmployees };
  }, [overviewError, overviewForbidden, overviewLoading, soloEmployees, teamOverview]);

  const showTeamTools =
    showBranchesTools ||
    partnerType === "MASTER" ||
    overviewLoading ||
    Boolean(teamOverview) ||
    Boolean(overviewError) ||
    overviewForbidden;

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

      {hasUnsavedBasicsChanges ? (
        <div className={styles.revisionBanner} role="status">
          <strong>Есть несохранённые изменения в основных данных</strong>
          <p className={styles.subline}>
            На обзоре показаны последние сохранённые данные. Сохраните правки в разделе «Основные
            данные», чтобы они стали рабочим профилем.
          </p>
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
              {partnerTypeLabel(partnerType)} · {savedCity(profile)}
            </p>
          </div>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>Представитель</dt>
            <dd>{savedRepresentativeName(profile)}</dd>
          </div>
          <div>
            <dt>Статус заполнения</dt>
            <dd>
              <StatusBadge label={ready.label} tone={ready.ready ? "active" : "pending"} />
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
          <div>
            <dt>Поиск партнёров</dt>
            <dd>{savedPartnerSearchVisibleLabel(profile)}</dd>
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

      {showTeamTools ? (
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
                {overviewForbidden || overviewError ? (
                  <span className={styles.toolCountMuted}>—</span>
                ) : overviewLoading || branchCount == null ? (
                  <span className={styles.toolCountMuted}>…</span>
                ) : (
                  <span className={styles.toolCount}>{branchCount}</span>
                )}
              </button>
            ) : null}
            {!overviewForbidden ? (
              <button
                type="button"
                className={styles.toolLink}
                onClick={() => onNavigateSection("team")}
              >
                <div className={styles.toolBody}>
                  <strong>Сотрудники</strong>
                  <p>Приглашения и доступы в рамках ваших прав.</p>
                </div>
                {employeeCountDisplay.kind === "loading" ? (
                  <span className={styles.toolCountMuted}>…</span>
                ) : employeeCountDisplay.kind === "count" ? (
                  <span className={styles.toolCount}>{employeeCountDisplay.count}</span>
                ) : (
                  <span className={styles.toolCountMuted}>—</span>
                )}
              </button>
            ) : null}
          </div>
          {overviewError ? (
            <div className={styles.noticeStrip}>
              <div className={styles.errorBox} role="alert">
                {overviewError}
                <Button type="button" variant="secondary" onClick={() => void loadTeamSummary()}>
                  Повторить
                </Button>
              </div>
            </div>
          ) : null}
          {employeeCountDisplay.kind === "error" ? (
            <div className={styles.noticeStrip}>
              <div className={styles.errorBox} role="alert">
                {employeeCountDisplay.message}
                <Button type="button" variant="secondary" onClick={() => void loadSoloEmployees()}>
                  Повторить
                </Button>
              </div>
            </div>
          ) : null}
          {overviewForbidden ? (
            <div className={styles.noticeStrip}>
              <span className={styles.subline}>Сводка по команде недоступна для вашей роли.</span>
            </div>
          ) : null}
        </div>
      ) : null}

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
