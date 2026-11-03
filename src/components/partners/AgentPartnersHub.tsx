"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { PartnersHubAudience } from "@/lib/partners-hub-presentation";
import { partnersSharedUiCopy } from "@/lib/partners-shared-ui-copy";
import type { SearchRole } from "@/lib/partnership-rules";
import { PartnersHub, type PartnersHubProps } from "./PartnersHub";
import { AgentPartnerHubModal, type HubModalTab } from "./AgentPartnerHubModal";
import { PartnerCooperationConfirmDialog } from "./PartnerCooperationConfirmDialog";
import styles from "./AgentPartnersHub.module.css";

export type AgentPartnersHubProps = Omit<PartnersHubProps, "variant" | "defaultSearchRole"> & {
  defaultSearchRole?: SearchRole;
  presentationAudience?: PartnersHubAudience;
};

type PendingInviteExit =
  | { type: "close" }
  | { type: "tab"; tab: HubModalTab }
  | { type: "choose" };

/** Local Hub copy — mirrors term-discard Stay/Discard; invite draft only. */
function discardInviteDraftCopy(): { title: string; body: string; keep: string; discard: string } {
  return {
    title: "Закрыть без сохранения?",
    body: "Черновик приглашения к обсуждению будет потерян.",
    keep: "Продолжить редактирование",
    discard: "Закрыть без сохранения",
  };
}

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
  const [chooserOpen, setChooserOpen] = useState(false);
  const [modalTab, setModalTab] = useState<HubModalTab>("find");
  /** P12: frozen R1 ready chrome — hide find/link tabs, title «Приглашение создано». */
  const [discussionInviteReady, setDiscussionInviteReady] = useState(false);
  /**
   * P23k/P23l: keep find Hub mounted across close→open (search/view/filter survive), but
   * remount discussion-invite panel only after accepted close / tab exit / open — never on
   * cancelled dirty Stay (key must not bump while draft confirm is dismissed).
   */
  const [discussionInvitePanelKey, setDiscussionInvitePanelKey] = useState(0);
  const inviteDirtyRef = useRef(false);
  const [inviteDiscardOpen, setInviteDiscardOpen] = useState(false);
  const pendingInviteExitRef = useRef<PendingInviteExit | null>(null);
  const inviteFocusRestoreRef = useRef<HTMLElement | null>(null);

  const copy = partnersSharedUiCopy(presentationAudience);

  const refreshInvitePanel = useCallback(() => {
    setDiscussionInviteReady(false);
    setDiscussionInvitePanelKey((n) => n + 1);
  }, []);

  const updateInviteDirty = useCallback((dirty: boolean) => {
    inviteDirtyRef.current = dirty;
  }, []);

  const openHub = searchParams.get("hub");
  useEffect(() => {
    if (openHub === "find" || openHub === "link") {
      setChooserOpen(false);
      setModalTab(openHub);
      setModalOpen(true);
    }
  }, [openHub]);

  // Bump only when modal actually closed (accepted exit) — Stay never flips modalOpen.
  useEffect(() => {
    if (!modalOpen) refreshInvitePanel();
  }, [modalOpen, refreshInvitePanel]);

  // Bump only when tab actually changes — denied/Stay tab never calls setModalTab.
  useEffect(() => {
    refreshInvitePanel();
  }, [modalTab, refreshInvitePanel]);

  const rememberInviteFocus = useCallback(() => {
    inviteFocusRestoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, []);

  const requestCloseModal = useCallback(() => {
    if (inviteDirtyRef.current) {
      rememberInviteFocus();
      pendingInviteExitRef.current = { type: "close" };
      setInviteDiscardOpen(true);
      return;
    }
    setModalOpen(false);
  }, [rememberInviteFocus]);

  const requestTabChange = useCallback(
    (tab: HubModalTab) => {
      if (tab === modalTab) return;
      // Do not bump key before dirty guard — Stay leaves modalTab unchanged.
      if (inviteDirtyRef.current) {
        rememberInviteFocus();
        pendingInviteExitRef.current = { type: "tab", tab };
        setInviteDiscardOpen(true);
        return;
      }
      setModalTab(tab);
    },
    [modalTab, rememberInviteFocus],
  );

  const keepInviteDraftEditing = useCallback(() => {
    setInviteDiscardOpen(false);
    pendingInviteExitRef.current = null;
    const remembered = inviteFocusRestoreRef.current;
    inviteFocusRestoreRef.current = null;
    // Close/tab controls often own focus when the confirm opens — prefer the live
    // wizard field so Stay returns to the draft (same step/values/focus contract).
    requestAnimationFrame(() => {
      const wizard = document.querySelector<HTMLElement>(
        '[data-testid="agent-discussion-invite-wizard"], [data-testid="partner-link-invite-wizard"]',
      );
      const preferred =
        wizard?.querySelector<HTMLElement>(
          '[data-testid="agent-discussion-invite-subject"], [data-testid="agent-discussion-invite-recipient"], [data-testid="agent-discussion-invite-create"], input:not([readonly]), textarea:not([readonly]), select, button',
        ) ?? null;
      const target =
        remembered?.isConnected &&
        remembered.closest?.('[data-testid="agent-discussion-invite-wizard"], [data-testid="partner-link-invite-wizard"]')
          ? remembered
          : preferred;
      target?.focus({ preventScroll: true });
    });
  }, []);

  const discardInviteDraftAndExit = useCallback(() => {
    const pending = pendingInviteExitRef.current;
    setInviteDiscardOpen(false);
    pendingInviteExitRef.current = null;
    inviteDirtyRef.current = false;
    inviteFocusRestoreRef.current = null;
    if (pending?.type === "tab") {
      setModalTab(pending.tab);
      return;
    }
    if (pending?.type === "choose") {
      setModalTab("find");
      setChooserOpen(true);
      return;
    }
    setModalOpen(false);
  }, []);

  const openModal = useCallback(
    (tab: HubModalTab) => {
      if (modalOpen && inviteDirtyRef.current) {
        if (tab === modalTab) return;
        rememberInviteFocus();
        pendingInviteExitRef.current = { type: "tab", tab };
        setInviteDiscardOpen(true);
        return;
      }
      setModalTab(tab);
      refreshInvitePanel();
      setModalOpen(true);
    },
    [modalOpen, modalTab, refreshInvitePanel, rememberInviteFocus],
  );

  const hubSearchRoleProps =
    defaultSearchRole !== undefined ? { defaultSearchRole } : {};

  const chooseMethod = () => {
    if (inviteDirtyRef.current) {
      rememberInviteFocus();
      pendingInviteExitRef.current = { type: "choose" };
      setInviteDiscardOpen(true);
      return;
    }
    setModalTab("find");
    setChooserOpen(true);
  };

  const discardCopy = discardInviteDraftCopy();

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
        onOpenPartnerHub={(tab) => {
          openModal(tab);
          setChooserOpen(tab === "find");
        }}
        forcedTab="list"
        {...hubSearchRoleProps}
      />

      <AgentPartnerHubModal
        open={modalOpen}
        tab={modalTab}
        titleFind={copy.hubModalTitleFind}
        titleLink={copy.hubModalTitleLink}
        readyMode={discussionInviteReady}
        choiceMode={chooserOpen}
        prototypeMode
        onChooseMethod={chooseMethod}
        titleReady="Приглашение создано"
        onTabChange={(tab) => { setChooserOpen(false); requestTabChange(tab); }}
        onClose={requestCloseModal}
      >
        <PartnersHub
          {...props}
          variant="agent-r04"
          partnersAudience={presentationAudience}
          agentModalSurface={modalTab}
          forcedTab={modalTab}
          {...hubSearchRoleProps}
          onCloseAgentModal={requestCloseModal}
          onOpenPartnerHub={(tab) => {
            if (tab === "find") chooseMethod();
            else { setChooserOpen(false); openModal(tab); }
          }}
          onDiscussionInviteReadyChange={setDiscussionInviteReady}
          discussionInviteReady={discussionInviteReady}
          discussionInvitePanelKey={discussionInvitePanelKey}
          onDiscussionInviteDirtyChange={updateInviteDirty}
          onChooseMethod={chooseMethod}
        />
      </AgentPartnerHubModal>

      {inviteDiscardOpen ? (
        <PartnerCooperationConfirmDialog
          open
          testId="partner-invite-discard-confirm"
          title={discardCopy.title}
          body={discardCopy.body}
          confirmLabel={discardCopy.keep}
          dismissLabel={discardCopy.discard}
          safeAction="confirm"
          onConfirm={keepInviteDraftEditing}
          onDismiss={discardInviteDraftAndExit}
        />
      ) : null}

      <p className={styles.footnote}>{copy.footnote}</p>
    </div>
  );
}
