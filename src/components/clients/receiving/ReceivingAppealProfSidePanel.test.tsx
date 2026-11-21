import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import {
  profAppealRowSubtitle,
  mapProfAppealListItemWire,
  type ReceivingAppealListItemWire,
} from "@/lib/clients-parity/prof-appeals-adapter";
import { PROF_DEMO_APPEAL_2408 } from "@/lib/clients-parity/prof-appeals-demo-fixtures";

vi.mock("@/lib/clients-parity/receiving-appeals-api", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/clients-parity/receiving-appeals-api")>();
  return {
    ...orig,
    fetchReceivingAppealDetailWire: vi.fn(),
    patchReceivingAppealProfileCas: vi.fn(),
  };
});

vi.mock("./ReceivingAppealDetailHost", () => ({
  ReceivingAppealDetailHost: () => <div data-testid="mock-detail-host" />,
}));

vi.mock("./ReceivingCommercialOfferDialog", () => ({
  ReceivingCommercialOfferDialog: () => null,
}));

const { ReceivingAppealProfSidePanel } = await import("./ReceivingAppealProfSidePanel");
const { fetchReceivingAppealDetailWire } = await import("@/lib/clients-parity/receiving-appeals-api");

function profDetailWire(
  over: Partial<ReceivingAppealListItemWire> = {},
  extra?: { createdByLabel?: string; remPublicId?: string; certificatePromoCode?: string | null; historyLen?: number },
) {
  const appeal: ReceivingAppealListItemWire = {
    id: "appeal-2408",
    appealTitle: "Отделка прихожей",
    clientDisplayName: "Анна П.",
    requestText: "Межкомнатные двери",
    stageKey: "ws_work",
    stageLabel: "В работе",
    certificatePromoCode: extra?.certificatePromoCode ?? null,
    erpDocumentNumber: "ERP-1",
    externalRefs: [{ key: "ext1", label: "Поле партнёра", value: "VAL" }],
    manualSourceKey: "phone",
    manualSourceLabel: "Звонок",
    responsible: { userId: "u1", displayLabel: "Мария" },
    receivingBranchId: "branch-north",
    receivingBranchLabel: "Северный",
    createdByLabel: extra?.createdByLabel ?? "Анна",
    originKind: "MANUAL",
    createdAt: PROF_DEMO_APPEAL_2408.createdAt,
    updatedAt: PROF_DEMO_APPEAL_2408.updatedAt,
    remCard: {
      inCabinet: true,
      publicId: extra?.remPublicId ?? "RCU-K8F4-2M7Q",
    },
    capabilities: { canManageLeads: true, canScan: true },
    p149Capabilities: PROF_DEMO_APPEAL_2408.profCapabilities,
    ...over,
  };
  return {
    revision: 2,
    appeal: {
      ...appeal,
      clientCity: "Москва",
      clientContact: "+7",
      budgetHint: "100k",
      privateNotes: "",
    },
    history: Array.from({ length: extra?.historyLen ?? 3 }, (_, i) => ({
      at: PROF_DEMO_APPEAL_2408.updatedAt,
      text: `Запись ${i + 1}`,
    })),
    workingStages: [],
    refusalReasons: [],
    capabilities: { canManageLeads: true, canScan: true },
    responsibleOptions: [{ userId: "u1", displayLabel: "Мария" }],
    commercialProposal: { prepareAllowed: true, sendEnabled: false, sendDisabledReason: null },
  };
}

function renderPanel(readOnly = false, focusField?: "appealTitle" | "requestText" | "manualSourceKey") {
  const row = mapProfAppealListItemWire(profDetailWire().appeal);
  vi.mocked(fetchReceivingAppealDetailWire).mockResolvedValue({ ok: true, wire: profDetailWire() });
  return render(
    <ReceivingAppealProfSidePanel
      appealId="appeal-2408"
      row={row}
      readOnly={readOnly}
      focusField={focusField}
      manualChannels={[{ key: "phone", label: "Звонок" }]}
      offerOpen={false}
      onOfferOpenChange={() => {}}
      onClose={() => {}}
    />,
  );
}

function blockOrderIds(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>("[data-testid]"))
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) =>
      [
        "ca-prof-client-box",
        "ca-prof-certificate",
        "ca-prof-drawer-form",
        "ca-prof-created-by",
        "ca-prof-lifecycle-host",
        "ca-prof-history",
        "ca-prof-drawer-footer",
      ].includes(id),
    );
}

