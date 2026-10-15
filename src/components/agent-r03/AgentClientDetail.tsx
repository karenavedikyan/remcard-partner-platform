"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AgentR03Gate } from "@/components/agent-r03/AgentR03Gate";
import {
  deleteAgentClient,
  fetchAgentClient,
  patchAgentClient,
} from "@/lib/agent-r03/api";
import type { AgentClientRow, AgentCertificateRow } from "@/lib/agent-r03/types";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { RemcardApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { AgentClientFormDialog, type AgentClientFormValues } from "./AgentClientFormDialog";
import { RecordRowActions } from "./RecordRowActions";
import { SharePreviewDialog } from "./SharePreviewDialog";
import styles from "./agent-r03.module.css";

export function AgentClientDetail({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<AgentClientRow | null>(null);
  const [certs, setCerts] = useState<AgentCertificateRow[]>([]);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    return fetchAgentClient(clientId)
      .then((res) => {
        setClient(res.client);
        setCerts(res.certificates);
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
    await patchAgentClient(client.id, {
      displayName: values.displayName,
      phone: values.phone ? values.phone : null,
      email: values.email ? values.email : null,
      city: values.city ? values.city : null,
      note: values.note ? values.note : null,
    });
    await reload();
  }

  function contactShareLines(c: AgentClientRow): string[] {
    const lines: string[] = [c.displayName];
    if (c.phone) lines.push(formatPhoneForDisplay(c.phone));
    if (c.email) lines.push(c.email);
    if (c.city) lines.push(c.city);
    return lines;
  }

  return (
    <AgentR03Gate>
      {error ? <p role="alert">{error}</p> : null}
      {client ? (
        <div className={styles.list}>
          <article className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.cardMain}>
                <h1>{client.displayName}</h1>
                <p className={styles.meta}>
                  {client.city ?? "Город не указан"}
                  {client.phone ? ` · ${formatPhoneForDisplay(client.phone)}` : ""}
                  {client.email ? ` · ${client.email}` : ""}
                </p>
              </div>
              <RecordRowActions
                ariaLabel="Действия с клиентом"
                actions={[
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
                            caught instanceof RemcardApiError
                              ? caught.message
                              : "Не удалось удалить",
                          );
                          setBusy(false);
                        });
                    },
                  },
                ]}
              />
            </div>
            {client.note ? <p className={styles.meta}>{client.note}</p> : null}
            <Link href={`/certificates/new?clientId=${encodeURIComponent(client.id)}`}>
              <Button>Создать сертификат</Button>
            </Link>
          </article>
          <h2>Сертификаты клиента</h2>
          {certs.length === 0 ? <p className={styles.empty}>Пока нет сертификатов.</p> : null}
          {certs.map((c) => (
            <Link key={c.id} href={`/certificates/${c.id}`} className={styles.openLink}>
              {c.userAlias ?? c.title} ({c.displayCode})
            </Link>
          ))}
        </div>
      ) : null}

      <AgentClientFormDialog
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
        lines={client ? contactShareLines(client) : []}
        url=""
      />
    </AgentR03Gate>
  );
}
