import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { receivingBulkConfirmTargetIds } from "./receiving-bulk-handoff";
import { ReceivingAppealsWorkspace } from "./ReceivingAppealsWorkspace";
import type { ReceivingAppealsListResponse } from "@/lib/clients-parity/receiving-appeals-api";
import * as api from "@/lib/clients-parity/receiving-appeals-api";

const FIXTURE: ReceivingAppealsListResponse = {
  appeals: [
    {
      id: "a1",
      clientName: "One",
      certificateId: "",
      receivingPartnerUserId: "u",
      receivingPartnerId: "u",
      referrerPartnerId: "r",
      interest: "",
      stageId: "ws_measure",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      bucket: "active",
    },
    {
      id: "a2",
      clientName: "Two",
      certificateId: "",
      receivingPartnerUserId: "u",
      receivingPartnerId: "u",
      referrerPartnerId: "r",
      interest: "",
      stageId: "ws_measure",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      bucket: "active",
    },
  ],
  readOnly: false,
  nextCursor: null,
  tab: "active",
  kpis: { inWork: 2, paid: 0, shipped: 0, conv: "0%" },
  settings: {
    workingStages: [{ id: "ws_measure", label: "Замер" }],
    refusalReasons: [],
    archivedStages: [],
  },
};

describe("P6 receiving workspace transport", () => {
  it("bulk confirm retry posts only IDs still selected after partial", () => {
    expect(receivingBulkConfirmTargetIds(["a1", "a2"], new Set(["a2"]))).toEqual(["a2"]);
    expect(receivingBulkConfirmTargetIds(["a1", "a2"], new Set())).toEqual([]);
  });

  it("manual create failure surfaces inside form", async () => {
    vi.spyOn(api, "isReceivingAppealsProxyReady").mockReturnValue(true);
    vi.spyOn(api, "createReceivingAppeal").mockResolvedValue({
      ok: false,
      code: "ERROR",
      message: "Сервер отклонил создание",
    });
    const user = userEvent.setup();
    render(<ReceivingAppealsWorkspace previewData={FIXTURE} />);
    await user.click(screen.getByRole("button", { name: "Добавить клиента" }));
    const nameInput = screen.getByRole("textbox", { name: /Имя или компания/i });
    await user.type(nameInput, "Тест");
    await user.click(screen.getByRole("button", { name: "Создать обращение" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Сервер отклонил создание"));
    expect(screen.getByTestId("ca-receiving-appeal-form")).toBeTruthy();
    vi.restoreAllMocks();
  });
});
