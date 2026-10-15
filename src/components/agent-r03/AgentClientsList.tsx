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
import { RecordRowActions } from "./RecordRowActions";
import styles from "./agent-r03.module.css";

export function AgentClientsList() {
  const [items, setItems] = useState<AgentClientRow[]>([]);
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const data = await fetchAgentClients({ archived, q: q.trim() || undefined });
      setItems(data.clients ?? []);
      setLoadState("loaded");
    } catch (caught) {
      setLoadState("error");
      setError(caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить клиентов");
    }
  }, [archived, q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addClient() {
    const name = window.prompt("Имя клиента");
    if (!name?.trim()) return;
    try {
      await createAgentClient({ displayName: name.trim() });
      await load();
    } catch (caught) {
      window.alert(caught instanceof RemcardApiError ? caught.message : "Не удалось создать");
    }
  }

  return (
    <>
      <div className={styles.pageActions}>
        <Button onClick={() => void addClient()}>Добавить клиента</Button>
        <Button variant="secondary" onClick={() => setArchived((v) => !v)}>
          {archived ? "Активные" : "Архив"}
        </Button>
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

      {loadState === "loading" ? <p className={styles.loading}>Загрузка…</p> : null}
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

      {loadState === "loaded" && items.length > 0 ? (
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
                      label: "Переименовать",
                      onClick: () => {
                        const next = window.prompt("Имя клиента", client.displayName);
                        if (!next?.trim()) return;
                        void patchAgentClient(client.id, { displayName: next.trim() }).then(load);
                      },
                    },
                    {
                      id: archived ? "restore" : "archive",
                      label: archived ? "Восстановить" : "В архив",
                      onClick: () =>
                        void patchAgentClient(client.id, {
                          action: archived ? "restore" : "archive",
                        }).then(load),
                    },
                    {
                      id: "delete",
                      label: "Удалить",
                      disabled: client.certificateCount > 0,
                      disabledReason: "Есть связанные сертификаты",
                      onClick: () => {
                        if (!window.confirm("Удалить клиента?")) return;
                        void deleteAgentClient(client.id)
                          .then(load)
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
    </>
  );
}
