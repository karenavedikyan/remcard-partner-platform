import { describe, expect, it } from "vitest";
import { PARTNER_KIND_UI_LABELS, resolvePartnerKindUi } from "./partner-kind-ui";
import { resolvePublicPartnerType } from "@/lib/agent-r04/partner-filters";

describe("resolvePartnerKindUi (canonical primary type)", () => {
  it("classifies pure agent with legacy technical COMPANY", () => {
    const input = { partnerType: "COMPANY", partnerActivities: ["AGENT"] };
    expect(resolvePartnerKindUi(input)).toBe("agent");
    expect(resolvePublicPartnerType(input)).toBe("agent");
    expect(PARTNER_KIND_UI_LABELS.agent).toBe("Агент");
  });

  it("classifies OPTOVIK-style company with STORE and AGENT activities", () => {
    const input = { partnerType: "COMPANY", partnerActivities: ["STORE", "AGENT"] };
    expect(resolvePartnerKindUi(input)).toBe("company");
    expect(resolvePublicPartnerType(input)).toBe("company");
  });

  it("classifies full company with STORE and SERVICE", () => {
    expect(
      resolvePartnerKindUi({ partnerType: "COMPANY", partnerActivities: ["STORE", "SERVICE"] }),
    ).toBe("company");
  });

  it("classifies COMPANY+STORE without AGENT as store", () => {
    expect(resolvePartnerKindUi({ partnerType: "COMPANY", partnerActivities: ["STORE"] })).toBe(
      "store",
    );
  });

  it("classifies specialist and store from type+activities", () => {
    expect(
      resolvePartnerKindUi({ partnerType: "MASTER", partnerActivities: ["SERVICE"] }),
    ).toBe("specialist");
    expect(
      resolvePartnerKindUi({ partnerType: "STORE", partnerActivities: ["STORE"] }),
    ).toBe("store");
  });

  it("returns null for unknown legacy combinations (no silent fallback)", () => {
    expect(resolvePartnerKindUi({ partnerType: null, partnerActivities: [] })).toBeNull();
    expect(resolvePublicPartnerType({ partnerType: null, partnerActivities: [] })).toBe("");
  });
});
