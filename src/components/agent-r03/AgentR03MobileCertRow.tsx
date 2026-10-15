"use client";

import Link from "next/link";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { certificateStatusLabel } from "@/lib/certificate-labels";
import { RecordRowActions, type RecordRowAction } from "./RecordRowActions";
import styles from "./agent-r03.module.css";

type Props = {
  cert: AgentCertificateRow;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
  actions: RecordRowAction[];
};

export function AgentR03MobileCertRow({ cert, selected, onSelectChange, actions }: Props) {
  const title = cert.userAlias ?? cert.title;

  return (
    <article className={styles.mobileRecord} data-testid="agent-cert-mobile-row">
      <div className={styles.mobileRecordTop}>
        <label className={styles.selectCol}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange(e.target.checked)}
          />
        </label>
        <div className={styles.mobileRecordMain}>
          <Link href={`/certificates/${cert.id}`} className={styles.mobileRecordTitle}>
            {title}
          </Link>
          <p className={styles.meta}>
            {cert.displayCode} · {cert.directionLabel ?? "—"} · скидка {cert.discountPercent}%
          </p>
          <p className={styles.meta}>
            {cert.agentClient ? `Клиент: ${cert.agentClient.displayName}` : "Без клиента"}
          </p>
        </div>
      </div>
      <div className={styles.mobileRecordFooter}>
        <span className={styles.statusPill}>{certificateStatusLabel(cert.status)}</span>
        <RecordRowActions ariaLabel="Действия с сертификатом" actions={actions} />
      </div>
    </article>
  );
}
