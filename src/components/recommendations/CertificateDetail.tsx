"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { StoreCertificate } from "@/lib/certificate-types";
import { Button } from "@/components/ui/Button";
import { storeCertificateDisplayCode } from "@/lib/certificate-url";
import { CertificateResultView } from "./CertificateResultView";
import styles from "./recommendations.module.css";

type CertificateDetailProps = {
  certificateId: string;
  listHref?: string;
  createHref?: string;
  backLabel?: string;
  createAnotherLabel?: string;
};

export function CertificateDetail({
  certificateId,
  listHref = "/recommendations",
  createHref = "/recommendations/new",
  backLabel = "К списку",
  createAnotherLabel = "Создать ещё",
}: CertificateDetailProps) {
  const [certificate, setCertificate] = useState<StoreCertificate | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "loaded" | "error">("loading");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoadState("loading");
    setError("");
    try {
      const data = await remcardFetch<StoreCertificate>(
        `/api/store/certificate/${encodeURIComponent(certificateId)}`,
      );
      setCertificate(data);
      setLoadState("loaded");
    } catch (caught) {
      setCertificate(null);
      setLoadState("error");
      setError(
        caught instanceof RemcardApiError ? caught.message : "Не удалось загрузить документ",
      );
    }
  }, [certificateId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadState === "loading") {
    return <p className={styles.loading}>Загрузка документа…</p>;
  }

  if (loadState === "error") {
    return (
      <div className={styles.errorBlock}>
        <p role="alert">{error}</p>
        <Button variant="secondary" onClick={() => void load()}>
          Повторить
        </Button>
        <Link href={listHref}>
          <Button variant="secondary">{backLabel}</Button>
        </Link>
      </div>
    );
  }

  if (!certificate) {
    return null;
  }

  return (
    <>
      <div className={styles.pageActions}>
        <Link href={listHref}>
          <Button variant="secondary">{backLabel}</Button>
        </Link>
        <Link href={createHref}>
          <Button>{createAnotherLabel}</Button>
        </Link>
      </div>
      <CertificateResultView
        certificate={certificate}
        displayCode={storeCertificateDisplayCode(certificate)}
      />
    </>
  );
}
