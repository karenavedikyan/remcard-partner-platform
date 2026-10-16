"use client";

import type { ReactNode } from "react";
import styles from "./AgentPartnerHubModal.module.css";

export type HubModalTab = "find" | "link";

type Props = {
  open: boolean;
  tab: HubModalTab;
  onTabChange: (tab: HubModalTab) => void;
  onClose: () => void;
  children: ReactNode;
};

export function AgentPartnerHubModal({ open, tab, onTabChange, onClose, children }: Props) {
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
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="agent-partner-hub-title"
        data-testid="agent-partner-hub-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="agent-partner-hub-title">Найти или пригласить партнёра</h2>
          </div>
          <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={onClose}>
            ×
          </button>
        </header>
        <div className={styles.pathTabs} role="tablist" aria-label="Способ приглашения">
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
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
