"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseCertificateCode } from "@/lib/certificate-code";
import { Button } from "@/components/ui/Button";
import styles from "./scanner.module.css";

type QrScannerProps = {
  onCode: (raw: string) => void;
  onError: (message: string) => void;
};

const READER_ID = "partner-scanner-qr-reader";
const DEDUP_MS = 2500;

export function QrScanner({ onCode, onError }: QrScannerProps) {
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const generationRef = useRef(0);
  const [active, setActive] = useState(false);

  const stopCamera = useCallback(async () => {
    generationRef.current += 1;
    const html5 = scannerRef.current;
    scannerRef.current = null;
    if (html5) {
      try {
        await html5.stop();
      } catch {
        // ignore stop errors
      }
    }
    setActive(false);
  }, []);

  const handleDecode = useCallback(
    (raw: string, generation: number) => {
      if (generation !== generationRef.current) {
        return;
      }

      const parsed = parseCertificateCode(raw);
      if (!parsed.ok) {
        onError(parsed.error);
        return;
      }

      const now = Date.now();
      if (
        lastCodeRef.current &&
        lastCodeRef.current.code === parsed.code &&
        now - lastCodeRef.current.at < DEDUP_MS
      ) {
        return;
      }
      lastCodeRef.current = { code: parsed.code, at: now };
      void stopCamera();
      if (generation === generationRef.current) {
        onCode(raw);
      }
    },
    [onCode, onError, stopCamera],
  );

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    let cancelled = false;

    async function startCamera() {
      setActive(true);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || generation !== generationRef.current) {
          return;
        }

        const html5 = new Html5Qrcode(READER_ID);
        scannerRef.current = html5;
        await html5.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => handleDecode(decoded, generation),
          () => {},
        );

        if (cancelled || generation !== generationRef.current) {
          try {
            await html5.stop();
          } catch {
            // ignore
          }
          if (scannerRef.current === html5) {
            scannerRef.current = null;
          }
          setActive(false);
        }
      } catch {
        if (!cancelled && generation === generationRef.current) {
          setActive(false);
          onError(
            "Не удалось запустить камеру. Разрешите доступ или используйте ручной ввод кода.",
          );
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      generationRef.current += 1;
      const html5 = scannerRef.current;
      scannerRef.current = null;
      if (html5) {
        void html5.stop().catch(() => {});
      }
      setActive(false);
    };
  }, [handleDecode, onError]);

  return (
    <div className={styles.cameraWrap}>
      <div id={READER_ID} className={styles.qrReader} />
      {active ? (
        <div style={{ padding: "var(--space-3)" }}>
          <Button variant="secondary" onClick={() => void stopCamera()}>
            Остановить камеру
          </Button>
        </div>
      ) : null}
    </div>
  );
}
