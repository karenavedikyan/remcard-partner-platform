"use client";

import type { Partnership } from "@/lib/types";
import { AgentPartnerWorkspaceActions } from "@/components/partners/AgentPartnerWorkspaceActions";

type Props = {
  partnership: Partnership;
  meId: string;
  onUpdated: () => void;
};

/** @deprecated Prefer AgentPartnerWorkspaceActions; kept for legacy list panels. */
export function AgentPartnerRecordActions({ partnership, meId, onUpdated }: Props) {
  return (
    <AgentPartnerWorkspaceActions
      partnership={partnership}
      meId={meId}
      onUpdated={onUpdated}
      variant="cardToolbar"
      ariaLabel="Действия с партнёром"
    />
  );
}
