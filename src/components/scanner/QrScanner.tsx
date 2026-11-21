"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { processQrDecode, type QrLastEmit } from "@/lib/qr-scanner-decode";
import { Button } from "@/components/ui/Button";
import scannerButtonStyles from "./scanner-control-button.module.css";
import styles from "./scanner.module.css";

type QrScannerProps = {
  onCode: (raw: string) => void;
  onError: (message: string) => void;
};

const READER_ID = "partner-scanner-qr-reader";

async function stopScanner(scanner: { stop: () => Promise<void> } | null) {
  try {
    await scanner?.stop();
  } catch {
    // An interrupted start can make stop throw before it returns a promise.
  }
}

export function QrScanner({ onCode, onError }: QrScannerProps) {
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const lastEmitRef = useRef<QrLastEmit | null>(null);
  const generationRef = useRef(0);
  const callbacksRef = useRef({ onCode, onError });
  const [active, setActive] = useState(false);

  useEffect(() => {
    callbacksRef.current = { onCode, onError };
  }, [onCode, onError]);

  const stopCamera = useCallback(async () => {
    generationRef.current += 1;
    const html5 = scannerRef.current;
    scannerRef.current = null;
    await stopScanner(html5);
    setActive(false);
  }, []);

  const handleDecode = useCallback(
    (raw: string, scanGeneration: number) => {
      const result = processQrDecode({
        raw,
        scanGeneration,
        activeGeneration: generationRef.current,
        lastEmit: lastEmitRef.current,
        now: Date.now(),
      });

      if (result.kind === "ignore") {
        return;
      }

      if (result.kind === "error") {
        callbacksRef.current.onError(result.message);
        return;
      }

      lastEmitRef.current = result.nextLastEmit;
      callbacksRef.current.onCode(result.raw);
      void stopCamera();
    },
    [stopCamera],
  );

  useEffect(() => {
    const scanGeneration = generationRef.current + 1;
    generationRef.current = scanGeneration;
    let cancelled = false;

    async function startCamera() {
      setActive(true);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled || scanGeneration !== generationRef.current) {
          return;
        }

        const html5 = new Html5Qrcode(READER_ID);
        scannerRef.current = html5;
        await html5.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          (decoded) => handleDecode(decoded, scanGeneration),
          () => {},
        );

        if (cancelled || scanGeneration !== generationRef.current) {
          await stopScanner(html5);
          if (scannerRef.current === html5) {
            scannerRef.current = null;
          }
          setActive(false);
        }
      } catch {
        if (!cancelled && scanGeneration === generationRef.current) {
          setActive(false);
          callbacksRef.current.onError(
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
      void stopScanner(html5);
      setActive(false);
    };
  }, [handleDecode]);

  return (
    <div className={styles.cameraWrap}>
      <div id={READER_ID} className={styles.qrReader} />
      {active ? (
        <div style={{ padding: "var(--space-3)" }}>
          <Button
            variant="secondary"
            className={scannerButtonStyles.controlButton}
            onClick={() => void stopCamera()}
          >
            Остановить камеру
          </Button>
        </div>
      ) : null}
    </div>
  );
}
