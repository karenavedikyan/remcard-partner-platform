"use client";

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
  if (id === "share") return <span aria-hidden>⎘</span>;
  if (id === "rename") return <span aria-hidden>✎</span>;
  if (id === "archive") return <span aria-hidden>▭</span>;
  if (id === "restore") return <span aria-hidden>↺</span>;
  if (id === "delete") return <span aria-hidden>🗑</span>;
  return <span aria-hidden>•</span>;
}
