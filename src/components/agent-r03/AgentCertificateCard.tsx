"use client";

import Link from "next/link";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { certificatePartnerSummary } from "@/lib/agent-r03/certificateOffers";
import { formatDiscountPercent } from "@/lib/agent-r03/formatDiscountPercent";
import { certificateUsageLabel } from "@/lib/agent-r03/certificateUsageLabel";
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

function IconTicket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M2 9a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v2a2 2 0 0 0 0 4v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-2a2 2 0 0 0 0-4Z" />
      <path d="M13 5v2M13 17v2M13 11v2" />
    </svg>
  );
}

function IconArrowUpRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

export function AgentCertificateCard({
  cert,
  selected,
  onSelectChange,
  actions,
}: Props) {
  const displayTitle = cert.userAlias ?? cert.title;
  const summaryLine = certificatePartnerSummary(cert);
  const terms = cert.terms ?? [];
  const issuer = cert.issuerDisplayName?.trim() || "агента";

  return (
    <div
      className={`${styles.collectionCardShell} ${selected ? styles.collectionCardShellSelected : ""}`}
      data-testid="agent-cert-card-shell"
    >
      <label className={styles.collectionCardSelect}>
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelectChange(e.target.checked)}
        />
        Выбрать
      </label>
      <article className={`${styles.certCard} remcard-certificate link-card`} data-testid="agent-cert-card">
        <div className={styles.certCardHead}>
          <div className={styles.certCardHeadText}>
            <span className={styles.certCardEyebrow}>RemCard · сертификат</span>
            <StatusBadge
              label={certificateStatusLabel(cert.status)}
              tone={certificateStatusTone(cert.status)}
            />
          </div>
        </div>
        <div className={styles.certCardBody}>
          <Link href={`/certificates/${cert.id}`} className={`${styles.certCardTitle} card-title`}>
            {displayTitle}
          </Link>
          <p className={styles.meta}>{summaryLine}</p>
          <p className={styles.usageCaption}>
            <IconTicket />
            <span>{certificateUsageLabel(cert)}</span>
          </p>
          {cert.agentClient ? (
            <p className={styles.meta}>Клиент: {cert.agentClient.displayName}</p>
          ) : null}
          {terms.length > 0 ? (
            <details className={`${styles.certificateTerms} fold-list certificate-terms`} data-testid="agent-cert-terms">
              <summary>
                Скидки по категориям <span className={styles.badgeCount}>{terms.length}</span>
              </summary>
              <div className={styles.termsBody}>
                {terms.map((term) => (
                  <div key={`${term.partnerName}-${term.categoryName}`} className={styles.termSummary}>
                    <strong>{term.categoryName}</strong>
                    <small>{term.partnerName}</small>
                    <span>
                      Клиенту <b>{formatDiscountPercent(term.discountPercent)}%</b>
                      {term.agentBonusPercent != null && Number.isFinite(term.agentBonusPercent) ? (
                        <>
                          {" "}
                          · ваш бонус <b>{formatDiscountPercent(term.agentBonusPercent)}%</b>
                        </>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </div>
        <div className={styles.certificateBottom}>
          <small>
            От {issuer}
            {cert.displayCode ? ` · ${cert.displayCode}` : ""}
          </small>
          <Link
            href={`/certificates/${cert.id}`}
            className={styles.certCardMore}
            data-testid="agent-cert-more"
          >
            Подробнее <IconArrowUpRight />
          </Link>
        </div>
        <div className={styles.recordCardActions}>
          <RecordRowActions
            ariaLabel="Действия с сертификатом"
            actions={actions}
            variant="cardToolbar"
          />
        </div>
      </article>
    </div>
  );
}
