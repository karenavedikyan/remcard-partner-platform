"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PartnersHub, type PartnersHubProps } from "./PartnersHub";
import { AgentPartnerHubModal, type HubModalTab } from "./AgentPartnerHubModal";
import styles from "./AgentPartnersHub.module.css";

type Segment = "active" | "invitations";
type InvitationFlow = "incoming" | "outgoing";

export function AgentPartnersHub(props: Omit<PartnersHubProps, "variant">) {
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

  return (
    <div className={styles.shell} data-testid="agent-r04-partners">
      <p className={styles.lead}>
        {segment === "active"
          ? "Ваши действующие партнёры. Ожидающие приглашения — во вкладке «Приглашения». Фильтры работают вместе; архив скрывает запись только у вас."
          : "Приглашения, которые ждут решения или отправлены вами."}
      </p>

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
        defaultSearchRole="agent"
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
          defaultSearchRole="agent"
          onCloseAgentModal={() => setModalOpen(false)}
        />
      </AgentPartnerHubModal>
    </div>
  );
}
