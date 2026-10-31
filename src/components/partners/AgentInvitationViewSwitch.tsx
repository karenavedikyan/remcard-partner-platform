"use client";

import type { AgentListViewMode } from "@/components/partners/AgentR04ListToolbar";
import styles from "./AgentInvitationViewSwitch.module.css";

export type AgentInvitationViewSwitchFlow = "incoming" | "outgoing";

type Props = {
  flow: AgentInvitationViewSwitchFlow;
  viewMode: AgentListViewMode;
  onViewModeChange: (mode: AgentListViewMode) => void;
};

/**
 * Local list/cards presentation switch for invitation overview zones.
 * Does not fetch, mutate, or remount the collection — only controlled viewMode.
 */
export function AgentInvitationViewSwitch({ flow, viewMode, onViewModeChange }: Props) {
  const groupLabel =
    flow === "incoming" ? "Вид входящих предложений" : "Вид исходящих предложений";
  const rootTestId =
    flow === "incoming"
      ? "agent-invitation-view-switch-incoming"
      : "agent-invitation-view-switch-outgoing";

  return (
    <div
      className={styles.root}
      role="group"
      aria-label={groupLabel}
      data-testid={rootTestId}
      data-invitation-flow={flow}
    >
      <button
        type="button"
        className={styles.button}
        data-active={viewMode === "list"}
        aria-pressed={viewMode === "list"}
        data-testid={`${rootTestId}-list`}
        onClick={() => onViewModeChange("list")}
      >
        Список
      </button>
      <button
        type="button"
        className={styles.button}
        data-active={viewMode === "cards"}
        aria-pressed={viewMode === "cards"}
        data-testid={`${rootTestId}-cards`}
        onClick={() => onViewModeChange("cards")}
      >
        Карточки
      </button>
    </div>
  );
}
