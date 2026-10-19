"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import type { SearchRole } from "@/lib/partnership-rules";
import { PartnersHub, type PartnersHubProps } from "./PartnersHub";
import { AgentPartnerHubModal, type HubModalTab } from "./AgentPartnerHubModal";
import styles from "./AgentPartnersHub.module.css";

type Segment = "active" | "invitations";
type InvitationFlow = "incoming" | "outgoing";

export type AgentPartnersHubProps = Omit<PartnersHubProps, "variant" | "defaultSearchRole"> & {
  defaultSearchRole?: SearchRole;
  presentationAudience?: PartnersHubAudience;
};

export function AgentPartnersHub({
  defaultSearchRole,
  presentationAudience,
  ...props
}: AgentPartnersHubProps) {
  const searchParams = useSearchParams();
  const [segment, setSegment] = useState<Segment>("active");
  const [invitationFlow, setInvitationFlow] = useState<InvitationFlow>("incoming");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<HubModalTab>("find");

  const openHub = searchParams.get("hub");
  useEffect(() => {
    if (openHub === "find" || openHub === "link") {
      setModalTab(openHub);
      setModalOpen(true);
    }
  }, [openHub]);

  const openModal = useCallback((tab: HubModalTab) => {
    setModalTab(tab);
    setModalOpen(true);
  }, []);

  const lead =
    segment === "active"
      ? "Ваши действующие партнёры. Ожидающие приглашения — во вкладке «Приглашения». Фильтры работают вместе; архив скрывает запись только у вас."
      : "Приглашения, которые ждут решения или отправлены вами.";

  const hubSearchRoleProps =
    defaultSearchRole !== undefined ? { defaultSearchRole } : {};

  return (
    <div
      className={styles.shell}
      data-testid="agent-r04-partners"
      data-partners-audience={presentationAudience}
    >
      <div className={styles.segmentRow} role="tablist" aria-label="Раздел партнёров">
        <button
          type="button"
          role="tab"
          aria-selected={segment === "active"}
          className={segment === "active" ? styles.segmentActive : styles.segment}
          onClick={() => setSegment("active")}
        >
          Мои партнёры
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={segment === "invitations"}
          className={segment === "invitations" ? styles.segmentActive : styles.segment}
          onClick={() => setSegment("invitations")}
        >
          Приглашения
        </button>
      </div>

      <p className={styles.lead}>{lead}</p>

      {segment === "invitations" ? (
        <div className={styles.inviteFlowRow} role="tablist" aria-label="Направление приглашений">
          <button
            type="button"
            role="tab"
            aria-selected={invitationFlow === "incoming"}
            className={invitationFlow === "incoming" ? styles.inviteFlowActive : styles.inviteFlow}
            onClick={() => setInvitationFlow("incoming")}
            data-testid="agent-invites-incoming"
          >
            Входящие
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={invitationFlow === "outgoing"}
            className={invitationFlow === "outgoing" ? styles.inviteFlowActive : styles.inviteFlow}
            onClick={() => setInvitationFlow("outgoing")}
            data-testid="agent-invites-outgoing"
          >
            Отправленные
          </button>
        </div>
      ) : (
        <div className={styles.hubEntryRow}>
          <button type="button" className={styles.hubPrimary} onClick={() => openModal("find")}>
            Найти или пригласить партнёра
          </button>
        </div>
      )}

      <PartnersHub
        {...props}
        variant="agent-r04"
        agentSegment={segment}
        agentInvitationFlow={segment === "invitations" ? invitationFlow : undefined}
        forcedTab="list"
        {...hubSearchRoleProps}
      />

      <AgentPartnerHubModal
        open={modalOpen}
        tab={modalTab}
        onTabChange={setModalTab}
        onClose={() => setModalOpen(false)}
      >
        <PartnersHub
          {...props}
          variant="agent-r04"
          agentModalSurface={modalTab}
          forcedTab={modalTab}
          {...hubSearchRoleProps}
          onCloseAgentModal={() => setModalOpen(false)}
        />
      </AgentPartnerHubModal>

      <p className={styles.footnote}>
        Приглашения сотрудников находятся отдельно в разделе команды. Здесь только
        партнёрство.
      </p>
    </div>
  );
}
