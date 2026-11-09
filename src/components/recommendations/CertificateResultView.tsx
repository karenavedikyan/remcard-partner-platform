"use client";

import { useMemo, useState } from "react";
import { displayCategoryLabel } from "@/lib/category-display";
import { RemcardApiError, remcardFetchBlob } from "@/lib/api-client";
import {
  clientVisibleDiscountSummary,
  getCertificateCodeForApi,
  isTestCertificateUrl,
  resolveCertificatePageUrl,
} from "@/lib/certificate-url";
import type { StoreCertificate } from "@/lib/certificate-types";
import { buildStoreCertificateClientCardModel } from "@/lib/storeCertificateClientCardModel";
import { Button } from "@/components/ui/Button";
import { PartnerClientCertificateCard } from "./PartnerClientCertificateCard";
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

export function CertificateResultView({
  certificate,
  displayCode,
  showCreateSuccessBanner = false,
  presentation: _presentation = "default",
  privateAlias = null,
}: CertificateResultViewProps) {
  const shownCode = displayCode?.trim() || certificate.promoCode;
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [codeCopyState, setCodeCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [pdfError, setPdfError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  const pageUrl = useMemo(() => resolveCertificatePageUrl(certificate), [certificate]);
  const testOnlyLink = isTestCertificateUrl(pageUrl);
  const offerLines = useMemo(() => collectOfferLines(certificate), [certificate]);

  const cardModel = useMemo(
    () => buildStoreCertificateClientCardModel(certificate, shownCode, pageUrl),
    [certificate, shownCode, pageUrl],
  );

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

  return (
    <section className={styles.specialistCertWrap} data-testid="recommendation-create-success">
      <div data-testid="specialist-certificate-preview">
        {showCreateSuccessBanner ? (
          <div className={styles.successBanner}>Готово — документ создан</div>
        ) : null}

        <PartnerClientCertificateCard model={cardModel} />

        {privateAlias?.trim() ? (
          <div className={styles.specialistCertManagement}>
            <span className={styles.specialistCertManagementLabel}>Название для себя</span>
            <strong>{privateAlias.trim()}</strong>
          </div>
        ) : null}

        {pageUrl ? (
          <a
            className={styles.specialistCertPublicLink}
            href={pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="certificate-public-view"
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
      </div>

      <div className={styles.specialistCertActionRow}>
        <Button onClick={() => void copyCode()}>{codeCopyState === "ok" ? "Код скопирован" : "Скопировать код"}</Button>
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
