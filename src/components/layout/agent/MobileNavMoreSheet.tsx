"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import {
  agentSectionByKey,
  isPathActive,
  type AgentNavSectionKey,
} from "@/lib/agent-nav/sections";
import { AgentNavIcon } from "@/components/layout/agent/AgentNavIcon";
import styles from "./MobileNavMoreSheet.module.css";

type MobileNavMoreSheetProps = {
  open: boolean;
  onClose: () => void;
  pathname: string;
  permittedKeys: AgentNavSectionKey[];
  primaryKeys: AgentNavSectionKey[];
  onOpenCustomize: () => void;
};

export function MobileNavMoreSheet({
  open,
  onClose,
  pathname,
  permittedKeys,
  primaryKeys,
  onOpenCustomize,
}: MobileNavMoreSheetProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const overflowKeys = permittedKeys.filter((key) => !primaryKeys.includes(key));
  const activeOverflow = overflowKeys.some((key) =>
    isPathActive(pathname, agentSectionByKey(key).href),
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id={titleId}>Разделы</h2>
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>
        <nav className={styles.nav} aria-label="Дополнительные разделы">
          {overflowKeys.map((key) => {
            const section = agentSectionByKey(key);
            const active = isPathActive(pathname, section.href);
            return (
              <Link
                key={key}
                href={section.href}
                className={`${styles.link} ${active ? styles.linkActive : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={onClose}
              >
                <AgentNavIcon section={section} />
                {section.label}
              </Link>
            );
          })}
        </nav>
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.customizeBtn}
            onClick={() => {
              onClose();
              onOpenCustomize();
            }}
          >
            Настроить нижнюю панель
          </button>
          {activeOverflow ? (
            <p className={styles.footerHint} role="status">
              Текущий раздел открыт из «Ещё».
            </p>
          ) : null}
        </footer>
      </div>
    </dialog>
  );
}
