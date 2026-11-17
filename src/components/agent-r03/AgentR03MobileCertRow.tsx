"use client";

import Link from "next/link";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import {
  certificateLifecycleStatusLabel,
} from "@/lib/agent-r03/certificatePurchaseStatus";
import { RecordRowActions, type RecordRowAction } from "./RecordRowActions";
import styles from "./agent-r03.module.css";
import { CertificatePurchaseLink } from "./CertificatePurchaseLink";
import { CertificateIssuedByLine } from "./CertificateIssuedByLine";

type Props = {
  cert: AgentCertificateRow;
  selected: boolean;
  onSelectChange: (checked: boolean) => void;
  actions: RecordRowAction[];
  detailBasePath?: string;
  selectable?: boolean;
};

export function AgentR03MobileCertRow({
  cert,
  selected,
  onSelectChange,
  actions,
  detailBasePath = "/certificates",
  selectable = true,
}: Props) {
  const title = cert.userAlias ?? cert.title;

  return (
    <article
      className={styles.mobileRecord}
      data-testid="agent-cert-mobile-row"
      data-parity-cert-id={cert.id}
    >
      <div className={styles.mobileRecordTop}>
        {selectable ? (
          <label className={styles.selectCol}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelectChange(e.target.checked)}
            />
          </label>
        ) : null}
        <div className={styles.mobileRecordMain}>
          <Link href={`${detailBasePath}/${cert.id}`} className={styles.mobileRecordTitle}>
            {title}
          </Link>
          <p className={styles.meta}>
            {cert.displayCode} · {cert.directionLabel ?? "—"} · скидка {cert.discountPercent}%
          </p>
          <p className={styles.meta}>
            {cert.agentClient ? `Клиент: ${cert.agentClient.displayName}` : "Без клиента"}
          </p>
          <CertificateIssuedByLine cert={cert} className={styles.meta} />
        </div>
      </div>
      <div className={styles.mobileRecordFooter}>
        <div className={styles.mobileRecordFooterStatus}>
          <CertificatePurchaseLink cert={cert} detailBasePath={detailBasePath} />
          <span className={styles.collectionLifecycle}>{certificateLifecycleStatusLabel(cert)}</span>
        </div>
        <RecordRowActions
          ariaLabel="Действия с сертификатом"
          actions={actions}
          variant="mobileFooter"
        />
      </div>
    </article>
  );
}
