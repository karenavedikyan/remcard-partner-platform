"use client";

import { useCallback, useEffect, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { StoreCertificate } from "@/lib/certificate-types";
import { fetchSpecialistIssuerCertificate } from "@/lib/specialist-certificates/api";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { CertificateResultView } from "@/components/recommendations/CertificateResultView";
import { SpecialistCertificateEditDetailsDialog } from "./SpecialistCertificateEditDetailsDialog";
import { SpecialistCertificateEditDiscountsDialog } from "@/components/agent-r03/SpecialistCertificateEditDiscountsDialog";
import { Button } from "@/components/ui/Button";
import agentStyles from "@/components/agent-r03/agent-r03.module.css";
import styles from "@/components/recommendations/recommendations.module.css";

type Props = {
  open: boolean;
  certificateId: string | null;
  onClose: () => void;
  onListMutated?: () => void;
};

export function SpecialistCertificateDetailDialog({
  open,
  certificateId,
  onClose,
  onListMutated,
}: Props) {
  const [storeCert, setStoreCert] = useState<StoreCertificate | null>(null);
  const [meta, setMeta] = useState<AgentCertificateRow | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [editDiscountsOpen, setEditDiscountsOpen] = useState(false);

  const load = useCallback(async () => {
    if (!certificateId) return;
    setLoadState("loading");
    setError("");
    try {
      const [store, agent] = await Promise.all([
        remcardFetch<StoreCertificate>(`/api/store/certificate/${encodeURIComponent(certificateId)}`),
        fetchSpecialistIssuerCertificate(certificateId),
      ]);
      setStoreCert(store);
      setMeta(agent.certificate);
      setLoadState("loaded");
    } catch (caught) {
      setStoreCert(null);
      setMeta(null);
      setLoadState("error");
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить сертификат",
      );
    }
  }, [certificateId]);

  useEffect(() => {
    if (!open || !certificateId) return;
    void load();
  }, [certificateId, load, open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !editDetailsOpen && !editDiscountsOpen) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editDetailsOpen, editDiscountsOpen, onClose, open]);

  if (!open || !certificateId) return null;

  return (
    <>
      <div className={agentStyles.dialogBackdrop} role="presentation" onClick={onClose}>
        <div
          className={`${agentStyles.r03Root} ${agentStyles.dialogPanel} ${styles.specialistCreatePanel}`}
          role="dialog"
          aria-labelledby="specialist-cert-detail-title"
          data-testid="specialist-certificate-detail-dialog"
          onClick={(event) => event.stopPropagation()}
        >
          <div className={agentStyles.dialogTitleRow}>
            <h2 id="specialist-cert-detail-title">Сертификат</h2>
            <button
              type="button"
              className={agentStyles.dialogCloseBtn}
              aria-label="Закрыть"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {loadState === "loading" ? <p className={styles.loading}>Загрузка…</p> : null}
          {loadState === "error" ? (
            <div className={styles.errorBlock}>
              <p role="alert">{error}</p>
              <Button variant="secondary" onClick={() => void load()}>
                Повторить
              </Button>
            </div>
          ) : null}

          {loadState === "loaded" && storeCert && meta ? (
            <>
              <div className={styles.createFormFooter} data-testid="agent-certificate-detail-root">
                <Button variant="secondary" type="button" onClick={() => setEditDetailsOpen(true)}>
                  Редактировать детали
                </Button>
                <Button
                  variant="secondary"
                  type="button"
                  disabled={meta.hasOrders || meta.status === "CANCELLED"}
                  onClick={() => setEditDiscountsOpen(true)}
                >
                  Изменить скидки
                </Button>
              </div>
              <CertificateResultView
                certificate={storeCert}
                displayCode={meta.displayCode}
                showCreateSuccessBanner={false}
                presentation="specialist"
                privateAlias={meta.userAlias ?? meta.title ?? null}
              />
            </>
          ) : null}
        </div>
      </div>

      <SpecialistCertificateEditDetailsDialog
        open={editDetailsOpen}
        cert={meta}
        onClose={() => setEditDetailsOpen(false)}
        onSaved={() => {
          void load();
          onListMutated?.();
        }}
      />
      <SpecialistCertificateEditDiscountsDialog
        open={editDiscountsOpen}
        cert={meta}
        onClose={() => setEditDiscountsOpen(false)}
        onSaved={() => {
          void load();
          onListMutated?.();
        }}
      />
    </>
  );
}
