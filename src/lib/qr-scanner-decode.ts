import { parseCertificateCode } from "@/lib/certificate-code";

export const QR_DECODE_DEDUP_MS = 2500;

export type QrLastEmit = {
  code: string;
  at: number;
};

export type QrDecodeInput = {
  raw: string;
  scanGeneration: number;
  activeGeneration: number;
  lastEmit: QrLastEmit | null;
  now: number;
};

export type QrDecodeEmit = {
  kind: "emit";
  raw: string;
  code: string;
  nextLastEmit: QrLastEmit;
};

export type QrDecodeResult =
  | { kind: "ignore" }
  | { kind: "error"; message: string }
  | QrDecodeEmit;

/**
 * Pure QR decode handler used by QrScanner.
 * Valid scans emit once; stale generation and dedup are ignored.
 */
export function processQrDecode(input: QrDecodeInput): QrDecodeResult {
  if (input.scanGeneration !== input.activeGeneration) {
    return { kind: "ignore" };
  }

  const parsed = parseCertificateCode(input.raw);
  if (!parsed.ok) {
    return { kind: "error", message: parsed.error };
  }

  if (
    input.lastEmit &&
    input.lastEmit.code === parsed.code &&
    input.now - input.lastEmit.at < QR_DECODE_DEDUP_MS
  ) {
    return { kind: "ignore" };
  }

  return {
    kind: "emit",
    raw: input.raw,
    code: parsed.code,
    nextLastEmit: { code: parsed.code, at: input.now },
  };
}
