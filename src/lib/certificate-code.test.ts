import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractCertificateCode } from "./certificate-code.ts";

describe("extractCertificateCode", () => {
  it("returns promo code as-is", () => {
    assert.equal(extractCertificateCode("RC-ABC123"), "RC-ABC123");
  });

  it("extracts from production certificate URL", () => {
    assert.equal(
      extractCertificateCode("https://remcard.ru/certificate/RC-XYZ789"),
      "RC-XYZ789",
    );
  });

  it("extracts from test localhost URL", () => {
    assert.equal(
      extractCertificateCode("http://127.0.0.1:3001/certificate/BirihpFXYs3t"),
      "BirihpFXYs3t",
    );
  });

  it("extracts from add-page URL", () => {
    assert.equal(
      extractCertificateCode("http://127.0.0.1:3001/certificate/RC-ABC123/add"),
      "RC-ABC123",
    );
  });

  it("extracts qr code from path-only URL", () => {
    assert.equal(extractCertificateCode("/certificate/_e1zJdYE5kP5"), "_e1zJdYE5kP5");
  });

  it("does not treat arbitrary URLs as fetch targets", () => {
    assert.equal(extractCertificateCode("https://evil.example/certificate/x"), "x");
  });
});
