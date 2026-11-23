"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { StoreCertificate } from "@/lib/certificate-types";
import {
  clientVisibleDiscountSummary,
  getCertificateCodeForApi,
  isTestCertificateUrl,
  resolveCertificatePageUrl,
} from "@/lib/certificate-url";
import { displayCategoryLabel } from "@/lib/category-display";
import { RemcardApiError, remcardFetchBlob } from "@/lib/api-client";
import { detectMiniAppHost } from "@/lib/mini-app/host";
import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniIconCopy } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Props = {
  certificate: StoreCertificate;
  onBack: () => void;
};

function formatValidUntil(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU");
}

export function MiniAppCertificateReady({ certificate, onBack }: Props) {
  const pageUrl = useMemo(() => resolveCertificatePageUrl(certificate), [certificate]);
  const code = certificate.promoCode?.trim() || getCertificateCodeForApi(certificate) || "";
  const program =
    certificate.partners?.[0]?.categories?.[0]?.categoryLabel ||
    displayCategoryLabel(
      certificate.partners?.[0]?.categories?.[0]?.category ?? "",
      certificate.partners?.[0]?.categories?.[0]?.categoryLabel,
    );
  const clientName =
    certificate.clientUser?.displayName?.trim() ||
    (certificate as StoreCertificate & { agentClient?: { displayName?: string | null } }).agentClient
      ?.displayName?.trim() ||
    "";
  const programTitle = program?.trim() || "Программа";
  const discountSummary = clientVisibleDiscountSummary(certificate);
  const validUntilLabel = formatValidUntil(certificate.validUntil);

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [linkCopyState, setLinkCopyState] = useState<"idle" | "ok" | "error">("idle");
  const [pdfError, setPdfError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void QRCode.toDataURL(pageUrl, { margin: 4, width: 200, color: { dark: "#1b1f1a", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pageUrl]);

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
    <MiniAppSubpage
      title="Сертификат готов"
      lead="Покажите QR-код или поделитесь ссылкой с клиентом."
      onBack={onBack}
    >
      <div className={styles.certResultCard}>
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrDataUrl}
            alt=""
            className={styles.certQr}
            width={200}
            height={200}
            data-testid="mini-cert-qr"
          />
        ) : (
          <p className={styles.scanNotice}>QR недоступен</p>
        )}
        <p className={styles.certCode} data-testid="mini-cert-code">
          {code}
        </p>
        <p className={styles.certMetaTitle}>{programTitle}</p>
        {clientName ? <p className={styles.certMetaClient}>{clientName}</p> : null}
        <p className={styles.scanNotice}>{discountSummary}</p>
        {validUntilLabel ? <p className={styles.scanNotice}>Действует до {validUntilLabel}</p> : null}
      </div>
      {pageUrl ? (
        <button type="button" className={styles.secondaryBtn} onClick={() => openExternal(pageUrl)}>
          Посмотреть как клиент
        </button>
      ) : null}
      <button type="button" className={styles.primaryBtn} onClick={() => void copyText(code, "code")}>
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
      {pdfError ? (
        <p className={styles.scanBad} role="alert">
          {pdfError}
        </p>
      ) : null}
      {isTestCertificateUrl(pageUrl) ? (
        <p className={styles.scanNotice}>Тестовый контур — не для реальных клиентов.</p>
      ) : null}
      <button type="button" className={styles.secondaryBtn} onClick={onBack}>
        Вернуться в кабинет
      </button>
    </MiniAppSubpage>
  );
}