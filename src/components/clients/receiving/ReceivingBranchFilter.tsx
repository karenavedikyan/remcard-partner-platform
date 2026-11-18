"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { IconChevronDown } from "@/components/account-session/AccountSessionIcons";
import { formatStaffBranchLine } from "@/lib/profile-staff-cabinet";
import {
  RECEIVING_ALL_BRANCHES_BUTTON_LABEL,
  RECEIVING_ALL_BRANCHES_MENU_LABEL,
  receivingBranchLabel,
  type ReceivingBranchSelection,
  type ReceivingStaffBranch,
} from "./receiving-branch-scope";
import styles from "./receiving-branch-filter.module.css";

type Props = {
  branches: readonly ReceivingStaffBranch[];
  selection: ReceivingBranchSelection;
  /** Working branch the server applies by default; only marked in the menu, never changed here. */
  currentBranchId: string | null;
  disabled?: boolean;
  /** Title-row slot; without it the control renders inline above the list. */
  slot?: HTMLElement | null;
  onSelectAll: () => void;
  onSelectBranch: (branchId: string) => void;
};

/**
 * Compact branch filter of an organization employee with several allowed branches. Options are only the
 * branches the server put into his own `/api/pro/context`; choosing one never changes the working branch.
 */
export function ReceivingBranchFilter({
  branches,
  selection,
  currentBranchId,
  disabled,
  slot,
  onSelectAll,
  onSelectBranch,
}: Props) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]');
    const checked = menuRef.current?.querySelector<HTMLElement>('[aria-checked="true"]');
    (checked ?? items?.[0])?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [close, open]);

  useEffect(() => {
    if (disabled && open) setOpen(false);
  }, [disabled, open]);

  const selectedBranch =
    selection.kind === "branch" ? branches.find((b) => b.id === selection.branchId) : undefined;
  const label =
    selection.kind === "branch" && selectedBranch
      ? receivingBranchLabel(selectedBranch, branches)
      : RECEIVING_ALL_BRANCHES_BUTTON_LABEL;

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === "Tab") {
      close(false);
      return;
    }
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = (index + 1) % items.length;
    else if (event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next === null) return;
    event.preventDefault();
    items[next]!.focus({ preventScroll: true });
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      setOpen(true);
    }
  };

  const choose = (apply: () => void) => {
    apply();
    close(true);
  };

  const control = (
    <div className={styles.root} ref={rootRef} data-testid="ca-receiving-branch-filter">
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        data-testid="ca-receiving-branch-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Фильтр по филиалу: ${label}`}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={styles.triggerLabel}>{label}</span>
        <IconChevronDown className={styles.chevron} aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          className={styles.menu}
          role="menu"
          aria-label="Показать клиентов"
          data-testid="ca-receiving-branch-menu"
          onKeyDown={onMenuKeyDown}
        >
          <div className={styles.menuTitle} role="presentation">
            Показать клиентов:
          </div>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={selection.kind === "all"}
            className={styles.item}
            data-testid="ca-receiving-branch-option-all"
            onClick={() => choose(onSelectAll)}
          >
            <span className={styles.itemText}>{RECEIVING_ALL_BRANCHES_MENU_LABEL}</span>
            {selection.kind === "all" ? <span className={styles.check} aria-hidden="true">✓</span> : null}
          </button>
          {branches.map((branch) => {
            const checked = selection.kind === "branch" && selection.branchId === branch.id;
            return (
              <button
                key={branch.id}
                type="button"
                role="menuitemradio"
                aria-checked={checked}
                className={styles.item}
                data-testid={`ca-receiving-branch-option-${branch.id}`}
                title={formatStaffBranchLine(branch)}
                onClick={() => choose(() => onSelectBranch(branch.id))}
              >
                <span className={styles.itemText}>{receivingBranchLabel(branch, branches)}</span>
                {branch.id === currentBranchId ? <span className={styles.tag}>текущий</span> : null}
                {checked ? <span className={styles.check} aria-hidden="true">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  if (slot) return createPortal(control, slot);
  return <div className={styles.inlineRow}>{control}</div>;
}
