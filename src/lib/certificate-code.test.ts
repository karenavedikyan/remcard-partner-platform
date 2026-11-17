import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractCertificateCode, parseCertificateCode } from "./certificate-code.ts";

describe("parseCertificateCode", () => {
  it("returns promo code as-is", () => {
    assert.deepEqual(parseCertificateCode("RC-ABC123"), { ok: true, code: "RC-ABC123" });
  });

  it("extracts from production certificate URL", () => {
    assert.deepEqual(parseCertificateCode("https://remcard.ru/certificate/RC-XYZ789"), {
      ok: true,
      code: "RC-XYZ789",
    });
  });

  it("extracts from test localhost URL", () => {
    assert.deepEqual(
      parseCertificateCode("http://127.0.0.1:3001/certificate/BirihpFXYs3t"),
      { ok: true, code: "BirihpFXYs3t" },
    );
  });

  it("extracts from add-page URL", () => {
    assert.deepEqual(
      parseCertificateCode("http://127.0.0.1:3001/certificate/RC-ABC123/add"),
      { ok: true, code: "RC-ABC123" },
    );
  });

  it("rejects malformed percent-encoding in certificate URL", () => {
    const result = parseCertificateCode("/certificate/%ZZ/add");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Некорректная ссылка/);
    }
  });

  it("upper-cases a manually typed promo code", () => {
    assert.deepEqual(parseCertificateCode("rc-abc123"), { ok: true, code: "RC-ABC123" });
    assert.deepEqual(parseCertificateCode("  Rc-AbC123 "), { ok: true, code: "RC-ABC123" });
  });

  it("upper-cases a promo code taken from a link", () => {
    assert.deepEqual(parseCertificateCode("https://remcard.ru/certificate/rc-xyz789"), {
      ok: true,
      code: "RC-XYZ789",
    });
    assert.deepEqual(parseCertificateCode("/certificate/rc-abc123/add"), { ok: true, code: "RC-ABC123" });
    assert.deepEqual(parseCertificateCode("http://localhost:3001/certificate/rc-q1"), {
      ok: true,
      code: "RC-Q1",
    });
  });

  it("keeps opaque QR tokens case-exact", () => {
    assert.deepEqual(parseCertificateCode("https://remcard.ru/certificate/cmwju2VpR"), {
      ok: true,
      code: "cmwju2VpR",
    });
    assert.deepEqual(parseCertificateCode("cmwju2VpR"), { ok: true, code: "cmwju2VpR" });
  });

  it("rejects empty input", () => {
    assert.deepEqual(parseCertificateCode("   "), { ok: false, error: "Укажите код документа" });
  });
});

describe("extractCertificateCode", () => {
  it("returns promo code as-is", () => {
    assert.equal(extractCertificateCode("RC-ABC123"), "RC-ABC123");
  });

  it("upper-cases promo codes", () => {
    assert.equal(extractCertificateCode("rc-abc123"), "RC-ABC123");
  });

  it("returns empty for malformed URL", () => {
    assert.equal(extractCertificateCode("/certificate/%ZZ/add"), "");
  });
});
