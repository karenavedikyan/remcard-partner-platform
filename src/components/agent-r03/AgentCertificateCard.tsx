"use client";

import Link from "next/link";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { certificateStatusLabel, certificateStatusTone } from "@/lib/certificate-labels";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RecordRowActions, type RecordRowAction } from "./RecordRowActions";
import styles from "./agent-r03.module.css";

type Props = {
  cert: AgentCertificateRow;
  archived: boolean;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
  actions: RecordRowAction[];
};

export function AgentCertificateCard({
  cert,
  archived,
  selected,
  onSelectChange,
  actions,
}: Props) {
  const displayTitle = cert.userAlias ?? cert.title;
  const partnerLine =
    cert.partnerStoreName && cert.categorySummary
      ? `${cert.partnerStoreName} · ${cert.categorySummary}`
      : cert.partnerStoreName ?? cert.categorySummary ?? cert.directionLabel ?? "—";

  return (
    <article className={styles.certCard} data-testid="agent-cert-card">
      <div className={styles.certCardHead}>
        <label className={styles.selectCol}>
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange(e.target.checked)}
          />
        </label>
        <div className={styles.certCardHeadText}>
          <span className={styles.certCardEyebrow}>RemCard · сертификат</span>
          <StatusBadge
            label={certificateStatusLabel(cert.status)}
            tone={certificateStatusTone(cert.status)}
          />
        </div>
      </div>
      <div className={styles.certCardBody}>
        <Link href={`/certificates/${cert.id}`} className={styles.certCardTitle}>
          {displayTitle}
        </Link>
        <p className={styles.meta}>{partnerLine}</p>
        <p className={styles.meta}>
          {cert.displayCode} · скидка {cert.discountPercent}%
          {cert.usageCount > 0 ? " · есть покупки" : ""}
        </p>
        <p className={styles.meta}>
          {cert.agentClient
            ? `Клиент: ${cert.agentClient.displayName}`
            : "Без клиента"}
        </p>
      </div>
      <div className={styles.certCardFooter}>
        <Link href={`/certificates/${cert.id}`} className={styles.certCardMore}>
          Подробнее
        </Link>
        <RecordRowActions ariaLabel="Действия с сертификатом" actions={actions} />
      </div>
    </article>
  );
}
