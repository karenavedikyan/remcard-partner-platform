"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { EmployeesOverviewResponse } from "@/lib/employees-overview-types";
import {
  actionIdsFromFlags,
  flagsFromActionIds,
  normalizePermissionFlags,
  PROF_I_TEMPLATE_PRESETS,
  permissionLabelsFromFlags,
  type OrganizationPermissionTemplate,
  type ProfIPermissionFlags,
} from "@/lib/prof-i-permissions";
import { effectiveActionIdsForBranch } from "@/lib/prof-i-member-permissions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/FormField";
import { ProfileTeamPermissionMatrix } from "./ProfileTeamPermissionMatrix";
import styles from "./ProfileTeamPermissions.module.css";
import formStyles from "./ProfileEditor.module.css";

export type InviteWizardScope = "ORGANIZATION" | "BRANCH" | "SOLO_PARTNER";

type Props = {
  overview: EmployeesOverviewResponse;
  initialScope?: InviteWizardScope;
  onClose: () => void;
  onCreated: (url: string) => void;
};

function defaultDraft(): {
  step: number;
  fullName: string;
  position: string;
  templateKey: string;
  defaultPermissions: ProfIPermissionFlags;
  branchPermissions: Record<string, ProfIPermissionFlags>;
  permissionsMixed: boolean;
  selectedBranchIds: Set<string>;
  selectAllBranches: boolean;
  membershipKind: "BRANCH_STAFF" | "HEAD_OFFICE";
  scope: InviteWizardScope;
  branchId: string;
  confirmed: boolean;
  scopeEditorBranchId: string | null;
} {
  return {
    step: 1,
    fullName: "",
    position: "",
    templateKey: "sales",
    defaultPermissions: flagsFromActionIds(PROF_I_TEMPLATE_PRESETS.sales.actionIds),
    branchPermissions: {},
    permissionsMixed: false,
    selectedBranchIds: new Set<string>(),
    selectAllBranches: false,
    membershipKind: "BRANCH_STAFF",
    scope: "ORGANIZATION",
    branchId: "",
    confirmed: false,
    scopeEditorBranchId: null,
  };
}

