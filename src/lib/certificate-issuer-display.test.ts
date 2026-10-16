import { describe, expect, it } from "vitest";
import { formatCertificateDisplayCode } from "./certificate-issuer-display";
import { storeCertificateDisplayCode } from "./certificate-url";
import type { StoreCertificate } from "./certificate-types";

describe("formatCertificateDisplayCode", () => {
  it("prefixes agent codes without changing promo resolver token", () => {
    expect(formatCertificateDisplayCode("RC-JXHDPR", "AGENT")).toBe("А-RC-JXHDPR");
  });

  it("leaves legacy codes unchanged when snapshot missing", () => {
    expect(formatCertificateDisplayCode("RC-LEGACY1", null)).toBe("RC-LEGACY1");
  });

  it("storeCertificateDisplayCode uses issuer snapshot from create payload", () => {
    const cert = {
      promoCode: "RC-JXHDPR",
      issuerKindSnapshot: "AGENT",
    } as StoreCertificate;
    expect(storeCertificateDisplayCode(cert)).toBe("А-RC-JXHDPR");
  });
});
