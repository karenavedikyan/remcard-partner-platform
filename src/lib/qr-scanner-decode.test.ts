import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processQrDecode, QR_DECODE_DEDUP_MS } from "./qr-scanner-decode.ts";

const VALID_URL = "https://remcard.ru/certificate/RC-TEST01";

describe("processQrDecode", () => {
  it("emits once for a valid QR from an active scanner generation", () => {
    const result = processQrDecode({
      raw: VALID_URL,
      scanGeneration: 1,
      activeGeneration: 1,
      lastEmit: null,
      now: 1000,
    });

    assert.equal(result.kind, "emit");
    if (result.kind === "emit") {
      assert.equal(result.raw, VALID_URL);
      assert.equal(result.code, "RC-TEST01");
    }
  });

  it("ignores duplicate decode within dedup window", () => {
    const first = processQrDecode({
      raw: VALID_URL,
      scanGeneration: 1,
      activeGeneration: 1,
      lastEmit: null,
      now: 1000,
    });
    assert.equal(first.kind, "emit");

    const second = processQrDecode({
      raw: VALID_URL,
      scanGeneration: 1,
      activeGeneration: 1,
      lastEmit: first.kind === "emit" ? first.nextLastEmit : null,
      now: 1000 + QR_DECODE_DEDUP_MS - 1,
    });
    assert.equal(second.kind, "ignore");
  });

  it("ignores decode after scanner generation was closed", () => {
    const result = processQrDecode({
      raw: VALID_URL,
      scanGeneration: 1,
      activeGeneration: 2,
      lastEmit: null,
      now: 1000,
    });
    assert.equal(result.kind, "ignore");
  });
});

describe("QrScanner handler contract", () => {
  it("calls onCode exactly once before bumping generation on valid QR", () => {
    let generation = 1;
    let onCodeCalls = 0;
    let previewCalls = 0;
    const lastEmit = { current: null as { code: string; at: number } | null };

    function handleDecode(raw: string, scanGeneration: number) {
      const result = processQrDecode({
        raw,
        scanGeneration,
        activeGeneration: generation,
        lastEmit: lastEmit.current,
        now: Date.now(),
      });
      if (result.kind !== "emit") {
        return;
      }
      lastEmit.current = result.nextLastEmit;
      onCodeCalls += 1;
      previewCalls += 1;
      generation += 1;
    }

    handleDecode(VALID_URL, 1);
    handleDecode(VALID_URL, 1);

    assert.equal(onCodeCalls, 1);
    assert.equal(previewCalls, 1);
  });

  it("does not call onCode after scanner close", () => {
    let generation = 2;
    let onCodeCalls = 0;

    function handleDecode(raw: string, scanGeneration: number) {
      const result = processQrDecode({
        raw,
        scanGeneration,
        activeGeneration: generation,
        lastEmit: null,
        now: Date.now(),
      });
      if (result.kind === "emit") {
        onCodeCalls += 1;
      }
    }

    handleDecode(VALID_URL, 1);
    assert.equal(onCodeCalls, 0);
  });
});
