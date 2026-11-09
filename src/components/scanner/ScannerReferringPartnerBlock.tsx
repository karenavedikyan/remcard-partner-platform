"use client";

import type { OrderPreviewReferringPartner } from "@/lib/order-types";
import styles from "./scanner.module.css";

type Props = {
  referringPartner?: OrderPreviewReferringPartner | null;
};

export function ScannerReferringPartnerBlock({ referringPartner }: Props) {
  const hasPartner =
    referringPartner &&
    referringPartner.displayName.trim() &&
    referringPartner.typeLabel.trim();

  return (
    <section
      className={styles.referrerBlock}
      aria-labelledby="scanner-referrer-heading"
      data-testid="scanner-referrer-block"
    >
      <h3 id="scanner-referrer-heading" className={styles.referrerHeading}>
        Партнёр, который рекомендовал документ
      </h3>
      {hasPartner ? (
        <div className={styles.referrerBody}>
          <p className={styles.referrerLead}>
            <span className={styles.referrerType}>{referringPartner.typeLabel}</span>
            <span className={styles.referrerName}>{referringPartner.displayName}</span>
            {referringPartner.city ? (
              <span className={styles.referrerCity}>{referringPartner.city}</span>
            ) : null}
          </p>
          {referringPartner.contacts.length > 0 ? (
            <ul className={styles.referrerContacts}>
              {referringPartner.contacts.map((contact) => (
                <li key={`${contact.kind}-${contact.href}`}>
                  <a
                    href={contact.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.referrerContactLink}
                  >
                    {contact.label}: {contact.value}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.meta}>Публичные контакты не указаны</p>
          )}
        </div>
      ) : (
        <p className={styles.meta} data-testid="scanner-referrer-unavailable">
          Сведения о рекомендовавшем партнёре недоступны. Эмитент документа и партнёр приёма указаны
          отдельно.
        </p>
      )}
    </section>
  );
}
