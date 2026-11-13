import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";
import type { ReceivingAppealsListResponse } from "@/lib/clients-parity/receiving-appeals-api";

/** Eligible solo specialist: no owned org/branch — receiving UI must render. */
const SOLO_SPECIALIST: ReceivingAppealsListResponse = {
  appeals: [
    {
      id: "solo-1",
      clientName: "Клиент",
      certificateId: "CERT",
      receivingPartnerUserId: "usr-solo-r06",
      receivingPartnerId: "usr-solo-r06",
      receivingOrganizationId: null,
      receivingBranchId: null,
      referrerPartnerId: "ref-1",
      interest: "Кухня",
      stageId: "sys_new",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    },
  ],
  kpis: { inWork: 1, paid: 0, shipped: 0, conv: "0%" },
  settings: { workingStages: [{ id: "ws_measure", label: "Замер" }], refusalReasons: [], archivedStages: [] },
  readOnly: false,
  tab: "active",
  nextCursor: null,
};

describe("P6.receiving solo specialist without organization", () => {
  it("shows incoming CRM list when org and branch are null", () => {
    render(<ReceivingAppealsWorkspace previewData={SOLO_SPECIALIST} />);
    expect(screen.getByTestId("ca-receiving-appeals-list")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Клиент/ })).toBeTruthy();
    expect(screen.queryByText(/нужна организация/i)).toBeNull();
  });
});
