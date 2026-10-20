"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  deleteAgentClient,
  fetchAgentClient,
  patchAgentClient,
} from "@/lib/agent-r03/api";
import type {
  AgentClientPurchaseRow,
  AgentClientRow,
  AgentCertificateRow,
} from "@/lib/agent-r03/types";
import type { OwnerClientsAccessMode } from "@/components/clients/OwnerClientsModeContext";
import { certificatePartnerSummary } from "@/lib/agent-r03/certificateOffers";
import { certificateUsageLabel } from "@/lib/agent-r03/certificateUsageLabel";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { RemcardApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { AgentClientFormDialog, type AgentClientFormValues } from "./AgentClientFormDialog";
import { RecordRowActions } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import styles from "./agent-r03.module.css";

function SpecialistClientCertCard({
  cert,
  href,
}: {
  cert: AgentCertificateRow;
  href: string;
}) {
  const displayTitle = cert.userAlias ?? cert.title;
  return (
    <article className={styles.certCard} data-testid="specialist-client-cert-card">
      <div className={styles.certCardHead}>
        <div className={styles.certCardHeadText}>
          <span className={styles.certCardEyebrow}>RemCard · рекомендация</span>
        </div>
      </div>
      <div className={styles.certCardBody}>
        <Link href={href} className={`${styles.certCardTitle} card-title`}>
          {displayTitle}
        </Link>
        <p className={styles.meta}>{certificatePartnerSummary(cert)}</p>
        <p className={styles.usageCaption}>
          <span>{certificateUsageLabel(cert)}</span>
        </p>
        <p className={styles.meta}>
          {new Date(cert.createdAt).toLocaleDateString("ru-RU")}
          {cert.displayCode ? ` · ${cert.displayCode}` : ""}
        </p>
      </div>
      <div className={styles.certificateBottom}>
        <Link href={href} className={styles.certCardMore} data-testid="specialist-client-cert-open">
          Открыть
        </Link>
      </div>
    </article>
  );
}

export function AgentClientDetail({
  clientId,
  accessMode = "agent",
}: {
  clientId: string;
  accessMode?: OwnerClientsAccessMode;
}) {
  const [client, setClient] = useState<
    (AgentClientRow & { purchaseCount?: number; lastCertificateAt?: string | null }) | null
  >(null);
  const [certs, setCerts] = useState<AgentCertificateRow[]>([]);
  const [purchases, setPurchases] = useState<AgentClientPurchaseRow[]>([]);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    return fetchAgentClient(clientId)
      .then((res) => {
        setClient(res.client);
        setCerts(res.certificates);
        setPurchases(res.purchases ?? []);
      })
      .catch((caught) => {
        setError(caught instanceof RemcardApiError ? caught.message : "Ошибка загрузки");
      });
  }, [clientId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function saveClient(values: AgentClientFormValues) {
    if (!client) return;
    const patch: Parameters<typeof patchAgentClient>[1] = {
      displayName: values.displayName,
      phone: values.phone ? values.phone : null,
      email: values.email ? values.email : null,
      city: values.city ? values.city : null,
      note: values.note ? values.note : null,
    };
    if (accessMode === "specialist") {
      patch.need = values.need ? values.need : null;
    }
    await patchAgentClient(client.id, patch);
    await reload();
  }

  const createCertHref =
    accessMode === "specialist"
      ? `/recommendations/new?clientId=${encodeURIComponent(clientId)}`
      : `/certificates/new?clientId=${encodeURIComponent(clientId)}`;

  const certDetailBase = accessMode === "specialist" ? "/recommendations" : "/certificates";

  const rowActions = client
    ? [
        {
          id: "rename",
          label: "Редактировать",
          disabled: busy,
          onClick: () => setEditOpen(true),
        },
        {
          id: "share",
          label: "Поделиться контактами",
          disabled: busy,
          onClick: () => setShareOpen(true),
        },
        {
          id: client.archivedAt ? "restore" : "archive",
          label: client.archivedAt ? "Восстановить" : "В архив",
          disabled: busy,
          onClick: () => {
            setBusy(true);
            void patchAgentClient(client.id, {
              action: client.archivedAt ? "restore" : "archive",
            })
              .then(() => reload())
              .finally(() => setBusy(false));
          },
        },
        {
          id: "delete",
          label: "Удалить",
          disabled: busy || client.certificateCount > 0,
          disabledReason: "Есть связанные сертификаты",
          onClick: () => {
            if (!window.confirm("Удалить клиента?")) return;
            setBusy(true);
            void deleteAgentClient(client.id)
              .then(() => {
                window.location.href = "/clients";
              })
              .catch((caught) => {
                window.alert(
                  caught instanceof RemcardApiError ? caught.message : "Не удалось удалить",
                );
                setBusy(false);
              });
          },
        },
      ]
    : [];

  return (
    <>
      {error ? <p role="alert">{error}</p> : null}
      {client ? (
        <div className={styles.list}>
          <article className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.cardMain}>
                <h1>{client.displayName}</h1>
                {accessMode === "specialist" ? (
                  <>
                    <p className={styles.meta}>
                      {client.need?.trim() || "Задача не указана"}
                    </p>
                    {(client.phone || client.email || client.city) && (
                      <div className={styles.meta}>
                        {client.city ? <span>{client.city}</span> : null}
                        {client.phone ? (
                          <span>
                            {client.city ? " · " : ""}
                            {formatPhoneForDisplay(client.phone)}
                          </span>
                        ) : null}
                        {client.email ? <span> · {client.email}</span> : null}
                      </div>
                    )}
                    {client.note?.trim() ? (
                      <p className={styles.meta}>
                        <strong>Заметка:</strong> {client.note}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <>
                    <p className={styles.meta}>
                      {client.city ?? "Город не указан"}
                      {client.phone ? ` · ${formatPhoneForDisplay(client.phone)}` : ""}
                      {client.email ? ` · ${client.email}` : ""}
                    </p>
                    {client.note ? <p className={styles.meta}>{client.note}</p> : null}
                  </>
                )}
              </div>
              <RecordRowActions ariaLabel="Действия с клиентом" actions={rowActions} />
            </div>

            {accessMode === "specialist" ? (
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Сертификатов</span>
                  <strong className={styles.statValue}>{client.certificateCount}</strong>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Покупок</span>
                  <strong className={styles.statValue}>
                    {typeof client.purchaseCount === "number" ? client.purchaseCount : "—"}
                  </strong>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Последний сертификат</span>
                  <strong className={styles.statValue}>
                    {client.lastCertificateAt
                      ? new Date(client.lastCertificateAt).toLocaleDateString("ru-RU")
                      : "—"}
                  </strong>
                </div>
              </div>
            ) : null}

            <Link href={createCertHref}>
              <Button>{accessMode === "specialist" ? "Создать рекомендацию" : "Создать сертификат"}</Button>
            </Link>
          </article>

          <h2>{accessMode === "specialist" ? "Рекомендации клиента" : "Сертификаты клиента"}</h2>
          {certs.length === 0 ? (
            <p className={styles.empty}>Пока нет сертификатов.</p>
          ) : accessMode === "specialist" ? (
            <div className={styles.list}>
              {certs.map((c) => (
                <SpecialistClientCertCard
                  key={c.id}
                  cert={c}
                  href={`${certDetailBase}/${c.id}`}
                />
              ))}
            </div>
          ) : (
            certs.map((c) => (
              <Link key={c.id} href={`${certDetailBase}/${c.id}`} className={styles.openLink}>
                {c.userAlias ?? c.title} ({c.displayCode})
              </Link>
            ))
          )}

          {accessMode === "specialist" ? (
            <>
              <h2>История покупок</h2>
              {purchases.length === 0 ? (
                <p className={styles.empty}>Покупок по сертификатам клиента пока нет.</p>
              ) : (
                purchases.map((p) => (
                  <article key={p.id} className={styles.card}>
                    <p className={styles.meta}>
                      {new Date(p.createdAt).toLocaleDateString("ru-RU")} · {p.partnerName} ·{" "}
                      {p.totalAmount.toLocaleString("ru-RU")} ₽ ·{" "}
                      {p.statusLabel ?? p.status}
                    </p>
                    {p.lineSummary ? <p className={styles.meta}>{p.lineSummary}</p> : null}
                  </article>
                ))
              )}
            </>
          ) : null}
        </div>
      ) : null}

      <AgentClientFormDialog
        accessMode={accessMode}
        open={editOpen}
        title="Редактировать клиента"
        submitLabel="Сохранить"
        initial={
          client
            ? {
                displayName: client.displayName,
                phone: client.phone ?? "",
                email: client.email ?? "",
                city: client.city ?? "",
                need: client.need ?? "",
                note: client.note ?? "",
              }
            : undefined
        }
        onClose={() => setEditOpen(false)}
        onSubmit={saveClient}
      />

      <SharePreviewDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Контакты клиента"
        lines={[]}
        url=""
        clientContacts={client}
      />
    </>
  );
}
