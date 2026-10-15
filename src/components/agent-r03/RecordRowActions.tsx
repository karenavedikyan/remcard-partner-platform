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
};

export function RecordRowActions({ actions, ariaLabel }: RecordRowActionsProps) {
  return (
    <div className={styles.rowActions} role="toolbar" aria-label={ariaLabel}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={styles.iconBtn}
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
