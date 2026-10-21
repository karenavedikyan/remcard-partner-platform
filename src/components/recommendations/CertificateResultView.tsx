"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { displayCategoryLabel } from "@/lib/category-display";
import { RemcardApiError, remcardFetchBlob } from "@/lib/api-client";
import { certificateStatusLabel, certificateStatusTone } from "@/lib/certificate-labels";
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
import styles from "./recommendations.module.css";

type CertificateResultViewProps = {
  certificate: StoreCertificate;
  /** Public-facing code (e.g. А-RC-…); never includes private alias. */
  displayCode?: string | null;
  /** Shown only immediately after create, not on ordinary detail view. */
  showCreateSuccessBanner?: boolean;
  presentation?: "default" | "specialist";
  /** Owner-only label; never shown in QR/share/PDF payloads. */
  privateAlias?: string | null;
};

function collectOfferLines(certificate: StoreCertificate) {
  return (certificate.partners ?? []).flatMap((partner) =>
    partner.categories.map((cat) => ({
      key: `${partner.storeUserId}-${cat.category}`,
      partnerName: partner.storeName,
      categoryLabel: displayCategoryLabel(cat.category, cat.categoryLabel),
      discountPercent: cat.discountPercent,
    })),
  );
}

function RemcardBrandMark() {
  return (
    <div className={styles.specialistCertBrand} aria-hidden>
      <span className={styles.specialistCertLogo}>
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6 26V12l10-7 10 7v14H20v-8h-8v8H6z"
            fill="currentColor"
          />
        </svg>
      </span>
      <span>RemCard</span>
    </div>
  );
}

export function CertificateResultView({
  certificate,
  displayCode,
  showCreateSuccessBanner = false,
  presentation = "default",
  privateAlias = null,
}: CertificateResultViewProps) {
  const shownCode = displayCode?.trim() || certificate.promoCode;
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [codeCopyState, setCodeCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [pdfError, setPdfError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const pageUrl = useMemo(() => resolveCertificatePageUrl(certificate), [certificate]);
  const testOnlyLink = isTestCertificateUrl(pageUrl);
  const offerLines = useMemo(() => collectOfferLines(certificate), [certificate]);
  const partnerHeadline = useMemo(() => {
    const names = [
      ...new Set((certificate.partners ?? []).map((p) => p.storeName).filter(Boolean)),
    ];
    if (names.length > 0) return names.join(", ");
    return certificateDisplayTitle(certificate);
  }, [certificate]);

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

  async function copyText(value: string, kind: "link" | "code") {
    const setState = kind === "link" ? setLinkCopyState : setCodeCopyState;
    if (!value.trim()) {
      setState("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setState("ok");
    } catch {
      setState("error");
    }
  }

  async function copyLink() {
    await copyText(pageUrl, "link");
  }

  async function copyCode() {
    await copyText(shownCode, "code");
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

  if (presentation === "specialist") {
    const offerCount = offerLines.length;
    const offerCountLabel =
      offerCount === 1
        ? "1 предложение"
        : offerCount >= 2 && offerCount <= 4
          ? `${offerCount} предложения`
          : `${offerCount} предложений`;
    const statusLabel = certificateStatusLabel(certificate.status);

    return (
      <section
        className={styles.specialistCertWrap}
        data-testid="specialist-certificate-preview"
      >
        {showCreateSuccessBanner ? (
          <div className={styles.successBanner}>Готово — документ создан</div>
        ) : null}

        <article className={styles.specialistCertCard}>
          <RemcardBrandMark />
          <span className={styles.specialistCertBadge}>{statusLabel}</span>
          <h2 className={styles.specialistCertTitle}>Скидочный сертификат RemCard</h2>
          <p className={styles.specialistCertPartner}>{partnerHeadline}</p>
          <div className={styles.specialistCertOffers}>
            {offerCount > 0 ? (
              <>
                <strong>{offerCountLabel}</strong>
                <span>
                  {[...new Set(offerLines.map((o) => o.partnerName))].join(" · ")}
                </span>
              </>
            ) : (
              <span>Уточните предложение у партнёра</span>
            )}
          </div>
          <div className={styles.specialistCertQr}>
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt={`QR-код документа ${shownCode}`}
                data-testid="specialist-certificate-preview-qr"
              />
            ) : null}
          </div>
          <div className={styles.specialistCertCode} data-testid="certificate-code">
            {shownCode}
          </div>
          <Button type="button" variant="secondary" onClick={() => void copyCode()}>
            Скопировать код
          </Button>
          {privateAlias?.trim() ? (
            <div className={styles.specialistCertManagement}>
              <span className={styles.specialistCertManagementLabel}>Название для себя</span>
              <strong>{privateAlias.trim()}</strong>
            </div>
          ) : null}
        </article>

        {pageUrl ? (
          <a
            className={styles.specialistCertPublicLink}
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Посмотреть как клиент
          </a>
        ) : null}

        <details className={styles.specialistCertDetails}>
          <summary>Условия и информация о создании</summary>
          {offerLines.length > 0 ? (
            <ul>
              {offerLines.map((line) => (
                <li key={line.key}>
                  {line.partnerName} · {line.categoryLabel}: скидка {line.discountPercent}%
                </li>
              ))}
            </ul>
          ) : (
            <p>Скидка для клиента: {clientVisibleDiscountSummary(certificate)}</p>
          )}
        </details>

        {testOnlyLink ? (
          <p className={styles.notice}>
            Клиентская ссылка относится к тестовому контуру и не предназначена для отправки
            реальным клиентам. Для production задайте `NEXT_PUBLIC_CERTIFICATE_BASE_URL` на
            рабочий публичный домен RemCard.
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

        {codeCopyState === "ok" ? <p className={styles.copyOk}>Код скопирован</p> : null}
        {codeCopyState === "error" ? (
          <p className={styles.errorText} role="alert">
            Не удалось скопировать код
          </p>
        ) : null}
        {linkCopyState === "ok" ? <p className={styles.copyOk}>Ссылка скопирована</p> : null}
        {linkCopyState === "error" ? (
          <p className={styles.errorText} role="alert">
            Не удалось скопировать ссылку
          </p>
        ) : null}
        {pdfError ? (
          <p className={styles.errorText} role="alert">
            {pdfError}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <div className={styles.resultWrap} data-testid="recommendation-create-success">
      {showCreateSuccessBanner ? (
        <div className={styles.successBanner}>Готово — документ создан</div>
      ) : null}

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
          {offerLines.map((line) => (
            <li key={line.key}>
              {line.categoryLabel}: скидка {line.discountPercent}%
            </li>
          ))}
        </ul>

        <div className={styles.codeRow}>
          <span className={styles.codeValue}>{shownCode}</span>
        </div>

        {qrDataUrl ? (
          <div className={styles.qrBox}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt={`QR-код документа ${shownCode}`} />
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

      {linkCopyState === "ok" ? <p className={styles.copyOk}>Ссылка скопирована</p> : null}
      {linkCopyState === "error" ? (
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
