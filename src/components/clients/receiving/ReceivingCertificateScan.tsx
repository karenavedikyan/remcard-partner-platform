"use client";

import { useState } from "react";
import { extractCertificateCode } from "@/lib/certificate-code";
import type { ReceivingCertificateEntryBody } from "@/lib/clients-parity/receiving-appeals-api";
import styles from "./receiving.module.css";

/** Prototype `renderScanInline` affordance — production uses server validation, no demo outcome radios. */
export type ReceivingCertificateScanProps = {
  disabled?: boolean;
  persistBlockedMessage?: string;
  onCancel?: () => void;
  onSubmit: (body: ReceivingCertificateEntryBody) => void | Promise<void>;
};

export function ReceivingCertificateScan({
  disabled = false,
  persistBlockedMessage,
  onCancel,
  onSubmit,
}: ReceivingCertificateScanProps) {
  const [rawCode, setRawCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <section
      className={`panel stack ca-scan ${styles.receivingShell}`}
      data-testid="ca-receiving-scan-shell"
    >
      <h2>Сканировать сертификат</h2>
      <p className="small muted">
        Сканер создаст обращение или откроет уже существующее. Проверка — через сервер (те же права,
        что и у store scan: <code>authorizeStoreScan</code> и read-only валидация сертификата).
      </p>

      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          if (disabled) {
            setError(
              persistBlockedMessage ??
                "Ввод сертификата недоступен до Clients certificate-entry API и P1 proxy.",
            );
            return;
          }
          const certificateCode = extractCertificateCode(rawCode.trim());
          if (!certificateCode) {
            setError("Укажите код сертификата или ссылку /certificate/…");
            return;
          }
          setSubmitting(true);
          try {
            await onSubmit({ promoCode: certificateCode });
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Не удалось обработать сертификат");
          } finally {
            setSubmitting(false);
          }
        }}
      >
        <label className="field ca-req">
          Код сертификата
          <input
            type="text"
            name="certificateCode"
            autoComplete="off"
            disabled={disabled || submitting}
            value={rawCode}
            onChange={(e) => setRawCode(e.target.value)}
            placeholder="RC-… или ссылка remcard.ru/certificate/…"
            data-testid="ca-receiving-scan-code"
          />
        </label>

        {error ? (
          <div className="notice is-error" role="alert" data-testid="ca-receiving-scan-error">
            {error}
          </div>
        ) : null}

        <div className="ca-form-actions">
          <button
            type="submit"
            className="btn primary"
            data-ca-action="scan:submit"
            disabled={disabled || submitting}
          >
            {submitting ? "Проверка…" : "Проверить и продолжить"}
          </button>
          {onCancel ? (
            <button type="button" className="btn ghost" onClick={onCancel} disabled={submitting}>
              К списку
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
