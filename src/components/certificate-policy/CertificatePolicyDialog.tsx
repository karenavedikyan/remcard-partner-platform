"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TermChangeModal } from "@/components/partners/TermChangeModal";
import {
  fetchCertificatePolicyWorkspace,
  patchCertificatePolicy,
} from "@/lib/certificate-policy/api";
import { buildCertificatePolicyDiffRows } from "@/lib/certificate-policy/diff";
import {
  certificatePolicyGeneralOcc,
  certificatePolicyIndividualOcc,
  certificatePolicyProposalOcc,
} from "@/lib/certificate-policy/occ";
import type {
  CertificatePolicyCounterparty,
  CertificatePolicyProposal,
  CertificatePolicyScope,
  CertificatePolicyTerms,
  CertificatePolicyWorkspace,
} from "@/lib/certificate-policy/types";
import { CertificatePolicyChips } from "./CertificatePolicyChips";
import { CertificatePolicyDiffTable } from "./CertificatePolicyDiffTable";
import { CertificatePolicyStaleSessionError } from "@/lib/certificate-policy/stale-session";
import { CertificatePolicyDiscardGuard } from "./CertificatePolicyDiscardGuard";
import { CertificatePolicySettingsForm } from "./CertificatePolicySettingsForm";
import { CertificatePolicyStats } from "./CertificatePolicyStats";
import { certificatePolicyIncomingProposalTitle } from "@/lib/certificate-policy/incoming-proposer";
import styles from "./certificate-policy.module.css";

export type CertificatePolicyDialogTab = "settings" | "incoming";

type Props = {
  open: boolean;
  initialTab?: CertificatePolicyDialogTab;
  /** Harness / deep-link: open individual scope with partner selected after load. */
  initialScope?: CertificatePolicyScope;
  initialPartnerUserId?: string | null;
  onClose: () => void;
  canEditSettings: boolean;
  viewerUserId: string;
};

