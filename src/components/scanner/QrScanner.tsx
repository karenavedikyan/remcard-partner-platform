"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { extractCertificateCode } from "@/lib/certificate-code";
import { Button } from "@/components/ui/Button";
import styles from "./scanner.module.css";

type QrScannerProps = {
  onCode: (code: string) => void;
  onError: (message: string) => void;
};

const READER_ID = "partner-scanner-qr-reader";
const DEDUP_MS = 2500;

export function QrScanner({ onCode, onError }: QrScannerProps) {
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const [active, setActive] = useState(false);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // ignore stop errors
      }
      scannerRef.current = null;
    }
    setActive(false);
  }, []);

  const handleDecode = useCallback(
    (raw: string) => {
      const code = extractCertificateCode(raw);
      if (!code) {
        return;
      }
      const now = Date.now();
      if (
        lastCodeRef.current &&
        lastCodeRef.current.code === code &&
        now - lastCodeRef.current.at < DEDUP_MS
      ) {
        return;
      }
      lastCodeRef.current = { code, at: now };
      void stopCamera();
      onCode(code);
    },
    [onCode, stopCamera],
  );

  const startCamera = useCallback(async () => {
    await stopCamera();
    setActive(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const html5 = new Html5Qrcode(READER_ID);
      scannerRef.current = html5;
      await html5.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => handleDecode(decoded),
        () => {},
      );
    } catch {
      setActive(false);
      onError(
        "Не удалось запустить камеру. Разрешите доступ или используйте ручной ввод кода.",
      );
    }
  }, [handleDecode, onError, stopCamera]);

  useEffect(() => {
    void startCamera();
    return () => {
      void stopCamera();
    };
  }, [startCamera, stopCamera]);

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
