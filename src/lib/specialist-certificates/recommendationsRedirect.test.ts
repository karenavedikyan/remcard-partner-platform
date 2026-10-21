import { describe, expect, it } from "vitest";
import { mapRecommendationsPathToAgentCertificates } from "./recommendationsRedirect";

describe("mapRecommendationsPathToAgentCertificates", () => {
  it("preserves clientId on create redirect", () => {
    expect(
      mapRecommendationsPathToAgentCertificates(
        "/recommendations/new",
        "?clientId=abc-1",
      ),
    ).toBe("/certificates/new?clientId=abc-1");
  });

  it("maps detail id", () => {
    expect(
      mapRecommendationsPathToAgentCertificates("/recommendations/cert-9", ""),
    ).toBe("/certificates/cert-9");
  });
});
