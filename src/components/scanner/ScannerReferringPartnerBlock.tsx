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
        Клиент от партнёра
      </h3>
      {hasPartner ? (
        <div className={styles.referrerBody}>
          <div className={styles.referrerRow}>
            <span className={styles.referrerType}>{referringPartner.typeLabel}</span>
            <span className={styles.referrerName}>{referringPartner.displayName}</span>
          </div>
          {referringPartner.city ? (
            <p className={styles.referrerCity}>{referringPartner.city}</p>
          ) : null}
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
          Данные партнёра недоступны.
        </p>
      )}
    </section>
  );
}
