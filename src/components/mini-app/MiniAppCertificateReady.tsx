"use client";

import { useMemo, useState } from "react";
import type { StoreCertificate } from "@/lib/certificate-types";
import {
  clientVisibleDiscountSummary,
  getCertificateCodeForApi,
  isTestCertificateUrl,
  resolveCertificatePageUrl,
  storeCertificateDisplayCode,
} from "@/lib/certificate-url";
import { displayCategoryLabel } from "@/lib/category-display";
import { RemcardApiError, remcardFetchBlob } from "@/lib/api-client";
import { detectMiniAppHost } from "@/lib/mini-app/host";
import { buildIssuedCertificatePreview } from "@/lib/certificate-issued-preview";
import { PartnerClientCertificateCard } from "@/components/recommendations/PartnerClientCertificateCard";
import { CertificateResultIssuedRecipientPolicies } from "@/components/recommendations/CertificateResultIssuedRecipientPolicies";
import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniIconCopy } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Props = {
  certificate: StoreCertificate;
  onBack: () => void;
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

export function MiniAppCertificateReady({ certificate, onBack }: Props) {
  const pageUrl = useMemo(() => resolveCertificatePageUrl(certificate), [certificate]);
  const shownCode = storeCertificateDisplayCode(certificate);
  const discountSummary = clientVisibleDiscountSummary(certificate);
  const offerLines = useMemo(() => collectOfferLines(certificate), [certificate]);

  const issuedPreview = useMemo(
    () => buildIssuedCertificatePreview(certificate, shownCode, pageUrl),
    [certificate, shownCode, pageUrl],
  );

  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [pdfError, setPdfError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  function openExternal(url: string) {
    const host = detectMiniAppHost();
    if (host) host.openExternalLink(url);
    else window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyText(value: string, kind: "code" | "link") {
    const setState = kind === "code" ? setCopyState : setLinkCopyState;
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

  async function shareLink() {
    if (!pageUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Ваша рекомендация RemCard",
          text: "Скидка по рекомендации RemCard",
          url: pageUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyText(pageUrl, "link");
  }

  async function downloadPdf() {
    setPdfError("");
    setPdfLoading(true);
    try {
      const lookup = getCertificateCodeForApi(certificate);
      if (!lookup) throw new Error("Не удалось определить код документа");
      const { blob, filename } = await remcardFetchBlob(
        `/api/certificate/${encodeURIComponent(lookup)}/pdf`,
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
      if (caught instanceof RemcardApiError) {
        setPdfError(caught.message);
      } else {
        setPdfError("Не удалось скачать PDF. Откройте клиентскую ссылку в браузере.");
      }
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <MiniAppSubpage title="Сертификат готов" lead="Покажите QR-код или поделитесь ссылкой с клиентом." onBack={onBack}>
      <div className={styles.lkCertWrap} data-testid="recommendation-create-success">
        <div className={styles.lkCertBanner}>Готово — документ создан</div>
        <div data-testid="mini-cert-ready-card">
          {issuedPreview.kind === "policy-dark" ? (
            <PartnerClientCertificateCard
              model={issuedPreview.model}
              policyRows={issuedPreview.rows}
            />
          ) : (
            <>
              <PartnerClientCertificateCard model={issuedPreview.model} />
              <CertificateResultIssuedRecipientPolicies certificate={certificate} />
            </>
          )}
        </div>
        {pageUrl ? (
          <button
            type="button"
            className={styles.lkCertPublicLink}
            data-testid="certificate-public-view"
            data-cert-action="preview"
            onClick={() => openExternal(pageUrl)}
          >
            Посмотреть как клиент
          </button>
        ) : null}
        <details className={styles.lkCertDetails}>
          <summary>Условия приёма</summary>
          {offerLines.length > 0 ? (
            <ul className={styles.lkCertOfferList}>
              {offerLines.map((line) => (
                <li key={line.key}>
                  {line.partnerName} · {line.categoryLabel}: скидка {line.discountPercent}%
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.scanNotice}>{discountSummary}</p>
          )}
        </details>
        <p className={styles.certCode} data-testid="mini-cert-code">
          {shownCode}
        </p>
        <div className={styles.lkCertActions}>
          <button type="button" className={styles.primaryBtn} onClick={() => void copyText(shownCode, "code")}>
            <MiniIconCopy />
            {copyState === "ok" ? "Скопировано" : "Скопировать код"}
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={!pageUrl}
            onClick={() => void copyText(pageUrl, "link")}
          >
            {linkCopyState === "ok" ? "Ссылка скопирована" : "Скопировать ссылку"}
          </button>
          <button type="button" className={styles.secondaryBtn} disabled={!pageUrl} onClick={() => void shareLink()}>
            Поделиться
          </button>
          <button type="button" className={styles.secondaryBtn} disabled={pdfLoading} onClick={() => void downloadPdf()}>
            {pdfLoading ? "Загрузка PDF…" : "Скачать PDF"}
          </button>
        </div>
        {pdfError ? (
          <p className={styles.scanBad} role="alert">
            {pdfError}
          </p>
        ) : null}
        {isTestCertificateUrl(pageUrl) ? (
          <p className={styles.scanNotice}>Тестовый контур — не для реальных клиентов.</p>
        ) : null}
      </div>
    </MiniAppSubpage>
  );
}