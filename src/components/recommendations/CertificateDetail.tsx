"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";
import type { StoreCertificate } from "@/lib/certificate-types";
import { Button } from "@/components/ui/Button";
import { CertificateResultView } from "./CertificateResultView";
import styles from "./recommendations.module.css";

type CertificateDetailProps = {
  certificateId: string;
};

export function CertificateDetail({ certificateId }: CertificateDetailProps) {
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
        <Link href="/recommendations">
          <Button variant="secondary">К списку</Button>
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
        <Link href="/recommendations">
          <Button variant="secondary">К списку</Button>
        </Link>
        <Link href="/recommendations/new">
          <Button>Создать ещё</Button>
        </Link>
      </div>
      <CertificateResultView certificate={certificate} />
    </>
  );
}
