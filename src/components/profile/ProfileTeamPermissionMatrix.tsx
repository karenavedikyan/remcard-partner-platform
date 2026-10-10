"use client";

import {
  actionIdsFromFlags,
  flagsFromActionIds,
  toggleActionInSet,
  type ProfIActionId,
  type ProfIPermissionFlags,
} from "@/lib/prof-i-permissions";
import { PROF_I_PERMISSION_GROUPS, PROF_I_PERMISSION_ROWS } from "@/lib/prof-i-team-ui";
import styles from "./ProfileTeamPermissions.module.css";

type Props = {
  value: ProfIPermissionFlags;
  onChange: (next: ProfIPermissionFlags) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function ProfileTeamPermissionMatrix({ value, onChange, disabled, idPrefix = "perm" }: Props) {
  const actionIds = actionIdsFromFlags(value);

  function setActionIds(next: ProfIActionId[]) {
    onChange(flagsFromActionIds(next));
  }

  return (
    <div data-testid="team-permission-matrix">
      {PROF_I_PERMISSION_GROUPS.map((group) => (
        <section key={group} className={styles.permGroup}>
          <h4>{group}</h4>
          {PROF_I_PERMISSION_ROWS.filter((p) => p.group === group).map((perm) => {
            const checked = actionIds.includes(perm.id);
            const inputId = `${idPrefix}-${perm.id}`;
            return (
              <label
                key={perm.id}
                className={`${styles.permRow} ${perm.sensitive ? styles.permRowSensitive : ""}`}
                htmlFor={inputId}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  data-testid={`team-perm-${perm.id}`}
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) =>
                    setActionIds(toggleActionInSet(actionIds, perm.id, e.target.checked))
                  }
                />
                <span>
                  <strong>
                    {perm.name}
                    {perm.sensitive ? <span className={styles.sensitiveTag}>Особое право</span> : null}
                  </strong>
                  <small>{perm.hint}</small>
                </span>
              </label>
            );
          })}
        </section>
      ))}
      <p className={styles.proposal}>
        Для выплаты автоматически нужен просмотр взаиморасчётов. Отключение просмотра также отключает оба
        права выплаты.
      </p>
    </div>
  );
}