export function ProfileTeamInviteWizard({ overview, initialScope, onClose, onCreated }: Props) {
  const [draft, setDraft] = useState(() => {
    const base = defaultDraft();
    if (initialScope) base.scope = initialScope;
    if (overview.branches[0]?.id) base.branchId = overview.branches[0].id;
    return base;
  });
  const [orgTemplates, setOrgTemplates] = useState<OrganizationPermissionTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [templateFeedback, setTemplateFeedback] = useState("");
  const [confirmApplyTemplate, setConfirmApplyTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadTemplates = useCallback(async () => {
    if (overview.myRole !== "ORG_OWNER") return;
    try {
      const data = await remcardFetch<{ templates: OrganizationPermissionTemplate[] }>(
        `/api/pro/organization/permission-templates?organizationId=${encodeURIComponent(overview.organization.id)}`,
      );
      setOrgTemplates(data.templates ?? []);
    } catch {
      setOrgTemplates([]);
    }
  }, [overview.myRole, overview.organization.id]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const branchList = overview.branches;

  function patch(partial: Partial<typeof draft>) {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      if (!("confirmed" in partial)) {
        next.confirmed = false;
      }
      return next;
    });
  }

  function effectiveFlags(branchId: string): ProfIPermissionFlags {
    const ids = effectiveActionIdsForBranch({
      permissionsMixed: draft.permissionsMixed,
      defaultPermissions: draft.defaultPermissions,
      branchPermissions: draft.branchPermissions,
      branchId,
    });
    return flagsFromActionIds(ids);
  }

  function branchActionIds(branchId: string) {
    return effectiveActionIdsForBranch({
      permissionsMixed: draft.permissionsMixed,
      defaultPermissions: draft.defaultPermissions,
      branchPermissions: draft.branchPermissions,
      branchId,
    });
  }

  const templateOptions = useMemo(() => {
    const builtIn = Object.entries(PROF_I_TEMPLATE_PRESETS).map(([id, t]) => ({
      id,
      label: t.name,
    }));
    const org = orgTemplates.map((t) => ({ id: `org:${t.id}`, label: t.name }));
    return [...builtIn, ...org];
  }, [orgTemplates]);

  function applyTemplateKey(key: string) {
    if (key.startsWith("org:")) {
      const id = key.slice(4);
      const row = orgTemplates.find((t) => t.id === id);
      if (row) patch({ defaultPermissions: normalizePermissionFlags(row.permissions), templateKey: key });
      return;
    }
    const preset = PROF_I_TEMPLATE_PRESETS[key];
    if (preset) {
      patch({
        templateKey: key,
        defaultPermissions: flagsFromActionIds(preset.actionIds),
      });
    }
  }

  async function saveOrgTemplate() {
    setTemplateFeedback("");
    const name = templateName.trim();
    if (!name) {
      setTemplateFeedback("Укажите название шаблона.");
      return;
    }
    try {
      await remcardFetch("/api/pro/organization/permission-templates", {
        method: "POST",
        body: {
          organizationId: overview.organization.id,
          name,
          permissions: draft.defaultPermissions,
        },
      });
      setTemplateFeedback("Шаблон сохранён. Права уже добавленных сотрудников не изменились.");
      await loadTemplates();
    } catch (caught) {
      setTemplateFeedback(
        caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить шаблон",
      );
    }
  }

  function toggleBranch(branchId: string, on: boolean) {
    setDraft((prev) => {
      const next = new Set(prev.selectedBranchIds);
      if (on) next.add(branchId);
      else {
        next.delete(branchId);
        const bp = { ...prev.branchPermissions };
        delete bp[branchId];
        return { ...prev, selectedBranchIds: next, branchPermissions: bp, confirmed: false };
      }
      return { ...prev, selectedBranchIds: next, confirmed: false };
    });
  }

  function toggleAllBranches(on: boolean) {
    patch({
      selectAllBranches: on,
      selectedBranchIds: on ? new Set(branchList.map((b) => b.id)) : new Set(),
    });
  }

  async function submitInvite(event: FormEvent) {
    event.preventDefault();
    if (!draft.confirmed) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        scope: draft.scope,
        role: "SELLER",
        position: draft.position.trim() || undefined,
        fullName: draft.fullName.trim() || undefined,
        defaultPermissions: draft.defaultPermissions,
        permissionsMixed: draft.permissionsMixed,
      };
      if (draft.permissionsMixed && draft.selectedBranchIds.size > 0) {
        const branchPermissions: Record<string, ProfIPermissionFlags> = {};
        for (const id of draft.selectedBranchIds) {
          branchPermissions[id] =
            draft.branchPermissions[id] ?? normalizePermissionFlags(draft.defaultPermissions);
        }
        body.branchPermissions = branchPermissions;
      }
      if (draft.scope === "BRANCH") {
        body.branchId = draft.branchId;
      } else if (draft.scope === "ORGANIZATION") {
        body.membershipKind = draft.membershipKind;
        body.selectAllCurrentBranches = draft.selectAllBranches;
        if (!draft.selectAllBranches) {
          body.branchIds = [...draft.selectedBranchIds];
        }
      }
      const result = await remcardFetch<{ invite: { url: string } }>("/api/pro/invites", {
        method: "POST",
        body,
      });
      onCreated(result.invite.url);
      onClose();
    } catch (caught) {
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось создать приглашение");
    } finally {
      setSaving(false);
    }
  }

  const scopeEditorBranch = draft.scopeEditorBranchId
    ? branchList.find((b) => b.id === draft.scopeEditorBranchId)
    : null;

  if (scopeEditorBranch) {
    const scopeFlags =
      draft.branchPermissions[scopeEditorBranch.id] ?? normalizePermissionFlags(draft.defaultPermissions);
    return (
      <div className={styles.wizardBackdrop} role="dialog" aria-modal="true">
        <div className={styles.wizardPanel}>
          <div className={styles.wizardHead}>
            <div>
              <h3>Права в подразделении</h3>
              <p className={formStyles.hint}>{scopeEditorBranch.name}</p>
            </div>
            <Button type="button" variant="secondary" onClick={() => patch({ scopeEditorBranchId: null })}>
              Закрыть
            </Button>
          </div>
          <div className={styles.wizardBody}>
            <p className={formStyles.hint}>
              Должность: {draft.position.trim() || "Не указана"}. Изменения только для этого филиала.
            </p>
            <ProfileTeamPermissionMatrix
              value={scopeFlags}
              onChange={(next) =>
                patch({
                  branchPermissions: {
                    ...draft.branchPermissions,
                    [scopeEditorBranch.id]: next,
                  },
                  permissionsMixed: true,
                })
              }
            />
          </div>
          <div className={styles.wizardFoot}>
            <span />
            <div className={styles.wizardFootActions}>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  patch({
                    branchPermissions: {
                      ...draft.branchPermissions,
                      [scopeEditorBranch.id]: normalizePermissionFlags(draft.defaultPermissions),
                    },
                  })
                }
              >
                Как в общем наборе
              </Button>
              <Button type="button" onClick={() => patch({ scopeEditorBranchId: null })}>
                Готово
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepBody =
    draft.step === 1 ? (
      <>
        <label className={formStyles.checkRow}>
          Тип приглашения
          <select
            value={draft.scope}
            onChange={(e) => patch({ scope: e.target.value as InviteWizardScope })}
            data-testid="team-invite-scope"
          >
            {overview.myRole === "ORG_OWNER" ? (
              <option value="ORGANIZATION">Организация (несколько филиалов / головной офис)</option>
            ) : null}
            <option value="BRANCH">На один филиал</option>
            {(overview.myRole === "SOLO_PARTNER" ||
              (overview.myRole === "ORG_OWNER" && overview.branches.length === 0)) && (
              <option value="SOLO_PARTNER">Команда партнёра (SOLO)</option>
            )}
          </select>
        </label>
        <div className={styles.identityGrid}>
          <TextField
            label="Имя сотрудника"
            hint="Необязательно"
            value={draft.fullName}
            onChange={(e) => patch({ fullName: e.target.value })}
          />
          <TextField
            label="Должность в вашей организации"
            hint="Любое привычное название"
            value={draft.position}
            onChange={(e) => patch({ position: e.target.value })}
            placeholder="Например, старший продавец"
          />
        </div>
        <div className={styles.templateBar}>
          <label className={formStyles.checkRow}>
            Быстрый старт
            <select
              value={draft.templateKey}
              onChange={(e) => patch({ templateKey: e.target.value })}
              data-testid="team-template-select"
            >
              {templateOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" onClick={() => setConfirmApplyTemplate(true)}>
            Применить набор
          </Button>
        </div>
        <p className={formStyles.hint}>
          Шаблон заменит общий набор галочек, но не название должности. Индивидуальные настройки филиалов
          сохранятся.
        </p>
        <div className={styles.editorGrid}>
          <ProfileTeamPermissionMatrix
            value={draft.defaultPermissions}
            onChange={(next) => patch({ defaultPermissions: next })}
          />
          <aside className={styles.asideNote}>
            <strong>Начисление ≠ выплата</strong>
            <p className={formStyles.hint}>
              Начисление сохраняется в истории; выплата добавляется отдельной операцией.
            </p>
            <p className={formStyles.hint}>
              Название должности не выдаёт права. Управление владельцем и удаление организации не входят в
              наборы.
            </p>
          </aside>
        </div>
        {overview.myRole === "ORG_OWNER" ? (
          <details className={styles.saveTemplate}>
            <summary>Сохранить этот набор для следующих приглашений</summary>
            <p className={formStyles.hint}>
              Создаётся копия. Права уже добавленных сотрудников не изменятся.
            </p>
            <TextField
              label="Название шаблона"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder={draft.position || "Например, менеджер ОПТОВИК"}
            />
            <Button type="button" variant="secondary" onClick={() => void saveOrgTemplate()}>
              Сохранить шаблон
            </Button>
            {templateFeedback ? (
              <p className={formStyles.hint} role="status">
                {templateFeedback}
              </p>
            ) : null}
          </details>
        ) : null}
      </>
    ) : draft.step === 2 ? (
      <>
        <h3>Где действуют выбранные права?</h3>
        <p className={formStyles.hint}>
          Выберите филиалы и, при необходимости, головной офис. Новые филиалы автоматически не добавляются.
        </p>
        {draft.scope === "ORGANIZATION" ? (
          <label className={formStyles.checkRow}>
            Принадлежность
            <select
              value={draft.membershipKind}
              onChange={(e) =>
                patch({ membershipKind: e.target.value as "BRANCH_STAFF" | "HEAD_OFFICE" })
              }
            >
              <option value="BRANCH_STAFF">Сотрудник филиалов</option>
              <option value="HEAD_OFFICE">Головной офис</option>
            </select>
          </label>
        ) : null}
        {draft.scope === "BRANCH" && branchList.length ? (
          <label className={formStyles.checkRow}>
            Филиал
            <select value={draft.branchId} onChange={(e) => patch({ branchId: e.target.value })}>
              {branchList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} — {b.city}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {draft.scope === "ORGANIZATION" && branchList.length ? (
          <div className={styles.locationChoice}>
            <label className={`${styles.locationLabel} ${styles.locationAll}`}>
              <input
                type="checkbox"
                checked={draft.selectAllBranches}
                onChange={(e) => toggleAllBranches(e.target.checked)}
                data-testid="team-invite-all-branches"
              />
              <span>
                <strong>Все текущие филиалы · {branchList.length}</strong>
                <small>Только существующие на момент приглашения</small>
              </span>
            </label>
            {!draft.selectAllBranches
              ? branchList.map((b) => (
                  <div key={b.id} className={styles.locationRow}>
                    <label className={styles.locationLabel}>
                      <input
                        type="checkbox"
                        data-testid={`team-invite-branch-${b.id}`}
                        checked={draft.selectedBranchIds.has(b.id)}
                        onChange={(e) => toggleBranch(b.id, e.target.checked)}
                      />
                      <span>
                        <strong>{b.name}</strong>
                        <small>{b.city}</small>
                        {draft.selectedBranchIds.has(b.id) ? (
                          <small>
                            {branchActionIds(b.id).length} разрешений
                            {branchActionIds(b.id).includes("cash") ||
                            branchActionIds(b.id).includes("transfer")
                              ? " · выплаты разрешены"
                              : ""}
                          </small>
                        ) : null}
                      </span>
                    </label>
                    {draft.permissionsMixed && draft.selectedBranchIds.has(b.id) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => patch({ scopeEditorBranchId: b.id })}
                      >
                        Настроить права
                      </Button>
                    ) : null}
                  </div>
                ))
              : null}
          </div>
        ) : null}
        {draft.scope === "ORGANIZATION" && draft.membershipKind === "HEAD_OFFICE" ? (
          <div className={`${styles.locationChoice} ${styles.officeBlock}`}>
            <label className={styles.locationLabel}>
              <input type="checkbox" checked readOnly aria-readonly />
              <span>
                <strong>Головной офис</strong>
                <small>Офисные задачи, без автоматического доступа к магазинам</small>
              </span>
            </label>
          </div>
        ) : null}
        {draft.scope === "ORGANIZATION" && branchList.length ? (
          <label className={formStyles.checkRow}>
            <input
              type="checkbox"
              checked={draft.permissionsMixed}
              onChange={(e) => {
                const on = e.target.checked;
                if (on) {
                  const branchPermissions: Record<string, ProfIPermissionFlags> = {};
                  for (const id of draft.selectedBranchIds) {
                    branchPermissions[id] = normalizePermissionPermissions(draft, id);
                  }
                  patch({ permissionsMixed: true, branchPermissions });
                } else {
                  patch({ permissionsMixed: false, branchPermissions: {} });
                }
              }}
            />
            Разные права по подразделениям
          </label>
        ) : null}
        <p className={styles.proposal}>
          Офис не открывает данные всей сети. Для расчётов и выплат по магазинам отметьте соответствующие
          филиалы, даже если сотрудник работает в головном офисе.
        </p>
      </>
    ) : (
      <>
        <h3>{draft.fullName.trim() || "Новый сотрудник"}</h3>
        <p className={formStyles.hint}>
          Должность: <strong>{draft.position.trim() || "Сотрудник"}</strong>. Название не влияет на
          разрешения.
        </p>
        {(draft.scope === "ORGANIZATION"
          ? draft.selectAllBranches
            ? branchList.map((b) => b.id)
            : [...draft.selectedBranchIds]
          : draft.scope === "BRANCH"
            ? [draft.branchId]
            : []
        ).map((branchId) => {
          const branch = branchList.find((b) => b.id === branchId);
          if (!branch) return null;
          const labels = permissionLabelsFromFlags(effectiveFlags(branchId));
          return (
            <details key={branchId} className={styles.scopeSummary} open={labels.some((l) => l.includes("Выплата"))}>
              <summary>
                {branch.name} <small>{labels.length} разрешений</small>
              </summary>
              <ul>
                {labels.length ? labels.map((l) => <li key={l}>{l}</li>) : <li>Нет разрешённых операций</li>}
              </ul>
            </details>
          );
        })}
        <label className={formStyles.checkRow}>
          <input
            type="checkbox"
            data-testid="team-invite-confirm"
            checked={draft.confirmed}
            onChange={(e) => patch({ confirmed: e.target.checked })}
          />
          Я проверил должность, подразделения и права, включая разрешения на выплаты
        </label>
      </>
    );

  const stepValid =
    draft.step === 1
      ? true
      : draft.step === 2
        ? draft.scope === "SOLO_PARTNER" ||
          draft.scope === "BRANCH"
          ? Boolean(draft.branchId)
          : draft.membershipKind === "HEAD_OFFICE" ||
            draft.selectAllBranches ||
            draft.selectedBranchIds.size > 0 ||
            branchList.length === 0
        : draft.confirmed;

  return (
    <div className={styles.wizardBackdrop} role="dialog" aria-modal="true" aria-label="Пригласить сотрудника">
      <form className={styles.wizardPanel} onSubmit={(e) => void submitInvite(e)}>
        <div className={styles.wizardHead}>
          <div>
            <h3>Пригласить сотрудника</h3>
            <p className={formStyles.hint}>Должность, права и подразделения настраиваются отдельно</p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </div>
        <div className={styles.wizardSteps}>
          {["Должность и права", "Подразделения", "Проверка"].map((label, i) => (
            <div
              key={label}
              className={`${styles.wizardStep} ${draft.step === i + 1 ? styles.wizardStepActive : ""}`}
            >
              <span className={styles.stepBadge}>{i + 1}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className={styles.wizardBody}>
          {error ? (
            <p className={formStyles.error} role="alert">
              {error}
            </p>
          ) : null}
          {stepBody}
        </div>
        <div className={styles.wizardFoot}>
          <small>Все права можно настроить независимо от должности.</small>
          <div className={styles.wizardFootActions}>
            {draft.step > 1 ? (
              <Button type="button" variant="secondary" onClick={() => patch({ step: draft.step - 1 })}>
                Назад
              </Button>
            ) : null}
            {draft.step < 3 ? (
              <Button
                type="button"
                disabled={!stepValid}
                onClick={() => patch({ step: draft.step + 1 })}
                data-testid="team-wizard-next"
              >
                Далее
              </Button>
            ) : (
              <Button type="submit" disabled={!draft.confirmed || saving} data-testid="team-wizard-submit">
                {saving ? "Создаём…" : "Создать ссылку-приглашение"}
              </Button>
            )}
          </div>
        </div>
      </form>
      {confirmApplyTemplate ? (
        <div className={styles.wizardBackdrop} style={{ zIndex: 45 }}>
          <div className={styles.wizardPanel} style={{ maxWidth: 480 }}>
            <div className={styles.wizardBody}>
              <p>Применить выбранный шаблон? Текущие общие галочки будут заменены.</p>
            </div>
            <div className={styles.wizardFoot}>
              <span />
              <div className={styles.wizardFootActions}>
                <Button type="button" variant="secondary" onClick={() => setConfirmApplyTemplate(false)}>
                  Отмена
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    applyTemplateKey(draft.templateKey);
                    setConfirmApplyTemplate(false);
                  }}
                >
                  Применить
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizePermissionPermissions(
  draft: { defaultPermissions: ProfIPermissionFlags; branchPermissions: Record<string, ProfIPermissionFlags> },
  branchId: string,
): ProfIPermissionFlags {
  return normalizePermissionFlags(draft.branchPermissions[branchId] ?? draft.defaultPermissions);
}
