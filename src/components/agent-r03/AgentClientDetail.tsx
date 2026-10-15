"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AgentR03Gate } from "@/components/agent-r03/AgentR03Gate";
import { fetchAgentClient } from "@/lib/agent-r03/api";
import type { AgentClientRow, AgentCertificateRow } from "@/lib/agent-r03/types";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { RemcardApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import styles from "./agent-r03.module.css";

export function AgentClientDetail({ clientId }: { clientId: string }) {
  const [client, setClient] = useState<AgentClientRow | null>(null);
  const [certs, setCerts] = useState<AgentCertificateRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void fetchAgentClient(clientId)
      .then((res) => {
        setClient(res.client);
        setCerts(res.certificates);
      })
      .catch((caught) => {
        setError(caught instanceof RemcardApiError ? caught.message : "Ошибка загрузки");
      });
  }, [clientId]);

  return (
    <AgentR03Gate>
      {error ? <p role="alert">{error}</p> : null}
      {client ? (
        <div className={styles.list}>
          <article className={styles.card}>
            <h1>{client.displayName}</h1>
            <p className={styles.meta}>
              {client.city ?? "Город не указан"}
              {client.phone ? ` · ${formatPhoneForDisplay(client.phone)}` : ""}
            </p>
            {client.note ? <p>{client.note}</p> : null}
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
    </AgentR03Gate>
  );
}
