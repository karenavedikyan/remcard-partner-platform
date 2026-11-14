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

  it("does not show appeal fallback while context is not ready (B loading)", () => {
    render(
      <ScannerReferringPartnerBlock
        referringPartner={null}
        appealReferrerDisplayName={null}
      />,
    );
    expect(screen.getByTestId("scanner-referrer-unavailable")).toBeTruthy();
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