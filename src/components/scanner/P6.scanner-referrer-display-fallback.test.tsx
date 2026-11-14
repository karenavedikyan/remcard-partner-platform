import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScannerReferringPartnerBlock } from "./ScannerReferringPartnerBlock";

describe("P6.scanner referrer display fallback", () => {
  it("uses appeal referrerDisplayName when preview partner data is absent", () => {
    render(
      <ScannerReferringPartnerBlock
        referringPartner={null}
        appealReferrerDisplayName="Обойкин"
      />,
    );
    expect(screen.queryByTestId("scanner-referrer-unavailable")).toBeNull();
    expect(screen.getByText("Обойкин")).toBeTruthy();
  });

  it("prefers store preview referrer when both present", () => {
    render(
      <ScannerReferringPartnerBlock
        referringPartner={{
          displayName: "Preview Issuer",
          typeLabel: "PROF",
          city: null,
          contacts: [],
        }}
        appealReferrerDisplayName="CRM fallback"
      />,
    );
    expect(screen.getByText("Preview Issuer")).toBeTruthy();
    expect(screen.queryByText("CRM fallback")).toBeNull();
  });
});