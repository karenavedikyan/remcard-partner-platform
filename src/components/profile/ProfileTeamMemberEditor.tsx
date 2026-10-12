"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { EmployeesOverviewResponse, TeamMemberRow } from "@/lib/employees-overview-types";
import { effectiveActionIdsForBranch, memberPermissionState } from "@/lib/prof-i-member-permissions";
import { manageableBranchAccess, memberDisplayName } from "@/lib/team-section-model";
import {
  branchesLosingSoleManager,
  branchesLosingSoleManagerOnUncheck,
  buildRemoveFromTeamConfirmCopy,
} from "@/lib/team-member-remove-copy";
import {
  normalizePermissionFlags,
  permissionLabelsFromFlags,
  type ProfIPermissionFlags,
} from "@/lib/prof-i-permissions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { ProfileTeamPermissionMatrix } from "./ProfileTeamPermissionMatrix";
import { TeamBonusIllustration } from "./TeamBonusIllustration";
import formStyles from "./ProfileEditor.module.css";
import styles from "./ProfileTeamPermissions.module.css";

type Props = {
  member: TeamMemberRow;
  overview: EmployeesOverviewResponse;
  onClose: () => void;
  onSaved: (successMessage: string, removedUserId?: string) => void;
};

const STEP_LABELS = ["Должность и права", "Подразделения", "Проверка"] as const;