export function CertificatePolicyDialog({
  open,
  initialTab = "settings",
  initialScope,
  initialPartnerUserId = null,
  onClose,
  canEditSettings,
  viewerUserId,
}: Props) {
  const [tab, setTab] = useState<CertificatePolicyDialogTab>(initialTab);
  const [scope, setScope] = useState<CertificatePolicyScope>("general");
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<CertificatePolicyWorkspace | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [occRecoverActive, setOccRecoverActive] = useState(false);
  const pendingGuardRef = useRef<(() => void) | null>(null);
  const loadSeqRef = useRef(0);
  const openGenRef = useRef(0);
  const wasOpenRef = useRef(false);
  const activeViewerRef = useRef("");
  const returnFocusRef = useRef<HTMLElement | null>(null);

  function sessionIsCurrent(seq: number, session: number, viewer: string): boolean {
    return (
      seq === loadSeqRef.current &&
      session === openGenRef.current &&
      viewer === activeViewerRef.current
    );
  }

  const reload = useCallback(
    async (opts?: { pickDefaultPartner?: boolean }): Promise<boolean> => {
      const seq = ++loadSeqRef.current;
      const session = openGenRef.current;
      const viewer = activeViewerRef.current;
      setLoadError("");
      const res = await fetchCertificatePolicyWorkspace(viewer);
      if (!sessionIsCurrent(seq, session, viewer)) return false;
      if (!res.ok) {
        setLoadError(res.message);
        return false;
      }
      setWorkspace(res.workspace);
      if (opts?.pickDefaultPartner) {
        setPartnerId((prev) => {
          if (prev && res.workspace.counterparties.some((c) => c.userId === prev)) return prev;
          return res.workspace.counterparties[0]?.userId ?? null;
        });
      }
      return true;
    },
    [],
  );

  const resetSessionState = useCallback(() => {
    loadSeqRef.current += 1;
    openGenRef.current += 1;
    setBusy(false);
    setDirty(false);
    setDiscardOpen(false);
    setOccRecoverActive(false);
    setStatus("");
    setLoadError("");
    setWorkspace(null);
    setPartnerId(null);
    setScope("general");
    setTab(canEditSettings ? initialTab : "incoming");
    pendingGuardRef.current = null;
  }, [canEditSettings, initialTab]);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      activeViewerRef.current = "";
      loadSeqRef.current += 1;
      setOccRecoverActive(false);
      return;
    }

    const viewer = viewerUserId.trim();
    const viewerChanged = activeViewerRef.current !== "" && activeViewerRef.current !== viewer;
    const freshOpen = !wasOpenRef.current || viewerChanged;
    wasOpenRef.current = true;
    activeViewerRef.current = viewer;

    if (!freshOpen) return;

    resetSessionState();
    const session = openGenRef.current;
    void (async () => {
      await reload({ pickDefaultPartner: true });
      if (openGenRef.current !== session || activeViewerRef.current !== viewer) return;
      if (initialScope) setScope(initialScope);
      if (initialPartnerUserId) setPartnerId(initialPartnerUserId);
    })();
  }, [
    open,
    viewerUserId,
    canEditSettings,
    initialTab,
    initialScope,
    initialPartnerUserId,
    reload,
    resetSessionState,
  ]);

  const selectedPartner: CertificatePolicyCounterparty | null =
    workspace?.counterparties.find((p) => p.userId === partnerId) ?? null;

  const individualPending =
    scope === "individual" && selectedPartner?.status === "pending_outgoing";

  const partnerEffective =
    selectedPartner?.effective ?? workspace?.general.effective ?? null;
  const partnerPending = selectedPartner?.pendingProposal ?? null;

  const settingsFormKey =
    scope === "general" ? "general" : `individual:${partnerId ?? "none"}`;

  function requestTransition(next: () => void) {
    if (busy) return;
    const run = () => {
      setOccRecoverActive(false);
      next();
    };
    if (!dirty) {
      run();
      return;
    }
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    pendingGuardRef.current = run;
    setDiscardOpen(true);
  }

  function confirmDiscard(leave: boolean) {
    setDiscardOpen(false);
    if (leave) {
      setDirty(false);
      setOccRecoverActive(false);
      pendingGuardRef.current?.();
      pendingGuardRef.current = null;
      returnFocusRef.current = null;
    } else {
      pendingGuardRef.current = null;
      queueMicrotask(() => returnFocusRef.current?.focus({ preventScroll: true }));
    }
  }

  async function saveGeneral(terms: CertificatePolicyTerms) {
    if (!workspace) throw new Error("Нет данных.");
    const seq = ++loadSeqRef.current;
    const session = openGenRef.current;
    const viewer = activeViewerRef.current;
    const occ = certificatePolicyGeneralOcc(workspace.general);
    setBusy(true);
    const res = await patchCertificatePolicy({
      action: "save_general",
      ...occ,
      terms,
    });
    setBusy(false);
    if (!sessionIsCurrent(seq, session, viewer)) {
      throw new CertificatePolicyStaleSessionError();
    }
    if (!res.ok) {
      if (res.code === "VERSION_CONFLICT") {
        if (res.workspace) setWorkspace(res.workspace);
        setOccRecoverActive(true);
        throw new Error(
          "Условия на сервере изменились. Черновик сохранён — обновите версии, затем сохраните снова.",
        );
      }
      throw new Error(res.message);
    }
    setOccRecoverActive(false);
    setWorkspace(res.workspace);
    setDirty(false);
    setStatus("Сохранено · условия действуют для новых сертификатов");
  }

  async function proposeIndividual(terms: CertificatePolicyTerms) {
    if (!workspace || !partnerId || !selectedPartner) throw new Error("Выберите партнёра.");
    const seq = ++loadSeqRef.current;
    const session = openGenRef.current;
    const viewer = activeViewerRef.current;
    const occ = certificatePolicyIndividualOcc({
      generalVersion: workspace.general.version,
      individualVersion: selectedPartner.individualVersion ?? 0,
      categoryRatesRevision: workspace.general.categoryRatesRevision ?? null,
      counterpartyCategoryRatesRevision: selectedPartner.categoryRatesRevision ?? null,
    });
    setBusy(true);
    const res = await patchCertificatePolicy({
      action: "propose_individual",
      ...occ,
      counterpartyUserId: partnerId,
      terms,
    });
    setBusy(false);
    if (!sessionIsCurrent(seq, session, viewer)) {
      throw new CertificatePolicyStaleSessionError();
    }
    if (!res.ok) {
      if (res.code === "VERSION_CONFLICT") {
        if (res.workspace) setWorkspace(res.workspace);
        setOccRecoverActive(true);
        throw new Error(
          "Условия на сервере изменились. Черновик сохранён — обновите версии, затем отправьте снова.",
        );
      }
      throw new Error(res.message);
    }
    setOccRecoverActive(false);
    setWorkspace(res.workspace);
    setDirty(false);
    setStatus("Отправлено · до ответа действуют прежние условия");
  }

  async function refreshOccBaseline() {
    if (busy) return;
    const session = openGenRef.current;
    const viewer = activeViewerRef.current;
    setLoadError("");
    const reloaded = await reload({ pickDefaultPartner: false });
    if (session !== openGenRef.current || viewer !== activeViewerRef.current) return;
    if (!reloaded) {
      setStatus("");
      return;
    }
    setStatus("Версии обновлены. Проверьте черновик и сохраните снова.");
  }

  async function respondProposal(
    proposal: CertificatePolicyProposal,
    decision: "approve_proposal" | "reject_proposal",
  ) {
    if (proposal.proposerUserId === viewerUserId) {
      setStatus("Нельзя согласовать собственное предложение.");
      return;
    }
    const seq = ++loadSeqRef.current;
    const session = openGenRef.current;
    const viewer = activeViewerRef.current;
    setBusy(true);
    const res = await patchCertificatePolicy({
      action: decision,
      ...certificatePolicyProposalOcc({
        proposalId: proposal.id,
        proposalVersion: proposal.version,
      }),
      expectedVersion: workspace?.general.version ?? 0,
    });
    setBusy(false);
    if (!sessionIsCurrent(seq, session, viewer)) return;
    if (!res.ok) {
      setStatus(res.message);
      return;
    }
    setWorkspace(res.workspace);
    setStatus(
      decision === "approve_proposal"
        ? "Согласовано · действует для новых сертификатов"
        : "Отклонено · условия прежние",
    );
  }

  const incoming = workspace?.incomingProposals ?? [];

  return (
    <>
      <CertificatePolicyDiscardGuard
        open={discardOpen}
        busy={busy}
        onKeepEditing={() => confirmDiscard(false)}
        onDiscard={() => confirmDiscard(true)}
      />
      <TermChangeModal
        open={open}
        title="Условия сертификатов"
        sheetClassName={styles.cpPolicyDialogSheet}
        onClose={() => requestTransition(onClose)}
        busy={busy}
        suspendFocusTrap={discardOpen}
      >
        <div className={styles.cp} data-testid="certificate-policy">
          <nav
            className={`${styles.cpSeg} ${styles.cpScope}`}
            role="tablist"
            aria-label="Условия сертификатов"
          >
            {canEditSettings ? (
              <button
                type="button"
                role="tab"
                aria-selected={tab === "settings"}
                data-testid="cp-tab-settings"
                disabled={busy}
                onClick={() => requestTransition(() => setTab("settings"))}
              >
                Мои условия
              </button>
            ) : null}
            <button
              type="button"
              role="tab"
              aria-selected={tab === "incoming"}
              data-testid="cp-tab-incoming"
              disabled={busy}
              onClick={() => requestTransition(() => setTab("incoming"))}
            >
              Ответить партнёру
            </button>
          </nav>

          {status ? (
            <p className={styles.cpStatus} role="status" data-testid="cp-status">
              {status}
            </p>
          ) : null}

          {occRecoverActive ? (
            <p className={styles.cpError} role="alert" data-testid="cp-occ-recover">
              Черновик не сброшен.{" "}
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                data-testid="cp-occ-refresh"
                onClick={() => void refreshOccBaseline()}
              >
                Обновить версии
              </Button>
            </p>
          ) : null}

          {loadError ? (
            <p className={styles.cpError} role="alert">
              {loadError}{" "}
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => void reload({ pickDefaultPartner: false })}
              >
                Повторить
              </Button>
            </p>
          ) : null}

          {tab === "settings" && workspace && canEditSettings ? (
            <>
              <div
                className={`${styles.cpSeg} ${styles.cpScope}`}
                role="group"
                aria-label="Для кого условия"
                data-testid="cp-scope"
              >
                <button
                  type="button"
                  aria-pressed={scope === "general"}
                  data-cp-scope="general"
                  disabled={busy}
                  onClick={() =>
                    requestTransition(() => {
                      setScope("general");
                      setStatus("");
                    })
                  }
                >
                  Для всех
                </button>
                <button
                  type="button"
                  aria-pressed={scope === "individual"}
                  data-cp-scope="individual"
                  disabled={busy}
                  onClick={() =>
                    requestTransition(() => {
                      setScope("individual");
                      setStatus("");
                    })
                  }
                >
                  Для партнёра
                </button>
              </div>

              {scope === "individual" ? (
                <CertificatePolicyPartnerPicker
                  partners={workspace.counterparties}
                  selected={partnerId}
                  disabled={busy}
                  onSelect={(id: string) =>
                    requestTransition(() => {
                      setPartnerId(id);
                      setStatus("");
                    })
                  }
                />
              ) : null}

              {scope === "general" ? (
                <CertificatePolicySettingsForm
                  key={settingsFormKey}
                  scope="general"
                  effective={workspace.general.effective}
                  baselineForRates={workspace.general.effective}
                  disabled={busy}
                  saveLabel="Сохранить"
                  freezeDraftReset={occRecoverActive}
                  onDirtyChange={setDirty}
                  onSubmit={saveGeneral}
                />
              ) : individualPending && selectedPartner && partnerPending ? (
                <CertificatePolicyDiffTable
                  title="Ждёт ответа партнёра"
                  rows={buildCertificatePolicyDiffRows(
                    partnerPending.effective,
                    partnerPending.proposed,
                  )}
                  actions={
                    <Button type="button" variant="secondary" disabled>
                      Ожидаем ответ
                    </Button>
                  }
                />
              ) : selectedPartner?.status === "rejected_outgoing" && partnerEffective ? (
                <>
                  {selectedPartner.lastRejectedAt ? (
                    <p className={styles.cpFine} data-testid="cp-rejected-outgoing">
                      Партнёр отклонил предыдущее предложение. Действуют прежние условия.
                    </p>
                  ) : null}
                  <CertificatePolicySettingsForm
                    key={settingsFormKey}
                    scope="individual"
                    effective={partnerEffective}
                    baselineForRates={workspace.general.effective}
                    disabled={busy}
                    saveLabel="Предложить снова"
                    freezeDraftReset={occRecoverActive}
                    onDirtyChange={setDirty}
                    onSubmit={proposeIndividual}
                  />
                </>
              ) : selectedPartner && partnerEffective ? (
                <CertificatePolicySettingsForm
                  key={settingsFormKey}
                  scope="individual"
                  effective={partnerEffective}
                  baselineForRates={workspace.general.effective}
                  disabled={busy || individualPending}
                  saveLabel="Предложить партнёру"
                  freezeDraftReset={occRecoverActive}
                  onDirtyChange={setDirty}
                  onSubmit={proposeIndividual}
                />
              ) : (
                <p className={styles.cpFine}>Выберите партнёра для индивидуальных условий.</p>
              )}
            </>
          ) : null}

          {tab === "incoming" && workspace ? (
            <div className={styles.cpBlock}>
              {incoming.length === 0 ? (
                <p className={styles.cpFine} data-testid="cp-incoming-empty">
                  Нет входящих предложений.
                </p>
              ) : (
                incoming.map((proposal) => (
                  <div key={proposal.id} className={styles.cpBlock} data-testid={`cp-incoming-${proposal.id}`}>
                    <CertificatePolicyDiffTable
                      title={certificatePolicyIncomingProposalTitle(workspace, proposal)}
                      testId={`cp-incoming-diff-${proposal.id}`}
                      rows={buildCertificatePolicyDiffRows(
                        proposal.effective,
                        proposal.proposed,
                      )}
                      actions={
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            data-testid={`cp-reject-${proposal.id}`}
                            disabled={busy}
                            onClick={() => void respondProposal(proposal, "reject_proposal")}
                          >
                            Отклонить
                          </Button>
                          <Button
                            type="button"
                            data-testid={`cp-approve-${proposal.id}`}
                            disabled={busy}
                            onClick={() => void respondProposal(proposal, "approve_proposal")}
                          >
                            Согласовать
                          </Button>
                        </>
                      }
                    />
                    <CertificatePolicyStats terms={proposal.effective} />
                    <CertificatePolicyChips terms={proposal.effective} />
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      </TermChangeModal>
    </>
  );
}

function CertificatePolicyPartnerPicker({
  partners,
  selected,
  disabled,
  onSelect,
}: {
  partners: CertificatePolicyCounterparty[];
  selected: string | null;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.cpBlock}>
      <span className={styles.cpEyebrow}>Партнёр</span>
      <div className={styles.cpWho} role="group" aria-label="Партнёр" data-testid="cp-partner">
        {partners.map((partner) => {
          const note =
            partner.status === "pending_outgoing"
              ? "Ждёт ответа"
              : partner.status === "rejected_outgoing"
                ? "Отклонено"
                : partner.status === "individual"
                  ? "Свои условия"
                  : "Общие условия";
          return (
            <button
              key={partner.userId}
              type="button"
              aria-pressed={selected === partner.userId}
              disabled={disabled}
              onClick={() => onSelect(partner.userId)}
            >
              <span className={styles.cpAva} aria-hidden="true">
                {partner.initials}
              </span>
              <span>
                <b>{partner.displayName}</b>
                <small>{note}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}