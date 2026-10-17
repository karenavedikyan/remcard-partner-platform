"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  IconChevronDown,
  IconLogOut,
  IconMonitorOff,
} from "@/components/account-session/AccountSessionIcons";
import { LogoutAllConfirmDialog } from "@/components/account-session/LogoutAllConfirmDialog";
import { useAccountSessionExit } from "@/components/account-session/useAccountSessionExit";
import styles from "@/components/account-session/account-session.module.css";

function initialsFromName(name: string): string {
  return String(name || "Партнёр")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

type AccountSessionMenuProps = {
  displayName: string;
  roleLabel: string;
};

export function AccountSessionMenu({ displayName, roleLabel }: AccountSessionMenuProps) {
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const {
    pending,
    error,
    confirmAllOpen,
    exitCurrent,
    openConfirmAll,
    closeConfirmAll,
    confirmExitAll,
    clearError,
  } = useAccountSessionExit();

  const closeMenu = useCallback(
    (restoreFocus = false) => {
      setOpen(false);
      if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      const root = triggerRef.current?.closest(`.${styles.accountRoot}`);
      if (!root?.contains(event.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [closeMenu, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [closeMenu, open]);

  const initials = initialsFromName(displayName);

  return (
    <>
      <div className={styles.accountRoot} data-session-account>
        {error ? (
          <div className={styles.menuError} role="alert" data-testid="account-menu-error">
            <span>{error}</span>
            <button type="button" className={styles.menuErrorRetry} onClick={() => void exitCurrent()}>
              Повторить
            </button>
            <button type="button" className={styles.menuErrorDismiss} onClick={clearError}>
              Закрыть
            </button>
          </div>
        ) : null}
        <button
          type="button"
          ref={triggerRef}
          className={styles.trigger}
          data-testid="account-menu-trigger"
          aria-label="Меню аккаунта"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.avatar} aria-hidden>
            {initials}
          </span>
          <span className={styles.triggerCaption}>
            <strong>{displayName}</strong>
            <small>{roleLabel}</small>
          </span>
          <IconChevronDown className={styles.chevron} />
        </button>
        {open ? (
          <div
            className={styles.menu}
            id={menuId}
            role="menu"
            aria-label="Действия аккаунта"
            data-testid="account-session-menu"
          >
            <div className={styles.menuIdentity} role="presentation">
              <strong>{displayName}</strong>
              <span>{roleLabel}</span>
            </div>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              data-testid="account-logout"
              disabled={Boolean(pending)}
              onClick={() => {
                closeMenu(true);
                void exitCurrent();
              }}
            >
              <IconLogOut className={styles.menuItemIcon} width={20} height={20} />
              <span className={styles.menuItemText}>
                <strong>Выйти</strong>
                <small>Только на этом устройстве</small>
              </span>
            </button>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              data-testid="account-logout-all"
              disabled={Boolean(pending)}
              onClick={() => {
                closeMenu(true);
                openConfirmAll(triggerRef.current);
              }}
            >
              <IconMonitorOff className={styles.menuItemIcon} width={20} height={20} />
              <span className={styles.menuItemText}>
                <strong>Выйти на всех устройствах</strong>
                <small>Включая это устройство</small>
              </span>
            </button>
          </div>
        ) : null}
      </div>
      <LogoutAllConfirmDialog
        open={confirmAllOpen}
        pending={pending === "all"}
        error={error}
        onCancel={closeConfirmAll}
        onConfirm={() => void confirmExitAll()}
      />
    </>
  );
}
