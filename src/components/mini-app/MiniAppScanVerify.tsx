"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { QrScanner } from "@/components/scanner/QrScanner";
import { TextField } from "@/components/ui/FormField";
import { parseCertificateCode } from "@/lib/certificate-code";
import { miniAppStoreScanLookup } from "@/lib/mini-app/api";
import styles from "./mini-app.module.css";

type Props = {
  branchId: string | null;
  onDone: () => void;
  embed?: boolean;
};

export function MiniAppScanVerify({ branchId, onDone, embed = false }: Props) {
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<
    | { kind: "idle" }
    | { kind: "valid"; title: string; details: string }
    | { kind: "invalid"; message: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });

  const lookup = useCallback(
    async (raw: string) => {
      const parsed = parseCertificateCode(raw);
      if (!parsed.ok) {
        setResult({ kind: "invalid", message: parsed.error || "Не удалось распознать код сертификата." });
        return;
      }
      const code = parsed.code;
      setLoading(true);
      setResult({ kind: "idle" });
      try {
        const res = await miniAppStoreScanLookup(code, branchId);
        if (res.valid) {
          const usage =
            res.maxUsages && res.maxUsages > 0
              ? `Использований: ${res.usageCount ?? 0} из ${res.maxUsages}`
              : "Без лимита использований";
          setResult({
            kind: "valid",
            title: res.clientDisplayName || "Сертификат действителен",
            details: [res.promoCode ? `Код: ${res.promoCode}` : null, usage].filter(Boolean).join(" · "),
          });
        } else {
          setResult({ kind: "invalid", message: res.reason || "Сертификат недоступен в этом филиале." });
        }
      } catch {
        setResult({ kind: "error", message: "Не удалось проверить сертификат. Проверьте сеть." });
      } finally {
        setLoading(false);
      }
    },
    [branchId],
  );

  return (
    <section className={styles.scanPanel} aria-labelledby={embed ? undefined : "mini-scan-title"}>
      {embed ? null : (
        <header className={styles.scanHeader}>
          <button type="button" className={styles.backBtn} onClick={onDone}>
            ← Назад
          </button>
          <h2 id="mini-scan-title">Проверка QR</h2>
          <p className={styles.scanLead}>Проверка не активирует и не списывает сертификат.</p>
        </header>
      )}
      <QrScanner
        onCode={(raw) => void lookup(raw)}
        onError={(message) => setCameraError(message)}
      />
      {cameraError ? (
        <p className={styles.scanNotice} role="alert">
          {cameraError}
        </p>
      ) : null}
      <form
        className={styles.manualForm}
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(manual);
        }}
      >
        <TextField
          label="Код вручную"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className={styles.primaryBtn} disabled={loading || !manual.trim()}>
          {loading ? "Проверка…" : "Проверить"}
        </button>
      </form>
      {result.kind === "valid" ? (
        <ScanResultBox className={styles.scanOk} testId="scan-result-valid">
          <strong>{result.title}</strong>
          <span>{result.details}</span>
        </ScanResultBox>
      ) : null}
      {result.kind === "invalid" ? (
        <ScanResultBox className={styles.scanBad} testId="scan-result-invalid">
          {result.message}
        </ScanResultBox>
      ) : null}
      {result.kind === "error" ? (
        <ScanResultBox className={styles.scanBad} testId="scan-result-error">
          {result.message}
        </ScanResultBox>
      ) : null}
    </section>
  );
}

function ScanResultBox({
  children,
  className,
  testId,
}: {
  children: ReactNode;
  className: string;
  testId: string;
}) {
  return (
    <p className={className} data-testid={testId}>
      {children}
    </p>
  );
}