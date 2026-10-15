"use client";

import Link from "next/link";
import type { AgentCertificateRow } from "@/lib/agent-r03/types";
import { certificateUsageCaption } from "@/lib/agent-r03/certificateOffers";
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
  selected,
  onSelectChange,
  actions,
}: Props) {
  const displayTitle = cert.userAlias ?? cert.title;
  const usageCaption = certificateUsageCaption(cert);

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
      <article className={`${styles.certCard} remcard-certificate`}>
        <span className={styles.certCardWatermark} aria-hidden>
          R
        </span>
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
          <Link href={`/certificates/${cert.id}`} className={styles.certCardTitle}>
            {displayTitle}
          </Link>
          {cert.partnerOffers?.length ? (
            <div className={styles.certOffers}>
              {cert.partnerOffers.map((offer) => (
                <div key={`${offer.storeName}-${offer.categories.length}`}>
                  <div className={styles.certOfferPartner}>{offer.storeName}</div>
                  {offer.categories.map((cat) => (
                    <p key={`${offer.storeName}-${cat.categoryLabel}`} className={styles.certOfferLine}>
                      {cat.categoryLabel} — {cat.discountPercent}%
                    </p>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.meta}>{usageCaption}</p>
          )}
          <p className={styles.meta}>
            {cert.displayCode}
            {cert.hasOrders ? " · есть покупки" : ""}
          </p>
          <p className={styles.meta}>
            {cert.agentClient
              ? `Клиент: ${cert.agentClient.displayName}`
              : "Без клиента"}
          </p>
        </div>
        <div className={styles.certCardFooter}>
          <Link href={`/certificates/${cert.id}`} className={styles.certCardMore}>
            Подробнее ↗
          </Link>
          <RecordRowActions ariaLabel="Действия с сертификатом" actions={actions} />
        </div>
      </article>
    </div>
  );
}
