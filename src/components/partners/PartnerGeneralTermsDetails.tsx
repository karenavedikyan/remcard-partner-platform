"use client";

import { useEffect, useState } from "react";
import {
  fetchPartnerCertificateProgram,
  type PartnerCertProgramState,
} from "@/lib/partner-certificate-program";
import styles from "./PartnerGeneralTermsDetails.module.css";

type PartnerGeneralTermsDetailsProps = {
  partnerUserId: string;
  className?: string;
};

export function PartnerGeneralTermsDetails({
  partnerUserId,
  className,
}: PartnerGeneralTermsDetailsProps) {
  const [state, setState] = useState<PartnerCertProgramState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    void fetchPartnerCertificateProgram(partnerUserId).then((next) => {
      if (!cancelled) setState(next);
    });
    return () => {
      cancelled = true;
    };
  }, [partnerUserId, reloadKey]);

  return (
    <details className={[styles.optional, className].filter(Boolean).join(" ")}>
      <summary>Общие условия для агентов</summary>
      {state.status === "loading" ? (
        <p className={styles.muted}>Загрузка…</p>
      ) : null}
      {state.status === "error" ? (
        <p className={styles.error} role="alert">
          {state.message}{" "}
          <button
            type="button"
            className={styles.retry}
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Повторить
          </button>
        </p>
      ) : null}
      {state.status === "empty" ? (
        <p className={styles.muted}>
          Общие условия пока не опубликованы. Можно запросить персональное предложение.
        </p>
      ) : null}
      {state.status === "loaded" ? (
        <>
          <ul className={styles.list}>
            {state.items.map((item) => (
              <li key={item.category}>
                {item.categoryLabel}: общий процент {item.poolPercent}%
                {item.poolPercent === 0 ? " (участие без вознаграждения)" : null}
              </li>
            ))}
          </ul>
          {state.truncated ? (
            <p className={styles.muted}>Показаны первые категории; полный список у партнёра в кабинете.</p>
          ) : null}
          <p className={styles.disclaimer}>
            Это общий процент на скидку клиенту и бонус агенту, не гарантированный доход. Итоговые
            условия партнёр предложит после приглашения.
          </p>
        </>
      ) : null}
    </details>
  );
}
