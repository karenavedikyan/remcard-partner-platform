"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RemcardApiError } from "@/lib/api-client";
import {
  createAgentClient,
  deleteAgentClient,
  fetchAgentClients,
  patchAgentClient,
} from "@/lib/agent-r03/api";
import type { AgentClientRow } from "@/lib/agent-r03/types";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { Button } from "@/components/ui/Button";
import { AgentClientFormDialog, type AgentClientFormValues } from "./AgentClientFormDialog";
import { RecordRowActions } from "./RecordRowActions";
import styles from "./agent-r03.module.css";

export function AgentClientsList() {
  const [items, setItems] = useState<AgentClientRow[]>([]);
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editClient, setEditClient] = useState<AgentClientRow | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const load = useCallback(
    async (opts?: { cursor?: string | null; append?: boolean }) => {
      setLoadState("loading");
      setError("");
      try {
        const data = await fetchAgentClients({
          archived,
          q: q.trim() || undefined,
          cursor: opts?.cursor ?? undefined,
        });
        const rows = data.clients ?? [];
        setItems((prev) => (opts?.append ? [...prev, ...rows] : rows));
        setNextCursor(data.nextCursor ?? null);
        setLoadState("loaded");
      } catch (caught) {
        setLoadState("error");
        setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить клиентов");
      }
    },
    [archived, q],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function submitClient(values: AgentClientFormValues) {
    const body = {
      displayName: values.displayName,
      phone: values.phone || undefined,
      email: values.email || undefined,
      city: values.city || undefined,
      note: values.note || undefined,
    };
    if (editClient) {
      await patchAgentClient(editClient.id, {
        displayName: body.displayName,
        phone: values.phone ? values.phone : null,
        email: values.email ? values.email : null,
        city: values.city ? values.city : null,
        note: values.note ? values.note : null,
      });
    } else {
      await createAgentClient(body);
    }
    await load();
  }

  function openCreate() {
    setEditClient(null);
    setFormOpen(true);
  }

  function openEdit(client: AgentClientRow) {
    setEditClient(client);
    setFormOpen(true);
  }

  return (
    <>
      <div className={styles.pageActions}>
        <Button onClick={openCreate}>Добавить клиента</Button>
        <Button variant="secondary" onClick={() => setArchived((v) => !v)}>
          {archived ? "Активные" : "Архив"}
        </Button>
        <div className={styles.viewToggle}>
          <button
            type="button"
            data-active={viewMode === "cards"}
            onClick={() => setViewMode("cards")}
          >
            Карточки
          </button>
          <button
            type="button"
            data-active={viewMode === "list"}
            onClick={() => setViewMode("list")}
          >
            Список
          </button>
        </div>
      </div>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Имя, контакт, город"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <Button variant="secondary" onClick={() => void load()}>
          Найти
        </Button>
      </div>

      {loadState === "loading" && items.length === 0 ? (
        <p className={styles.loading}>Загрузка…</p>
      ) : null}
      {loadState === "error" ? (
        <div className={styles.errorBlock}>
          <p role="alert">{error}</p>
          <Button variant="secondary" onClick={() => void load()}>
            Повторить
          </Button>
        </div>
      ) : null}

      {loadState === "loaded" && items.length === 0 ? (
        <p className={styles.empty}>{archived ? "Архив пуст." : "Добавьте первого клиента."}</p>
      ) : null}

      {items.length > 0 && viewMode === "cards" ? (
        <div className={styles.list}>
          {items.map((client) => (
            <article key={client.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.cardMain}>
                  <Link href={`/clients/${client.id}`} className={styles.openLink}>
                    {client.displayName}
                  </Link>
                  <p className={styles.meta}>
                    {client.city ?? "Город не указан"}
                    {client.phone ? ` · ${formatPhoneForDisplay(client.phone)}` : ""}
                    {client.certificateCount
                      ? ` · сертификатов: ${client.certificateCount}`
                      : ""}
                  </p>
                </div>
              </div>
              <div className={styles.cardBottom}>
                <span className={styles.meta}>{archived ? "В архиве" : "Активен"}</span>
                <RecordRowActions
                  ariaLabel="Действия с клиентом"
                  actions={[
                    {
                      id: "rename",
                      label: "Редактировать",
                      onClick: () => openEdit(client),
                    },
                    {
                      id: archived ? "restore" : "archive",
                      label: archived ? "Восстановить" : "В архив",
                      onClick: () =>
                        void patchAgentClient(client.id, {
                          action: archived ? "restore" : "archive",
                        }).then(() => load()),
                    },
                    {
                      id: "delete",
                      label: "Удалить",
                      disabled: client.certificateCount > 0,
                      disabledReason: "Есть связанные сертификаты",
                      onClick: () => {
                        if (!window.confirm("Удалить клиента?")) return;
                        void deleteAgentClient(client.id)
                          .then(() => load())
                          .catch((caught) => {
                            window.alert(
                              caught instanceof RemcardApiError
                                ? caught.message
                                : "Не удалось удалить",
                            );
                          });
                      },
                    },
                  ]}
                />
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {items.length > 0 && viewMode === "list" ? (
        <div className={styles.tableWrap}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Контакты</th>
                <th>Статус</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link href={`/clients/${client.id}`}>{client.displayName}</Link>
                  </td>
                  <td>
                    {client.city ?? "—"}
                    {client.phone ? ` · ${formatPhoneForDisplay(client.phone)}` : ""}
                  </td>
                  <td>{archived ? "Архив" : "Активен"}</td>
                  <td>
                    <RecordRowActions
                      ariaLabel="Действия"
                      actions={[
                        {
                          id: "rename",
                          label: "Редактировать",
                          onClick: () => openEdit(client),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {nextCursor ? (
        <div className={styles.pager}>
          <Button variant="secondary" onClick={() => void load({ cursor: nextCursor, append: true })}>
            Показать ещё
          </Button>
        </div>
      ) : null}

      <AgentClientFormDialog
        open={formOpen}
        title={editClient ? "Редактировать клиента" : "Новый клиент"}
        submitLabel={editClient ? "Сохранить" : "Добавить"}
        initial={
          editClient
            ? {
                displayName: editClient.displayName,
                phone: editClient.phone ?? "",
                email: editClient.email ?? "",
                city: editClient.city ?? "",
                note: editClient.note ?? "",
              }
            : undefined
        }
        onClose={() => setFormOpen(false)}
        onSubmit={submitClient}
      />
    </>
  );
}
