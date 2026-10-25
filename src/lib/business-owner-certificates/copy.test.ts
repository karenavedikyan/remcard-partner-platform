import { describe, expect, it } from "vitest";
import { businessCertificatesPageCopy } from "./copy";

describe("businessCertificatesPageCopy", () => {
  it("uses Магазin eyebrow for STORE", () => {
    expect(businessCertificatesPageCopy({ partnerType: "STORE" }).eyebrow).toBe("Магазин");
  });

  it("uses Компания eyebrow for COMPANY", () => {
    expect(businessCertificatesPageCopy({ partnerType: "COMPANY" }).eyebrow).toBe("Компания");
  });

  it("does not expose specialist/agent labels", () => {
    const copy = businessCertificatesPageCopy({ partnerType: "STORE" });
    expect(copy.title).toBe("Сертификаты");
    expect(JSON.stringify(copy)).not.toMatch(/СПЕЦИАЛИСТ|АГЕНТ|R03|R06/);
  });
});