export function ProfileTeamMemberEditor({ member, overview, onClose, onSaved }: Props) {
  const isOrgOwner = overview.viewer.isOrgOwner;
  const manageable = useMemo(
    () => manageableBranchAccess(overview, member),
    [
      member.userId,
      overview.viewer.isOrgOwner,
      JSON.stringify(member.branchAccess.map((b) => `${b.branchId}:${b.employeeId}`)),
      JSON.stringify(overview.viewer.canManageEmployeesByBranchId),
    ],
  );
  const initial = memberPermissionState(member);
  const [step, setStep] = useState(1);
  const [membershipKind, setMembershipKind] = useState<"BRANCH_STAFF" | "HEAD_OFFICE">(
    member.membershipKind === "HEAD_OFFICE" ? "HEAD_OFFICE" : "BRANCH_STAFF",
  );
  const [position, setPosition] = useState(member.position ?? "");
  const [fullName, setFullName] = useState(member.fullName ?? "");
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (!overview.viewer.isOrgOwner) {
      return new Set(manageableBranchAccess(overview, member).map((m) => m.branchId));
    }
    return new Set(initial.selectedBranchIds);
  });
  const [defaultPermissions, setDefaultPermissions] = useState<ProfIPermissionFlags>(
    initial.defaultPermissions,
  );
  const [branchPermissions, setBranchPermissions] = useState<Record<string, ProfIPermissionFlags>>(
    initial.branchPermissions,
  );
  const [permissionsMixed, setPermissionsMixed] = useState(initial.permissionsMixed);
  const [scopeEditorBranchId, setScopeEditorBranchId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const actionErrorRef = useRef<HTMLParagraphElement>(null);

  const branchOptions = overview.branches;
  const editableBranches = isOrgOwner
    ? branchOptions
    : manageable
        .map((a) => branchOptions.find((b) => b.id === a.branchId))
        .filter((b): b is (typeof branchOptions)[number] => Boolean(b));

  useEffect(() => {
    const el = actionErrorRef.current;
    if (!error || !el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [error]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function branchActionIds(branchId: string) {
    return effectiveActionIdsForBranch({
      permissionsMixed,
      defaultPermissions,
      branchPermissions,
      branchId,
    });
  }

  function toggleBranch(id: string) {
    setDirty(true);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setBranchPermissions((bp) => {
          const copy = { ...bp };
          delete copy[id];
          return copy;
        });
      } else next.add(id);
      return next;
    });
  }

  async function saveBranchScoped() {
    if (!manageable.length) {
      setError("Нет филиалов, доступных для редактирования");
      return;
    }
    setSaving(true);
    setError("");
    try {
      for (const access of manageable) {
        const flags = normalizePermissionFlags(
          permissionsMixed
            ? (branchPermissions[access.branchId] ?? defaultPermissions)
            : defaultPermissions,
        );
        await remcardFetch(
          `/api/pro/organization/branches/${encodeURIComponent(access.branchId)}/employees/${encodeURIComponent(access.employeeId)}`,
          { method: "PATCH", body: { permissions: flags } },
        );
      }
      onSaved(`Права ${memberDisplayName(member)} обновлены`);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function saveOwner() {
    if (membershipKind === "BRANCH_STAFF" && selected.size === 0 && branchOptions.length > 0) {
      setError("Для сотрудника филиалов выберите хотя бы один филиал");
      setStep(2);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        organizationId: overview.organization.id,
        membershipKind,
        position: position.trim() || null,
        fullName: fullName.trim() || null,
        branchIds: [...selected],
        defaultPermissions,
        permissionsMixed,
      };
      if (permissionsMixed) {
        const map: Record<string, ProfIPermissionFlags> = {};
        for (const id of selected) {
          map[id] = normalizePermissionFlags(branchPermissions[id] ?? defaultPermissions);
        }
        body.branchPermissions = map;
      }
      await remcardFetch(`/api/pro/organization/team-members/${encodeURIComponent(member.userId)}`, {
        method: "PATCH",
        body,
      });
      onSaved(`Права ${memberDisplayName(member)} обновлены`);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  async function submitSave(event: FormEvent) {
    event.preventDefault();
    if (!confirmed || !dirty || saving || revoking) return;
    if (!isOrgOwner) {
      await saveBranchScoped();
      return;
    }
    await saveOwner();
  }

  async function removeFromTeamConfirmed() {
    setRemoveConfirmOpen(false);
    setRevoking(true);
    setError("");
    try {
      await remcardFetch(
        `/api/pro/organization/team-members/${encodeURIComponent(member.userId)}?organizationId=${encodeURIComponent(overview.organization.id)}`,
        { method: "DELETE" },
      );
      onSaved(`${memberDisplayName(member)} удалён из команды`, member.userId);
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось удалить из команды");
    } finally {
      setRevoking(false);
    }
  }

  const removeCopy = isOrgOwner
    ? buildRemoveFromTeamConfirmCopy({
        member,
        organizationName: overview.organization.name,
        soleManagerBranches: branchesLosingSoleManager(overview, member),
      })
    : null;

  const partialSoleManagerBranches = isOrgOwner
    ? branchesLosingSoleManagerOnUncheck(overview, member, selected)
    : [];

  const scopeBranch = scopeEditorBranchId
    ? branchOptions.find((b) => b.id === scopeEditorBranchId)
    : null;

  if (scopeBranch) {
    const scopeFlags = normalizePermissionFlags(
      branchPermissions[scopeBranch.id] ?? defaultPermissions,
    );
    return (
      <div className={styles.wizardBackdrop} role="dialog" aria-modal="true">
        <div className={styles.wizardPanel}>
          <div className={styles.wizardHead}>
            <h3>Права в {scopeBranch.name}</h3>
            <Button type="button" variant="secondary" onClick={() => setScopeEditorBranchId(null)}>
              Назад
            </Button>
          </div>
          <div className={styles.wizardBody}>
            <ProfileTeamPermissionMatrix
              value={scopeFlags}
              onChange={(next) => {
                setDirty(true);
                setPermissionsMixed(true);
                setBranchPermissions((prev) => ({ ...prev, [scopeBranch.id]: next }));
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  const stepValid =
    step === 1
      ? true
      : step === 2
        ? isOrgOwner
          ? membershipKind === "HEAD_OFFICE" || selected.size > 0 || branchOptions.length === 0
          : manageable.length > 0
        : confirmed;

  const summaryBranchIds = isOrgOwner ? [...selected] : editableBranches.map((b) => b.id);

  function renderStepBody() {
    if (step === 1) {
      return (
        <>
          <h3>{fullName.trim() || member.displayName}</h3>
          <p className={formStyles.hint}>
            {member.publicId} · настройте должность и набор прав
          </p>
          {isOrgOwner ? (
            <div className={styles.identityGrid}>
              <TextField
                label="ФИО в команде"
                value={fullName}
                onChange={(e) => {
                  setDirty(true);
                  setFullName(e.target.value);
                }}
              />
              <TextField
                label="Должность"
                value={position}
                onChange={(e) => {
                  setDirty(true);
                  setPosition(e.target.value);
                }}
              />
            </div>
          ) : (
            <p className={formStyles.hint}>
              Редактирование только для филиалов, где у вас есть право управлять сотрудниками (
              {manageable.map((b) => b.branchName).join(", ")}).
            </p>
          )}
          <div className={styles.editorGrid}>
            <ProfileTeamPermissionMatrix
              value={defaultPermissions}
              onChange={(next) => {
                setDirty(true);
                setDefaultPermissions(next);
              }}
              disabled={saving || revoking}
            />
            <TeamBonusIllustration compact />
          </div>
        </>
      );
    }

    if (step === 2) {
      return (
        <>
          <h3>Где действуют выбранные права?</h3>
          <p className={formStyles.hint}>
            Выберите филиалы и, при необходимости, головной офис. Новые филиалы автоматически не
            добавляются.
          </p>
          {isOrgOwner && branchOptions.length ? (
            <div className={styles.locationChoice}>
              {branchOptions.map((b) => {
                const count = branchActionIds(b.id).length;
                return (
                  <div key={b.id} className={styles.locationRow}>
                    <label className={styles.locationLabel}>
                      <input
                        type="checkbox"
                        data-testid={`team-member-branch-${b.id}`}
                        checked={selected.has(b.id)}
                        onChange={() => toggleBranch(b.id)}
                      />
                      <span>
                        <strong>{b.name}</strong>
                        <small>{b.city}</small>
                        {selected.has(b.id) ? (
                          <small>
                            {count} разрешений
                            {branchActionIds(b.id).includes("cash") ||
                            branchActionIds(b.id).includes("transfer")
                              ? " · выплаты разрешены"
                              : ""}
                          </small>
                        ) : null}
                      </span>
                    </label>
                    {permissionsMixed && selected.has(b.id) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setScopeEditorBranchId(b.id)}
                      >
                        Настроить права
                      </Button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {isOrgOwner ? (
            <div className={`${styles.locationChoice} ${styles.officeBlock}`}>
              <label className={styles.locationLabel}>
                <input
                  type="checkbox"
                  data-testid="team-member-head-office"
                  checked={membershipKind === "HEAD_OFFICE"}
                  onChange={(e) => {
                    setDirty(true);
                    setMembershipKind(e.target.checked ? "HEAD_OFFICE" : "BRANCH_STAFF");
                  }}
                />
                <span>
                  <strong>Головной офис</strong>
                  <small>Офисные задачи, без автоматического доступа к магазинам</small>
                </span>
              </label>
            </div>
          ) : (
            <div className={styles.locationChoice}>
              {editableBranches.map((b) => (
                <div key={b.id} className={styles.locationRow}>
                  <label className={styles.locationLabel}>
                    <input type="checkbox" checked disabled readOnly />
                    <span>
                      <strong>{b.name}</strong>
                      <small>{b.city}</small>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          )}
          {(isOrgOwner || editableBranches.length > 0) ? (
            <label className={formStyles.checkRow}>
              <input
                type="checkbox"
                checked={permissionsMixed}
                onChange={(e) => {
                  setDirty(true);
                  const on = e.target.checked;
                  setPermissionsMixed(on);
                  if (on) {
                    const map: Record<string, ProfIPermissionFlags> = { ...branchPermissions };
                    for (const id of selected) {
                      if (!map[id]) map[id] = normalizePermissionFlags(defaultPermissions);
                    }
                    setBranchPermissions(map);
                  }
                }}
              />
              Разные права по подразделениям
            </label>
          ) : null}
          <p className={styles.proposal}>
            Офис не открывает данные всей сети. Для расчётов и выплат по магазинам отметьте
            соответствующие филиалы, даже если сотрудник работает в головном офисе.
          </p>
        </>
      );
    }

    return (
      <>
        <h3>{fullName.trim() || member.displayName}</h3>
        <p className={formStyles.hint}>
          Должность: <strong>{position.trim() || "Сотрудник"}</strong>. Название не влияет на
          разрешения.
        </p>
        {membershipKind === "HEAD_OFFICE" ? (
          <p className={formStyles.hint}>Головной офис · без автоматического доступа ко всем филиалам</p>
        ) : null}
        {summaryBranchIds.map((branchId) => {
          const branch = branchOptions.find((b) => b.id === branchId);
          if (!branch) return null;
          const flags = normalizePermissionFlags(
            permissionsMixed
              ? (branchPermissions[branchId] ?? defaultPermissions)
              : defaultPermissions,
          );
          const labels = permissionLabelsFromFlags(flags);
          return (
            <details
              key={branchId}
              className={styles.scopeSummary}
              open={labels.some((l) => l.includes("Выплата"))}
            >
              <summary>
                {branch.name} <small>{labels.length} разрешений</small>
              </summary>
              <ul>
                {labels.length ? labels.map((l) => <li key={l}>{l}</li>) : <li>Нет разрешённых операций</li>}
              </ul>
            </details>
          );
        })}
        {partialSoleManagerBranches.length > 0 ? (
          <p className={formStyles.bannerWarn} data-testid="team-member-partial-sole-manager-warn">
            Филиал{partialSoleManagerBranches.length > 1 ? "ы" : ""}{" "}
            {partialSoleManagerBranches.map((b) => b.branchName).join(", ")} останется без управляющего
            после сохранения. Вы как владелец сохраните доступ.
          </p>
        ) : null}
        <label className={formStyles.checkRow}>
          <input
            type="checkbox"
            data-testid="team-member-confirm"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          Я проверил должность, подразделения и права, включая разрешения на выплаты
        </label>
      </>
    );
  }

  return (
    <div
      className={styles.wizardBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Настроить доступ"
    >
      <form className={styles.wizardPanel} onSubmit={(e) => void submitSave(e)}>
        <div className={styles.wizardHead}>
          <div>
            <h3>Настроить доступ</h3>
            <p className={formStyles.hint}>
              {member.fullName || member.displayName} · {member.publicId}
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving || revoking}>
            Закрыть
          </Button>
        </div>
        <div className={styles.wizardSteps}>
          {STEP_LABELS.map((label, i) => (
            <div
              key={label}
              data-testid={`team-member-wizard-step-${i + 1}`}
              data-active={step === i + 1 ? "true" : "false"}
              className={`${styles.wizardStep} ${step === i + 1 ? styles.wizardStepActive : ""}`}
            >
              <span className={styles.stepBadge}>{i + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className={styles.wizardBody}>{renderStepBody()}</div>
        <div className={styles.wizardFoot}>
          {error ? (
            <p
              ref={actionErrorRef}
              tabIndex={-1}
              className={formStyles.error}
              role="alert"
              aria-live="assertive"
              data-testid="team-member-action-error"
            >
              {error}
            </p>
          ) : (
            <small>Изменения сохраняются только после проверки на шаге 3.</small>
          )}
          <div className={styles.wizardFootActions}>
            {isOrgOwner ? (
              <Button
                type="button"
                variant="secondary"
                data-testid="team-member-remove-from-team"
                disabled={saving || revoking}
                onClick={() => setRemoveConfirmOpen(true)}
              >
                {revoking ? "…" : "Удалить из команды"}
              </Button>
            ) : null}
            {step > 1 ? (
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                Назад
              </Button>
            ) : null}
            {step < 3 ? (
              <Button
                type="button"
                disabled={!stepValid}
                onClick={() => setStep(step + 1)}
                data-testid="team-member-wizard-next"
              >
                Далее
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!confirmed || !dirty || saving || revoking}
                data-testid="team-member-save"
              >
                {saving ? "Сохраняем…" : "Сохранить"}
              </Button>
            )}
          </div>
        </div>
      </form>
      {removeConfirmOpen && removeCopy ? (
        <div className={styles.removeConfirmBackdrop} role="dialog" aria-modal="true">
          <div className={styles.removeConfirmPanel}>
            <h3>{removeCopy.title}</h3>
            <p className={formStyles.hint}>{removeCopy.body}</p>
            <div className={styles.wizardFootActions}>
              <Button type="button" variant="secondary" onClick={() => setRemoveConfirmOpen(false)}>
                Отмена
              </Button>
              <Button
                type="button"
                data-testid="team-member-remove-confirm"
                disabled={revoking}
                onClick={() => void removeFromTeamConfirmed()}
              >
                Удалить из команды
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
