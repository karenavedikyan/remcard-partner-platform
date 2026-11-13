import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReceivingAppealsList } from "./ReceivingAppealsList";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";
import type { ReceivingAppealsListResponse } from "@/lib/clients-parity/receiving-appeals-api";

const FIXTURE: ReceivingAppealsListResponse = {
  appeals: [
    {
      id: "a-demo-1",
      clientName: "Олег Петров",
      certificateId: "DEMO-CERT-2048",
      receivingPartnerId: "p-recv",
      referrerPartnerId: "p-ref",
      interest: "Гостиная, мягкая мебель",
      stageId: "ws_proposal",
      createdAt: "2026-11-01T10:00:00.000Z",
      updatedAt: "2026-11-03T12:00:00.000Z",
      bucket: "active",
    },
    {
      id: "a-demo-2",
      clientName: "Без сертификата",
      certificateId: "",
      receivingPartnerId: "p-recv",
      referrerPartnerId: "p-ref",
      interest: "Замер",
      stageId: "ws_measure",
      createdAt: "2026-10-20T10:00:00.000Z",
      updatedAt: "2026-10-21T12:00:00.000Z",
      manualEntry: true,
      bucket: "active",
    },
  ],
  kpis: { inWork: 2, paid: 0, shipped: 0, conv: "0%" },
  settings: {
    workingStages: [
      { id: "ws_measure", label: "Замер" },
      { id: "ws_proposal", label: "Коммерческое предложение" },
    ],
    refusalReasons: ["Цена", "Сроки"],
    archivedStages: [],
  },
};

describe("P6.receiving list UI (prototype-bound, synthetic)", () => {
  it("renders KPI strip, filters, toolbar and rows from fixture", () => {
    render(<ReceivingAppealsList data={FIXTURE} stageLabelById={(r) => r.stageId} />);
    expect(screen.getByTestId("ca-receiving-appeals-list")).toBeTruthy();
    expect(screen.getByText("В работе")).toBeTruthy();
    expect(screen.getByTestId("ca-receiving-toolbar")).toBeTruthy();
    expect(screen.getByTestId("ca-receiving-filters")).toBeTruthy();
    expect(screen.getByText("Олег Петров")).toBeTruthy();
    expect(screen.getByText("Без сертификата")).toBeTruthy();
  });

  it("filters manual source client-side", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsList data={FIXTURE} stageLabelById={(r) => r.stageId} />);
    await user.selectOptions(screen.getByRole("combobox", { name: /Источник/i }), "manual");
    expect(screen.queryByText("Олег Петров")).toBeNull();
    expect(screen.getByText("Без сертификата")).toBeTruthy();
  });

  it("workspace preview navigates to manual form without API", async () => {
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace previewData={FIXTURE} />);
    await user.click(screen.getByRole("button", { name: "Добавить клиента" }));
    expect(screen.getByTestId("ca-receiving-appeal-form")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Создать обращение" })).toHaveProperty("disabled", true);
  });
});
