"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./AgentPartnerHubModal.module.css";

export type HubModalTab = "find" | "link";

type Props = {
  open: boolean;
  tab: HubModalTab;
  titleFind: string;
  titleLink: string;
  /**
   * Frozen R1 ready chrome: dialog title «Приглашение создано», no find/link tabs.
   * Presentation only — does not change create/share/revoke routes.
   */
  readyMode?: boolean;
  titleReady?: string;
  onTabChange: (tab: HubModalTab) => void;
  onClose: () => void;
  children: ReactNode;
};

export function AgentPartnerHubModal({
  open,
  tab,
  titleFind,
  titleLink,
  readyMode = false,
  titleReady = "Приглашение создано",
  onTabChange,
  onClose,
  children,
}: Props) {
  const modalTitle = readyMode ? titleReady : tab === "link" ? titleLink : titleFind;
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab" && sheetRef.current) {
        const focusable = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="agent-partner-hub-modal"
        data-ready-mode={readyMode ? "true" : "false"}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id={titleId}>{modalTitle}</h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className={styles.closeBtn}
            aria-label="Закрыть"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {readyMode ? null : (
          <div
            className={styles.pathTabs}
            role="tablist"
            aria-label="Способ приглашения"
            data-testid="agent-partner-hub-modal-tabs"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "find"}
              data-active={tab === "find"}
              onClick={() => onTabChange("find")}
            >
              Найти в RemCard
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "link"}
              data-active={tab === "link"}
              onClick={() => onTabChange("link")}
            >
              Пригласить по ссылке
            </button>
          </div>
        )}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
