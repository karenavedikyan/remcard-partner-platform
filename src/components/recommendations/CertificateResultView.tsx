"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { displayCategoryLabel } from "@/lib/category-display";
import { RemcardApiError, remcardFetchBlob } from "@/lib/api-client";
import { certificateStatusLabel } from "@/lib/certificate-labels";
import {
  clientVisibleDiscountSummary,
  getCertificateCodeForApi,
  certificateDisplayTitle,
  isTestCertificateUrl,
  resolveCertificatePageUrl,
} from "@/lib/certificate-url";
import type { StoreCertificate } from "@/lib/certificate-types";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { certificateStatusTone } from "@/lib/certificate-labels";
import styles from "./recommendations.module.css";

type CertificateResultViewProps = {
  certificate: StoreCertificate;
};

export function CertificateResultView({ certificate }: CertificateResultViewProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [pdfError, setPdfError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const pageUrl = useMemo(() => resolveCertificatePageUrl(certificate), [certificate]);
  const testOnlyLink = isTestCertificateUrl(pageUrl);

  useEffect(() => {
    let cancelled = false;
    if (!pageUrl) {
      setQrDataUrl(null);
      return;
    }
    void QRCode.toDataURL(pageUrl, { margin: 1, width: 220 }).then((url) => {
      if (!cancelled) {
        setQrDataUrl(url);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pageUrl]);

  async function copyLink() {
    if (!pageUrl) {
      setCopyState("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(pageUrl);
      setCopyState("ok");
    } catch {
      setCopyState("error");
    }
  }

  async function shareLink() {
    if (!pageUrl || !navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: "Ваша рекомендация RemCard",
        text: "Скидка по рекомендации RemCard",
        url: pageUrl,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      await copyLink();
    }
  }

  async function downloadPdf() {
    setPdfError("");
    setPdfLoading(true);
    try {
      const code = getCertificateCodeForApi(certificate);
      if (!code) {
        throw new Error("Не удалось определить код документа");
      }
      const { blob, filename } = await remcardFetchBlob(
        `/api/certificate/${encodeURIComponent(code)}/pdf`,
      );
      if (blob.type && !blob.type.includes("pdf")) {
        throw new Error("Ответ сервера не является PDF");
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download =
        filename ?? `remcard-${certificate.promoCode || certificate.qrCode || "certificate"}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setPdfError(caught instanceof RemcardApiError ? caught.message : "Не удалось скачать PDF");
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div className={styles.resultWrap}>
      <div className={styles.successBanner}>Готово — документ создан</div>

      <div className={styles.certificateCard}>
        <div className={styles.cardHeader}>
          <div>
            <h3>{certificateDisplayTitle(certificate)}</h3>
            <p className={styles.meta}>
              Скидка для клиента: {clientVisibleDiscountSummary(certificate)}
            </p>
          </div>
          <StatusBadge
            label={certificateStatusLabel(certificate.status)}
            tone={certificateStatusTone(certificate.status)}
          />
        </div>

        <ul className={styles.termsList}>
          {(certificate.partners ?? []).flatMap((partner) =>
            partner.categories.map((cat) => (
              <li key={`${partner.id}-${cat.category}`}>
                {displayCategoryLabel(cat.category, cat.categoryLabel)}: скидка {cat.discountPercent}%
              </li>
            )),
          )}
        </ul>

        <div className={styles.codeRow}>
          <span className={styles.codeValue}>{certificate.promoCode}</span>
        </div>

        {qrDataUrl ? (
          <div className={styles.qrBox}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR-код документа ${certificate.promoCode}`} />
          </div>
        ) : null}
      </div>

      {testOnlyLink ? (
        <p className={styles.notice}>
          Клиентская ссылка относится к тестовому контуру и не предназначена для отправки реальным
          клиентам. Для production задайте `NEXT_PUBLIC_CERTIFICATE_BASE_URL` на рабочий публичный
          домен RemCard.
        </p>
      ) : null}

      <div className={styles.cardActions}>
        <Button onClick={() => void copyLink()} disabled={!pageUrl}>
          Скопировать ссылку
        </Button>
        <Button variant="secondary" onClick={() => void shareLink()} disabled={!pageUrl}>
          Поделиться
        </Button>
        <Button variant="secondary" disabled={pdfLoading} onClick={() => void downloadPdf()}>
          {pdfLoading ? "Загрузка PDF…" : "Скачать PDF"}
        </Button>
      </div>

      {copyState === "ok" ? <p className={styles.copyOk}>Ссылка скопирована</p> : null}
      {copyState === "error" ? (
        <p className={styles.errorText} role="alert">
          Не удалось скопировать ссылку
        </p>
      ) : null}
      {pdfError ? (
        <p className={styles.errorText} role="alert">
          {pdfError}
        </p>
      ) : null}
    </div>
  );
}
