"use client";

import { rowActionIcon } from "./RowActionIcons";
import styles from "./agent-r03.module.css";

export type RecordRowAction = {
  id: string;
  label: string;
  title?: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => void;
};

type RecordRowActionsProps = {
  actions: RecordRowAction[];
  ariaLabel: string;
  /** Reference card toolbar: actions aligned end with compact icon buttons. */
  variant?: "default" | "cardToolbar" | "listRow" | "mobileFooter";
};

export function RecordRowActions({ actions, ariaLabel, variant = "default" }: RecordRowActionsProps) {
  const toolbarClass =
    variant === "cardToolbar"
      ? `${styles.rowActions} ${styles.recordActionToolbarEnd}`
      : variant === "mobileFooter"
        ? `${styles.rowActions} ${styles.mobileRecordFooterActions}`
      : variant === "listRow"
        ? `${styles.rowActions} ${styles.certificateListActions}`
        : styles.rowActions;

  const btnClass = (id: string) => {
    if (variant === "listRow") {
      return `${styles.certificateListAction} ${id === "delete" ? styles.certificateListActionDanger : ""}`;
    }
    if (variant === "cardToolbar" || variant === "mobileFooter") {
      return `${styles.certificateListAction} ${id === "delete" ? styles.certificateListActionDanger : ""}`;
    }
    return `${styles.iconBtn} ${id === "delete" ? styles.iconBtnDanger : ""}`;
  };

  return (
    <div className={toolbarClass} role="toolbar" aria-label={ariaLabel}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={btnClass(action.id)}
          aria-label={action.label}
          title={action.disabled ? action.disabledReason ?? action.label : action.title ?? action.label}
          disabled={action.disabled}
          onClick={(event) => {
            event.stopPropagation();
            if (!action.disabled) action.onClick();
          }}
        >
          <ActionGlyph id={action.id} />
        </button>
      ))}
    </div>
  );
}

function ActionGlyph({ id }: { id: string }) {
  const Icon = rowActionIcon(id);
  if (Icon) return <Icon />;
  return <span aria-hidden>•</span>;
}
