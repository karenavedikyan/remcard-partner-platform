"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actionIdsFromFlags,
  PROF_I_TEMPLATE_PRESETS,
  type OrganizationPermissionTemplate,
  type ProfIActionId,
} from "@/lib/prof-i-permissions";
import { remcardFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { TeamBonusIllustration } from "./TeamBonusIllustration";
import styles from "./ProfileTeamSection.module.css";
import wizardStyles from "./ProfileTeamPermissions.module.css";

const COMPARE_COLUMNS: { id: ProfIActionId; label: string }[] = [
  { id: "scan", label: "Сканирование" },
  { id: "sale", label: "Продажа + начисление" },
  { id: "ledger", label: "Просмотр расчётов" },
  { id: "cash", label: "Наличные" },
  { id: "transfer", label: "Перевод" },
];

const COMPARE_TEMPLATE_KEYS = ["sales", "cashier", "manager", "finance", "payout", "viewer"] as const;

type Props = {
  organizationId: string;
  canLoadOrgTemplates: boolean;
  onClose: () => void;
};

export function ProfileTeamPermissionsHelpDialog({
  organizationId,
  canLoadOrgTemplates,
  onClose,
}: Props) {
  const [orgTemplates, setOrgTemplates] = useState<OrganizationPermissionTemplate[]>([]);

  const loadTemplates = useCallback(async () => {
    if (!canLoadOrgTemplates) return;
    try {
      const data = await remcardFetch<{ templates: OrganizationPermissionTemplate[] }>(
        `/api/pro/organization/permission-templates?organizationId=${encodeURIComponent(organizationId)}`,
      );
      setOrgTemplates(data.templates ?? []);
    } catch {
      setOrgTemplates([]);
    }
  }, [canLoadOrgTemplates, organizationId]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const compareRows = useMemo(() => {
    const builtIn = COMPARE_TEMPLATE_KEYS.map((key) => ({
      key,
      name: PROF_I_TEMPLATE_PRESETS[key].name,
      actionIds: PROF_I_TEMPLATE_PRESETS[key].actionIds,
    }));
    const org = orgTemplates.map((t) => ({
      key: `org:${t.id}`,
      name: t.name,
      actionIds: actionIdsFromFlags(t.permissions),
    }));
    return [...builtIn, ...org];
  }, [orgTemplates]);

  return (
    <div className={wizardStyles.wizardBackdrop} role="dialog" aria-modal="true" aria-labelledby="team-help-title">
      <div className={`${wizardStyles.wizardPanel} ${styles.helpDialog}`}>
        <header className={wizardStyles.wizardHead}>
          <div>
            <h3 id="team-help-title">Должности, права и выплаты</h3>
            <p className={styles.helpIntro}>
              Называйте должности так, как принято у вас. Шаблон помогает начать, а галочки определяют
              фактические права.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={onClose} aria-label="Закрыть">
            ✕
          </Button>
        </header>
        <div className={styles.helpBody}>
          <TeamBonusIllustration />
          <div className={styles.tableScroll} tabIndex={0} aria-label="Сравнение шаблонов прав">
            <table className={styles.permTable}>
              <thead>
                <tr>
                  <th>Шаблон</th>
                  {COMPARE_COLUMNS.map((c) => (
                    <th key={c.id}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map((t) => (
                  <tr key={t.key}>
                    <td>{t.name}</td>
                    {COMPARE_COLUMNS.map((c) => (
                      <td key={c.id} className={t.actionIds.includes(c.id) ? styles.allow : styles.deny}>
                        {t.actionIds.includes(c.id) ? "Да" : "Нет"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.proposal}>
            «Перевод» в таблице — право зафиксировать уже выполненный перевод. Серверная идемпотентность
            BonusPayoutRecord защищает от повторного списания по одной операции; банковская интеграция и
            проверка статуса перевода в банке не реализованы в этом UI.
          </p>
          <div className={styles.rulebox}>
            <div>
              <span className={styles.eyebrow}>Права = что можно делать</span>
              <p>Один набор можно выдать на один магазин, несколько точек или все текущие филиалы.</p>
            </div>
            <div>
              <span className={styles.eyebrow}>Доступ = где можно работать</span>
              <p>
                Головной офис выбирается отдельно. Доступ к офису сам по себе не открывает данные всех
                филиалов.
              </p>
            </div>
          </div>
        </div>
        <footer className={wizardStyles.wizardFoot}>
          <Button type="button" onClick={onClose}>
            Понятно
          </Button>
        </footer>
      </div>
    </div>
  );
}
