import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";
import type { ReceivingAppealsListResponse } from "@/lib/clients-parity/receiving-appeals-api";

const LIST_ONLY: ReceivingAppealsListResponse = {
  appeals: [
    {
      id: "a1",
      clientName: "Read only",
      certificateId: "C",
      receivingPartnerId: "r",
      referrerPartnerId: "f",
      interest: "—",
      stageId: "s",
      createdAt: "2026-11-01T00:00:00Z",
      updatedAt: "2026-11-01T00:00:00Z",
    },
  ],
  kpis: { inWork: 1, paid: 0, shipped: 0, conv: "0%" },
  settings: { workingStages: [], refusalReasons: [], archivedStages: [] },
  access: {
    listAllowed: true,
    mutationsAllowed: false,
    denialCode: "OWNER_CLIENTS_LIST_CONTEXT_ONLY",
  },
};

describe("P6.receiving read-only org-workplace principal", () => {
  it("does not expose mutation navigation from list", () => {
    render(<ReceivingAppealsWorkspace previewData={LIST_ONLY} />);
    expect(screen.getByTestId("ca-receiving-appeals-list")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Добавить клиента" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Сканировать сертификат" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Этапы и причины" })).toBeNull();
    expect(screen.queryByTestId("ca-receiving-appeal-form")).toBeNull();
  });
});
