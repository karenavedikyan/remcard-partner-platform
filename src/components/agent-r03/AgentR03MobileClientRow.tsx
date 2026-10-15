"use client";

import Link from "next/link";
import type { AgentClientRow } from "@/lib/agent-r03/types";
import { formatPhoneForDisplay } from "@/lib/contact-phone-display";
import { RecordRowActions, type RecordRowAction } from "./RecordRowActions";
import styles from "./agent-r03.module.css";

type Props = {
  client: AgentClientRow;
  archived: boolean;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
  actions: RecordRowAction[];
};

export function AgentR03MobileClientRow({
  client,
  archived,
  selected,
  onSelectChange,
  actions,
}: Props) {
  const certLine =
    client.certificateCount > 0
      ? `${client.certificateCount} сертификат${client.certificateCount === 1 ? "" : client.certificateCount < 5 ? "а" : "ов"}`
      : "Пока без сертификатов";

  return (
    <article className={styles.mobileRecord} data-testid="agent-client-mobile-row">
      <div className={styles.mobileRecordTop}>
        <label className={styles.selectCol}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange(e.target.checked)}
          />
        </label>
        <div className={styles.mobileRecordMain}>
          <Link href={`/clients/${client.id}`} className={styles.mobileRecordTitle}>
            {client.displayName}
          </Link>
          <p className={styles.meta}>
            {[client.city, client.phone ? formatPhoneForDisplay(client.phone) : null]
              .filter(Boolean)
              .join(" · ") || "Контакты не указаны"}
          </p>
          <p className={styles.meta}>{certLine}</p>
        </div>
      </div>
      <div className={styles.mobileRecordFooter}>
        <span className={styles.statusPill}>{archived ? "В архиве" : "Активен"}</span>
        <RecordRowActions ariaLabel="Действия с клиентом" actions={actions} />
      </div>
    </article>
  );
}
