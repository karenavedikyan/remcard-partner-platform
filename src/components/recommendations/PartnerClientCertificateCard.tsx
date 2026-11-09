"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { StoreCertificateClientCardModel } from "@/lib/storeCertificateClientCardModel";
import styles from "./PartnerClientCertificateCard.module.css";

type Props = {
  model: StoreCertificateClientCardModel;
};

type QrSlot = { url: string; dataUrl: string | null; failed: boolean };

export function PartnerClientCertificateCard({ model }: Props) {
  const [qrSlot, setQrSlot] = useState<QrSlot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = model.certificateUrl;
    if (!url) {
      setQrSlot(null);
      return;
    }
    void QRCode.toDataURL(url, {
      margin: 0,
      width: 128,
      color: { dark: "#1b1f1a", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrSlot({ url, dataUrl, failed: false });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrSlot({ url, dataUrl: null, failed: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [model.certificateUrl]);

  const qrMatches = Boolean(qrSlot && qrSlot.url === model.certificateUrl);
  const qrDataUrl = qrMatches ? qrSlot!.dataUrl : null;
  const qrFailed = qrMatches ? qrSlot!.failed : false;
  const qrInactive = !model.active;

  return (
    <article
      className={styles.card}
      data-testid="client-certificate-card"
      aria-label="Сертификат как видит клиент"
    >
      <CardDecor />
      <header className={styles.header}>
        <span className={styles.wordmark}>
          remcard<span className={styles.wordmarkDot}>.</span>
        </span>
        <span className={styles.titlePill}>{model.title}</span>
      </header>
      <p className={styles.pctValue}>{model.pctTextValue}</p>
      <p className={styles.pctSubtitle}>{model.pctSubtitleText}</p>
      <div className={styles.qrTile}>
        <div
          className={`${styles.qrBox} ${qrInactive ? styles.qrBoxInactive : ""}`}
          data-testid="client-certificate-card-qr"
        >
          {qrDataUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={qrDataUrl}
              alt={`QR-код документа ${model.visibleCode}`}
              data-testid="specialist-certificate-preview-qr"
            />
          ) : (
            <span className={styles.qrPlaceholder} role="status">
              {qrFailed ? "Нет QR" : "QR"}
            </span>
          )}
        </div>
        <div className={`${styles.codeCol} ${model.stampText ? styles.codeColWithStamp : ""}`}>
          <span className={styles.codeLabel}>КОД</span>
          <span className={styles.codeValue} data-testid="certificate-code">
            {model.visibleCode}
          </span>
        </div>
        {model.stampText ? <span className={styles.stamp}>{model.stampText}</span> : null}
      </div>
      <footer className={styles.footer}>
        <span className={styles.termText}>{model.termTextValue}</span>
        <span className={styles.statusText}>{model.statusLabelText}</span>
      </footer>
    </article>
  );
}

function CardDecor() {
  return (
    <>
      <div className={styles.cardGlowA} aria-hidden />
      <div className={styles.cardGlowB} aria-hidden />
    </>
  );
}
