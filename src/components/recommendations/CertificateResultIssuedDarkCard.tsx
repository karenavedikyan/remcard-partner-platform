"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { StoreCertificateClientCardModel } from "@/lib/storeCertificateClientCardModel";
import type { IssuedCertificatePreviewRow } from "@/lib/certificate-issued-preview";
import {
  formatIssuedPolicyRowFact,
  formatIssuedPolicyRowRestrictions,
} from "@/lib/certificate-issued-preview";
import styles from "@/components/certificate-policy/certificate-policy.module.css";

type Props = {
  model: StoreCertificateClientCardModel;
  rows: IssuedCertificatePreviewRow[];
};

export function CertificateResultIssuedDarkCard({ model, rows }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const qrInactive = !model.active;

  useEffect(() => {
    let cancelled = false;
    const url = model.certificateUrl;
    if (!url) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(url, {
      margin: 0,
      width: 128,
      color: { dark: "#1b1f1a", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [model.certificateUrl]);

  return (
    <article
      className={`${styles.cpCertIssued} rc-cert cp-cert`}
      data-testid="issued-policy-dark-card"
      aria-label="Сертификат как видит клиент"
    >
      <header className={styles.cpCertHead}>
        <span className={styles.cpCertBrand}>
          remcard<span className={styles.cpCertBrandDot}>.</span>
        </span>
        <span className={styles.cpCertPill}>{model.title}</span>
      </header>
      <p className={styles.cpCertPct}>{model.pctTextValue}</p>
      <p className={styles.cpCertSub}>{model.pctSubtitleText}</p>
      <div className={styles.cpCertQrRow}>
        <div
          className={`${styles.cpCertQr} ${qrInactive ? styles.cpCertQrInactive : ""}`}
          data-testid="client-certificate-card-qr"
        >
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={qrDataUrl} alt={`QR-код документа ${model.visibleCode}`} />
          ) : (
            <span className={styles.cpCertQrPh}>QR</span>
          )}
        </div>
        <div className={styles.cpCertCodeCol}>
          <span className={styles.cpCertCodeLbl}>КОД</span>
          <span className={styles.cpCertCodeVal} data-testid="certificate-code">
            {model.visibleCode}
          </span>
        </div>
        {model.stampText ? <span className={styles.cpCertStamp}>{model.stampText}</span> : null}
      </div>
      <div className={styles.cpCertFacts} data-testid="cp-cert-facts">
        <span>{model.termTextValue}</span>
        <span data-testid="issued-policy-status-summary">{model.statusLabelText}</span>
      </div>
      <ul className={styles.cpCertRows} data-testid="cp-cert-rows">
        {rows.map((row) => (
          <li
            key={row.partnerUserId}
            data-testid={`issued-policy-row-${row.partnerUserId}`}
            data-row-state={row.rowState}
          >
            <div className={styles.cpCertRowHead}>
              <strong>{row.partnerName}</strong>
              <span className={styles.cpCertRowTag} data-testid={`issued-row-tag-${row.rowState}`}>
                {row.rowState === "active"
                  ? row.policy.policySource === "individual"
                    ? "Активен · индивид."
                    : "Активен"
                  : row.rowState === "expired"
                    ? "Истёк"
                    : row.rowState === "depleted"
                      ? "Использован"
                      : row.rowState === "cancelled"
                        ? "Отозван"
                        : "Недоступен"}
              </span>
            </div>
            <p className={styles.cpCertRowFact}>{formatIssuedPolicyRowFact(row.policy)}</p>
            {formatIssuedPolicyRowRestrictions(row.policy) ? (
              <p
                className={styles.cpCertRowFine}
                data-testid={`issued-policy-restrictions-${row.partnerUserId}`}
              >
                {formatIssuedPolicyRowRestrictions(row.policy)}
              </p>
            ) : null}
            {row.policy.remainingPurchases != null ? (
              <p className={styles.cpCertRowFine}>
                осталось {row.policy.remainingPurchases}
                {row.policy.consumedUses != null ? ` · использовано ${row.policy.consumedUses}` : ""}
              </p>
            ) : row.policy.purchaseLimit == null ? (
              <p className={styles.cpCertRowFine}>без лимита покупок</p>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}