describe("ReceivingAppealProfSidePanel", () => {
  beforeEach(() => {
    vi.mocked(fetchReceivingAppealDetailWire).mockReset();
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function showModal() {
        this.open = true;
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function close() {
        this.open = false;
      };
    }
  });

  it.each([
    ["appealTitle", "ca-prof-field-appealTitle"],
    ["requestText", "ca-prof-field-requestText"],
    ["manualSourceKey", "ca-prof-field-manual-source"],
  ] as const)("focuses the editable field %s when the card loads", async (field, id) => {
    renderPanel(false, field);
    const control = await screen.findByTestId(id);
    await waitFor(() => expect(control).toHaveFocus());
  });

  it("subtitle prefers wire receivingBranchLabel over prop", () => {
    const row = {
      ...PROF_DEMO_APPEAL_2408,
      receivingBranchLabel: "С филиала",
    };
    expect(profAppealRowSubtitle(row, "Из пропа")).toContain("С филиала");
    expect(profAppealRowSubtitle(row, "Из пропа")).not.toContain("Из пропа");
  });

  it("header kicker, title, history count, plates, field order, no client duplicate box", async () => {
    renderPanel(false);
    await waitFor(() => expect(screen.getByTestId("ca-prof-drawer-form")).toBeInTheDocument());

    expect(screen.getByTestId("ca-prof-side-kicker")).toHaveTextContent("РЕДАКТИРОВАНИЕ");
    expect(screen.getByTestId("ca-prof-side-title")).toHaveTextContent("Отделка прихожей");
    expect(screen.getByTestId("ca-prof-side-close")).toHaveClass("icon-button");
    expect(screen.queryByTestId("ca-prof-info-boxes")).not.toBeInTheDocument();
    expect(screen.queryByTestId("ca-prof-client-box")).not.toBeNull();

    const clientPlate = within(screen.getByTestId("ca-prof-client-id-plate"));
    expect(clientPlate.getByText("ID клиента RemCard")).toBeInTheDocument();
    expect(clientPlate.getByText("RCU-K8F4-2M7Q")).toBeInTheDocument();

    const cert = screen.getByTestId("ca-prof-certificate");
    expect(cert).toHaveTextContent("Номер сертификата RemCard");
    expect(cert).toHaveTextContent("Не привязан");

    expect(screen.getByText("Название обращения")).toBeInTheDocument();
    expect(screen.getByText("Источник обращения")).toBeInTheDocument();
    expect(screen.getByText("Имя клиента")).toBeInTheDocument();
    expect(screen.getByText("Внутренняя заметка")).toBeInTheDocument();
    expect(screen.queryByText("Заметки команды")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Клиент$/)).not.toBeInTheDocument();

    expect(screen.getByText("Номер заказа в 1С")).toBeInTheDocument();
    expect(screen.getByTestId("ca-prof-partner-help")).toHaveTextContent("Эти номера не заменяют № 2408");

    expect(screen.getByTestId("ca-prof-created-by")).toHaveTextContent("Создал: Анна. Статус здесь не меняется.");

    expect(screen.getByText(/История изменений · 3/)).toBeInTheDocument();

    const panel = screen.getByTestId("ca-prof-side-panel");
    const order = blockOrderIds(panel);
    expect(order).toEqual([
      "ca-prof-client-box",
      "ca-prof-certificate",
      "ca-prof-drawer-form",
      "ca-prof-created-by",
      "ca-prof-lifecycle-host",
      "ca-prof-history",
      "ca-prof-drawer-footer",
    ]);

    expect(screen.getByRole("button", { name: "Отмена" })).toBeInTheDocument();
    expect(screen.getByTestId("ca-prof-send-offer")).toHaveClass("secondary");
  });

  it("read-only kicker and review text", async () => {
    renderPanel(true);
    await waitFor(() => expect(screen.getByTestId("ca-prof-side-kicker")).toHaveTextContent("ТОЛЬКО ПРОСМОТР"));
    expect(screen.getByTestId("ca-prof-drawer-readonly")).toHaveTextContent(
      "У этой роли нет права редактировать обращение.",
    );
    expect(screen.queryByTestId("ca-prof-drawer-footer")).not.toBeInTheDocument();
  });
});
