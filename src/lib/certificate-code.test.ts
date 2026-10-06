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

  it("rejects empty input", () => {
    assert.deepEqual(parseCertificateCode("   "), { ok: false, error: "Укажите код документа" });
  });
});

describe("extractCertificateCode", () => {
  it("returns promo code as-is", () => {
    assert.equal(extractCertificateCode("RC-ABC123"), "RC-ABC123");
  });

  it("returns empty for malformed URL", () => {
    assert.equal(extractCertificateCode("/certificate/%ZZ/add"), "");
  });
});
