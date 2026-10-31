"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import { partnersSharedUiCopy } from "@/lib/partners-shared-ui-copy";
import type { SearchRole } from "@/lib/partnership-rules";
import { PartnersHub, type PartnersHubProps } from "./PartnersHub";
import { AgentPartnerHubModal, type HubModalTab } from "./AgentPartnerHubModal";
import styles from "./AgentPartnersHub.module.css";

export type AgentPartnersHubProps = Omit<PartnersHubProps, "variant" | "defaultSearchRole"> & {
  defaultSearchRole?: SearchRole;
  presentationAudience?: PartnersHubAudience;
};

/**
 * P1 overview shell: prototype composition (lead / tiles / zones / empty scenarios)
 * via PartnersHub agentPresentation=overview. Find/link modal reused as-is.
 */
export function AgentPartnersHub({
  defaultSearchRole,
  presentationAudience,
  ...props
}: AgentPartnersHubProps) {
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<HubModalTab>("find");
  /** P12: frozen R1 ready chrome — hide find/link tabs, title «Приглашение создано». */
  const [discussionInviteReady, setDiscussionInviteReady] = useState(false);

  const copy = partnersSharedUiCopy(presentationAudience);

  const openHub = searchParams.get("hub");
  useEffect(() => {
    if (openHub === "find" || openHub === "link") {
      setModalTab(openHub);
      setModalOpen(true);
    }
  }, [openHub]);

  useEffect(() => {
    if (!modalOpen) setDiscussionInviteReady(false);
  }, [modalOpen]);

  useEffect(() => {
    setDiscussionInviteReady(false);
  }, [modalTab]);

  const openModal = useCallback((tab: HubModalTab) => {
    setModalTab(tab);
    setDiscussionInviteReady(false);
    setModalOpen(true);
  }, []);

  const hubSearchRoleProps =
    defaultSearchRole !== undefined ? { defaultSearchRole } : {};

  return (
    <div
      className={styles.shell}
      data-testid="agent-r04-partners"
      data-partners-audience={presentationAudience}
      data-partners-presentation="overview"
    >
      <PartnersHub
        {...props}
        variant="agent-r04"
        partnersAudience={presentationAudience}
        agentPresentation="overview"
        onOpenPartnerHub={openModal}
        forcedTab="list"
        {...hubSearchRoleProps}
      />

      <AgentPartnerHubModal
        open={modalOpen}
        tab={modalTab}
        titleFind={copy.hubModalTitleFind}
        titleLink={copy.hubModalTitleLink}
        readyMode={discussionInviteReady}
        titleReady="Приглашение создано"
        onTabChange={setModalTab}
        onClose={() => setModalOpen(false)}
      >
        <PartnersHub
          {...props}
          variant="agent-r04"
          partnersAudience={presentationAudience}
          agentModalSurface={modalTab}
          forcedTab={modalTab}
          {...hubSearchRoleProps}
          onCloseAgentModal={() => setModalOpen(false)}
          onDiscussionInviteReadyChange={setDiscussionInviteReady}
          discussionInviteReady={discussionInviteReady}
        />
      </AgentPartnerHubModal>

      <p className={styles.footnote}>{copy.footnote}</p>
    </div>
  );
}
