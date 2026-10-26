import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PartnerTypeSettings } from "./PartnerTypeSettings";

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn().mockResolvedValue({
    currentKind: "agent",
    isEmployee: false,
    publicId: "RC-TEST-1",
    options: [
      {
        kind: "agent",
        label: "Агент",
        description: "desc",
        isCurrent: true,
      },
    ],
  }),
  RemcardApiError: class RemcardApiError extends Error {},
}));

describe("PartnerTypeSettings", () => {
  it("renders current type and open action", async () => {
    render(
      <PartnerTypeSettings
        profile={{
          user: {
            id: "u1",
            publicId: "RC-TEST-1",
            partnerType: "COMPANY",
            partnerActivities: ["AGENT"],
          },
          organization: null,
          programs: [],
        }}
        hasUnsavedBasicsChanges={false}
        onProfileUpdated={() => {}}
        onRequestRefresh={() => {}}
      />,
    );
    expect(await screen.findByTestId("partner-type-settings")).toBeInTheDocument();
    expect(screen.getByTestId("partner-type-current")).toHaveTextContent("Агент");
    expect(screen.getByTestId("partner-type-open")).toBeInTheDocument();
  });
});
