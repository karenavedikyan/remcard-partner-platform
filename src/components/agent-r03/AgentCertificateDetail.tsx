"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { StoreCertificate } from "@/lib/certificate-types";
import {
  deleteAgentCertificate,
  fetchAgentCertificate,
  patchAgentCertificate,
} from "@/lib/agent-r03/api";
import {
  deleteSpecialistIssuerCertificate,
  fetchSpecialistIssuerCertificate,
  patchSpecialistIssuerCertificate,
} from "@/lib/specialist-certificates/api";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { certificateStatusLabel, certificateStatusTone } from "@/lib/certificate-labels";
import { resolveCertificatePageUrl, isTestCertificateUrl } from "@/lib/certificate-url";
import { CertificateResultView } from "@/components/recommendations/CertificateResultView";
import { Button } from "@/components/ui/Button";
import { RecordRowActions } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import { SpecialistCertificateEditDiscountsDialog } from "./SpecialistCertificateEditDiscountsDialog";
import styles from "./agent-r03.module.css";

export type AgentCertificateDetailAccessMode = "agent" | "specialist";

type AgentCertificateDetailProps = {
  certificateId: string;
  accessMode?: AgentCertificateDetailAccessMode;
  listHref?: string;
  createHref?: string;
};

export function AgentCertificateDetail({
  certificateId,
  accessMode = "agent",
  listHref = "/certificates",
  createHref = "/certificates/new",
}: AgentCertificateDetailProps) {
  const isSpecialist = accessMode === "specialist";
  const [storeCert, setStoreCert] = useState<StoreCertificate | null>(null);
  const [meta, setMeta] = useState<AgentCertificateRow | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editDiscountsOpen, setEditDiscountsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const [store, agent] = await Promise.all([
        remcardFetch<StoreCertificate>(`/api/store/certificate/${encodeURIComponent(certificateId)}`),
        isSpecialist
          ? fetchSpecialistIssuerCertificate(certificateId)
          : fetchAgentCertificate(certificateId),
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
  }, [certificateId, isSpecialist]);

  useEffect(() => {
    void load();
  }, [load]);

  const pageUrl = useMemo(
    () => (meta ? resolveCertificatePageUrl(meta) : ""),
    [meta],
  );
  const testOnlyPublic = isTestCertificateUrl(pageUrl);

  async function runAction(action: "archive" | "restore" | "cancel") {
    if (!meta) return;
    if (action === "cancel") {
      if (
        !window.confirm(
          "Отключить действие сертификата? Клиент не сможет использовать его по ссылке и QR.",
        )
      ) {
        return;
      }
    }
    setBusy(true);
    try {
      await (isSpecialist ? patchSpecialistIssuerCertificate : patchAgentCertificate)(meta.id, {
        action,
      });
      await load();
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  async function renamePrivate() {
    if (!meta) return;
    const next = window.prompt("Название для себя (не показывается клиенту)", meta.userAlias ?? "");
    if (next == null) return;
    if (!next.trim()) {
      window.alert("Укажите название или отмените.");
      return;
    }
    setBusy(true);
    try {
      await (isSpecialist ? patchSpecialistIssuerCertificate : patchAgentCertificate)(meta.id, {
        userAlias: next.trim(),
      });
      await load();
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!meta) return;
    if (!window.confirm("Удалить сертификат без возможности восстановления?")) return;
    setBusy(true);
    try {
      await (isSpecialist ? deleteSpecialistIssuerCertificate : deleteAgentCertificate)(meta.id);
      window.location.href = listHref;
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Не удалось удалить");
      setBusy(false);
    }
  }

  if (loadState === "loading") return <p className={styles.loading}>Загрузка…</p>;
  if (loadState === "error") {
    return (
      <div className={styles.errorBlock}>
        <p role="alert">{error}</p>
        <Button variant="secondary" onClick={() => void load()}>
          Повторить
        </Button>
      </div>
    );
  }
  if (!storeCert || !meta) return null;

  const canShare = Boolean(pageUrl && meta.status !== "CANCELLED");

  return (
    <>
      <div className={styles.pageActions}>
        <Link href={listHref}>
          <Button variant="secondary">К списку</Button>
        </Link>
        <Link href={createHref}>
          <Button>Создать ещё</Button>
        </Link>
      </div>

      {testOnlyPublic ? (
        <p className={styles.meta} role="status">
          Публичная ссылка недоступна для тестового автора — сертификат только в вашем кабинете.
        </p>
      ) : null}

      <div className={styles.card} data-testid="agent-certificate-detail-root">
        <p className={styles.meta}>
          Код для клиента: <strong>{meta.displayCode}</strong>
          {meta.userAlias ? ` · для себя: ${meta.userAlias}` : null}
        </p>
        <RecordRowActions
          ariaLabel="Действия с сертификатом"
          actions={[
            {
              id: "share",
              label: "Поделиться",
              disabled: !canShare || busy || testOnlyPublic,
              disabledReason: testOnlyPublic
                ? "Тестовый сертификат не публикуется"
                : "Ссылка недоступна",
              onClick: () => setShareOpen(true),
            },
            {
              id: "rename",
              label: "Переименовать для себя",
              disabled: busy,
              onClick: () => void renamePrivate(),
            },
            ...(isSpecialist
              ? [
                  {
                    id: "edit-discounts",
                    label: "Изменить скидки",
                    disabled: busy || meta.hasOrders || meta.status === "CANCELLED",
                    disabledReason: meta.hasOrders ? "Есть использования" : "Сертификат отключён",
                    onClick: () => setEditDiscountsOpen(true),
                  },
                ]
              : []),
            {
              id: meta.archivedInWorkspace ? "restore" : "archive",
              label: meta.archivedInWorkspace ? "Восстановить из архива" : "В архив",
              disabled: busy,
              onClick: () => void runAction(meta.archivedInWorkspace ? "restore" : "archive"),
            },
            {
              id: "disable",
              label: "Отключить действие",
              disabled: busy || meta.status !== "ACTIVE" || (isSpecialist && meta.hasOrders),
              disabledReason: meta.hasOrders
                ? "Есть использования"
                : "Уже отключён",
              onClick: () => void runAction("cancel"),
            },
            {
              id: "delete",
              label: "Удалить",
              disabled: busy || meta.hasOrders,
              disabledReason: "Есть использования или заказы",
              onClick: () => void onDelete(),
            },
          ]}
        />
      </div>

      <CertificateResultView
        certificate={storeCert}
        displayCode={meta.displayCode}
        showCreateSuccessBanner={false}
      />

      <SharePreviewDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Сертификат Ремкард"
        lines={[`Код: ${meta.displayCode}`, pageUrl]}
        url={pageUrl}
      />

      <SpecialistCertificateEditDiscountsDialog
        open={editDiscountsOpen}
        cert={meta}
        onClose={() => setEditDiscountsOpen(false)}
        onSaved={() => load()}
      />
    </>
  );
}
