"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import type { StoreCertificate } from "@/lib/certificate-types";
import {
  getCertificateCodeForApi,
  resolveCertificatePageUrl,
} from "@/lib/certificate-url";
import { displayCategoryLabel } from "@/lib/category-display";
import { MiniAppSubpage } from "./MiniAppSubpage";
import { MiniIconCopy } from "./MiniAppIcons";
import styles from "./mini-app.module.css";

type Props = {
  certificate: StoreCertificate;
  onBack: () => void;
};

export function MiniAppCertificateReady({ certificate, onBack }: Props) {
  const pageUrl = useMemo(() => resolveCertificatePageUrl(certificate), [certificate]);
  const code = certificate.promoCode?.trim() || getCertificateCodeForApi(certificate) || "";
  const program =
    certificate.partners?.[0]?.categories?.[0]?.categoryLabel ||
    displayCategoryLabel(
      certificate.partners?.[0]?.categories?.[0]?.category ?? "",
      certificate.partners?.[0]?.categories?.[0]?.categoryLabel,
    );
  const clientName = certificate.clientUser?.displayName?.trim() || "";
  const programTitle = program?.trim() || "Программа";

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "error">("idle");

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

  async function copyCode() {
    if (!code) {
      setCopyState("error");
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("ok");
    } catch {
      setCopyState("error");
    }
  }

  return (
    <MiniAppSubpage
      title="Сертификат готов"
      lead="Покажите QR-код или поделитесь кодом с клиентом."
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
      </div>
      <button type="button" className={styles.primaryBtn} onClick={() => void copyCode()}>
        <MiniIconCopy />
        {copyState === "ok" ? "Скопировано" : "Скопировать код"}
      </button>
      <button type="button" className={styles.secondaryBtn} onClick={onBack}>
        Вернуться в кабинет
      </button>
    </MiniAppSubpage>
  );
}
