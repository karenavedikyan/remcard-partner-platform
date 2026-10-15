"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  deleteAgentCertificate,
  fetchAgentCertificate,
  patchAgentCertificate,
} from "@/lib/agent-r03/api";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { certificateStatusLabel, certificateStatusTone } from "@/lib/certificate-labels";
import { resolveCertificatePageUrl } from "@/lib/certificate-url";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RecordRowActions } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import styles from "./agent-r03.module.css";

export function AgentCertificateDetail({ certificateId }: { certificateId: string }) {
  const [cert, setCert] = useState<AgentCertificateRow | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const data = await fetchAgentCertificate(certificateId);
      setCert(data.certificate);
      setLoadState("loaded");
    } catch (caught) {
      setCert(null);
      setLoadState("error");
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить сертификат",
      );
    }
  }, [certificateId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(action: "archive" | "restore" | "cancel") {
    if (!cert) return;
    setBusy(true);
    try {
      await patchAgentCertificate(cert.id, { action });
      await load();
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!cert) return;
    if (!window.confirm("Удалить сертификат без возможности восстановления?")) return;
    setBusy(true);
    try {
      await deleteAgentCertificate(cert.id);
      window.location.href = "/certificates";
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
  if (!cert) return null;

  const publicUrl = resolveCertificatePageUrl(cert);
  const canShare = Boolean(publicUrl && cert.status !== "CANCELLED");

  return (
    <>
      <div className={styles.pageActions}>
        <Link href="/certificates">
          <Button variant="secondary">К списку</Button>
        </Link>
        <Link href="/certificates/new">
          <Button>Создать ещё</Button>
        </Link>
      </div>
      <article className={styles.card}>
        <div className={styles.cardTop}>
          <div className={styles.cardMain}>
            <h1>{cert.title}</h1>
            <p className={styles.meta}>
              Код: {cert.displayCode}
              {cert.directionLabel ? ` · ${cert.directionLabel}` : ""}
            </p>
            {cert.agentClient ? (
              <p className={styles.meta}>
                Клиент:{" "}
                <Link href={`/clients/${cert.agentClient.id}`}>{cert.agentClient.displayName}</Link>
              </p>
            ) : null}
          </div>
          <StatusBadge
            label={certificateStatusLabel(cert.status)}
            tone={certificateStatusTone(cert.status)}
          />
        </div>
        <RecordRowActions
          ariaLabel="Действия с сертификатом"
          actions={[
            {
              id: "share",
              label: "Поделиться",
              disabled: !canShare || busy,
              disabledReason: "Ссылка недоступна",
              onClick: () => setShareOpen(true),
            },
            {
              id: cert.archivedInWorkspace ? "restore" : "archive",
              label: cert.archivedInWorkspace ? "Восстановить" : "В архив",
              disabled: busy,
              onClick: () => void runAction(cert.archivedInWorkspace ? "restore" : "archive"),
            },
            {
              id: "disable",
              label: "Отключить действие",
              disabled: busy || cert.status !== "ACTIVE",
              disabledReason: "Уже отключён",
              onClick: () => void runAction("cancel"),
            },
            {
              id: "delete",
              label: "Удалить",
              disabled: busy || cert.hasOrders,
              disabledReason: "Есть использования или заказы",
              onClick: () => void onDelete(),
            },
          ]}
        />
      </article>
      <SharePreviewDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Сертификат Ремкард"
        lines={[`Код: ${cert.displayCode}`, publicUrl ?? ""]}
        url={publicUrl ?? ""}
      />
    </>
  );
}
