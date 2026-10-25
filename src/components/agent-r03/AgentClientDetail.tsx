"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { ownerClientsUsesRecommendationCerts } from "@/lib/clients-owner-mode";
import { certificatePartnerSummary } from "@/lib/agent-r03/certificateOffers";
import { certificateUsageLabel } from "@/lib/agent-r03/certificateUsageLabel";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { RemcardApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { AgentClientFormDialog, type AgentClientFormValues } from "./AgentClientFormDialog";
import { RecordRowActions } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import styles from "./agent-r03.module.css";

function clientAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

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
          <span className={styles.certCardEyebrow}>RemCard · сертификат</span>
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

function PurchaseHistoryPanel({
  testId,
  title,
  purchases,
  emptyHint,
}: {
  testId: string;
  title: string;
  purchases: AgentClientPurchaseRow[];
  emptyHint: string;
}) {
  return (
    <details
      className={`${styles.certificateTerms} ${styles.card}`}
      open={purchases.length > 0}
      data-testid={testId}
    >
      <summary>
        {title} <span className={styles.badgeCount}>{purchases.length}</span>
      </summary>
      <div className={styles.termsBody}>
        {purchases.length === 0 ? (
          <p className={styles.empty}>{emptyHint}</p>
        ) : (
          purchases.map((p) => (
            <article key={p.id} className={styles.clientPurchaseRow}>
              <div>
                <strong>{p.lineSummary || "Покупка по сертификату"}</strong>
                <p className={styles.meta}>
                  {p.partnerName} · {new Date(p.createdAt).toLocaleDateString("ru-RU")}
                  {p.recommenderName ? ` · ${p.recommenderName}` : ""}
                </p>
                <Link
                  className={styles.meta}
                  href={`/history/purchases/${encodeURIComponent(p.id)}`}
                >
                  Заказ №{p.id}
                </Link>
              </div>
              <div>
                <strong>{p.totalAmount.toLocaleString("ru-RU")} ₽</strong>
                <span className={styles.purchasePill}>{p.statusLabel ?? p.status}</span>
              </div>
            </article>
          ))
        )}
        <small className={styles.meta}>
          Показаны все заказы по связанным сертификатам, включая отменённые и возвращённые. В
          общем счётчике «покупок» учитываются только подтверждённые статусы; выдача сертификата
          сама по себе покупкой не считается.
        </small>
      </div>
    </details>
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
  const [receivingPurchases, setReceivingPurchases] = useState<AgentClientPurchaseRow[]>([]);
  const [error, setError] = useState("");
  const loadGeneration = useRef(0);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const recommendationCerts = ownerClientsUsesRecommendationCerts(accessMode);
  const specialistPresentation = accessMode === "specialist";
  const businessPresentation = accessMode === "business";

  const reload = useCallback(() => {
    const generation = ++loadGeneration.current;
    setError("");
    return fetchAgentClient(clientId)
      .then((res) => {
        if (generation !== loadGeneration.current) return;
        setClient(res.client);
        setCerts(res.certificates);
        setPurchases(res.recommendationPurchases ?? res.purchases ?? []);
        setReceivingPurchases(res.receivingPurchases ?? []);
      })
      .catch((caught) => {
        if (generation !== loadGeneration.current) return;
        setClient(null);
        setCerts([]);
        setPurchases([]);
        setReceivingPurchases([]);
        setError(caught instanceof RemcardApiError ? caught.message : "Ошибка загрузки");
      });
  }, [clientId]);

  useEffect(() => {
    setClient(null);
    setCerts([]);
    setPurchases([]);
    setReceivingPurchases([]);
    void reload();
  }, [clientId, reload]);

  async function saveClient(values: AgentClientFormValues) {
    if (!client) return;
    const patch: Parameters<typeof patchAgentClient>[1] = {
      displayName: values.displayName,
      phone: values.phone ? values.phone : null,
      email: values.email ? values.email : null,
      city: values.city ? values.city : null,
      note: values.note ? values.note : null,
    };
    if (accessMode === "specialist" || accessMode === "business") {
      patch.need = values.need ? values.need : null;
    }
    await patchAgentClient(client.id, patch);
    await reload();
  }

  const createCertHref = recommendationCerts
    ? `/recommendations/new?clientId=${encodeURIComponent(clientId)}`
    : `/certificates/new?clientId=${encodeURIComponent(clientId)}`;

  const certDetailBase = recommendationCerts ? "/recommendations" : "/certificates";

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
      {error && !client ? (
        <div className={styles.errorBlock} data-testid="client-detail-load-error">
          <p role="alert">{error}</p>
          <Button variant="secondary" data-testid="client-detail-retry" onClick={() => void reload()}>
            Повторить
          </Button>
        </div>
      ) : null}
      {client ? (
        <div
          className={
            specialistPresentation
              ? `${styles.r03Root} ${styles.clientDetailStack}`
              : styles.list
          }
          data-testid={
            specialistPresentation
              ? "specialist-client-detail-root"
              : businessPresentation
                ? "business-client-detail-root"
                : undefined
          }
        >
          {specialistPresentation ? (
            <Link href="/clients" className={styles.clientBackLink} data-testid="specialist-client-back">
              ← Все клиенты
            </Link>
          ) : null}
          <article className={styles.card}>
            <div
              className={
                specialistPresentation ? `${styles.cardTop} ${styles.clientCardTopSpecialist}` : styles.cardTop
              }
            >
              <div className={styles.cardMain}>
                {specialistPresentation ? (
                  <div className={styles.clientIdentityRow}>
                    <span className={styles.clientAvatar} aria-hidden>
                      {clientAvatarInitials(client.displayName)}
                    </span>
                    <div>
                      <h1>{client.displayName}</h1>
                      <p className={styles.meta}>
                        {client.need?.trim() || "Задача пока не указана"} ·{" "}
                        {client.city?.trim() || "Город не указан"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h1>{client.displayName}</h1>
                  </>
                )}
                {specialistPresentation ? null : (
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

            {accessMode === "agent" || businessPresentation ? (
              <Link href={createCertHref} data-testid="business-client-create-cert">
                <Button>Создать сертификат</Button>
              </Link>
            ) : null}
          </article>

          {specialistPresentation ? (
            <div className={styles.statsRow} data-testid="specialist-client-metrics">
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

          {specialistPresentation ? (
            <div className={styles.clientTwoCol}>
              <article className={styles.card}>
                <h2>Контакты</h2>
                <div>
                  <span className={styles.clientFieldEyebrow}>Телефон</span>
                  <p className={styles.meta}>
                    {client.phone ? formatPhoneForDisplay(client.phone) : "Не указан"}
                  </p>
                </div>
                <div>
                  <span className={styles.clientFieldEyebrow}>Email</span>
                  <p className={styles.meta}>{client.email?.trim() || "Не указан"}</p>
                </div>
                <small className={styles.meta}>
                  Контакты не отправляются партнёрам автоматически.
                </small>
              </article>
              <article className={styles.card}>
                <h2>Заметка о клиенте</h2>
                <p className={styles.meta}>
                  {client.note?.trim() ||
                    "Здесь можно записать задачу клиента и о чём договорились."}
                </p>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  Изменить заметку
                </Button>
              </article>
            </div>
          ) : null}

          {specialistPresentation ? (
            <div className={styles.clientSectionHead}>
              <h2>Сертификаты клиента</h2>
              <Link href={createCertHref}>
                <Button>Создать сертификат</Button>
              </Link>
            </div>
          ) : (
            <h2>Сертификаты клиента</h2>
          )}
          {certs.length === 0 ? (
            <p className={styles.empty}>Пока нет сертификатов.</p>
          ) : specialistPresentation ? (
            <div className={styles.clientCertStack}>
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

          {specialistPresentation ? (
            <PurchaseHistoryPanel
              testId="client-purchase-history"
              title="История покупок"
              purchases={purchases}
              emptyHint="Покупок по рекомендациям пока нет."
            />
          ) : null}
          {businessPresentation ? (
            <>
              <PurchaseHistoryPanel
                testId="client-recommendation-purchases"
                title="По нашим рекомендациям"
                purchases={purchases}
                emptyHint="Покупок у партнёров по исходящим сертификатам пока нет."
              />
              <PurchaseHistoryPanel
                testId="client-receiving-purchases"
                title="Покупки у нас"
                purchases={receivingPurchases}
                emptyHint="Покупки у вас появятся после явной привязки на карточке покупки или по вашим сертификатам, уже связанным с этим клиентом."
              />
            </>
          ) : null}
        </div>
      ) : null}

      <AgentClientFormDialog
        accessMode={accessMode}
        editing
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
