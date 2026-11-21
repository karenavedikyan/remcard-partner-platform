import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { profAppealRowSubtitle, mapProfAppealListItemWire, type ReceivingAppealListItemWire } from "@/lib/clients-parity/prof-appeals-adapter";
import { PROF_DEMO_APPEAL_2408 } from "@/lib/clients-parity/prof-appeals-demo-fixtures";

vi.mock("@/lib/clients-parity/receiving-appeals-api", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/clients-parity/receiving-appeals-api")>();
  return {
    ...orig,
    fetchReceivingAppealDetailWire: vi.fn(),
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

  it("subtitle prefers wire receivingBranchLabel over prop", () => {
    const row = {
      ...PROF_DEMO_APPEAL_2408,
      receivingBranchLabel: "С филиала",
    };
    expect(profAppealRowSubtitle(row, "Из пропа")).toContain("С филиала");
    expect(profAppealRowSubtitle(row, "Из пропа")).not.toContain("Из пропа");
  });

  it("renders created-by line when wire label present on list row", async () => {
    const wire: ReceivingAppealListItemWire = {
      id: "appeal-2408",
      appealTitle: "T",
      clientDisplayName: "Клиент",
      requestText: "Q",
      stageKey: "sys_new",
      stageLabel: "Новое",
      certificatePromoCode: null,
      erpDocumentNumber: null,
      externalRefs: [],
      manualSourceKey: null,
      manualSourceLabel: null,
      responsible: null,
      receivingBranchId: null,
      receivingBranchLabel: null,
      createdByLabel: "Автор Тест",
      originKind: "MANUAL",
      createdAt: PROF_DEMO_APPEAL_2408.createdAt,
      updatedAt: PROF_DEMO_APPEAL_2408.updatedAt,
      remCard: { inCabinet: false },
      capabilities: { canManageLeads: true, canScan: true },
      p149Capabilities: PROF_DEMO_APPEAL_2408.profCapabilities,
    };
    vi.mocked(fetchReceivingAppealDetailWire).mockResolvedValue({
      ok: true,
      wire: {
        revision: 1,
        appeal: { ...wire, clientCity: null, clientContact: null, budgetHint: null, privateNotes: null },
        history: [],
        workingStages: [],
        refusalReasons: [],
        capabilities: { canManageLeads: true, canScan: true },
        responsibleOptions: [],
      },
    });
    const row = mapProfAppealListItemWire(wire);
    render(
      <ReceivingAppealProfSidePanel
        appealId="appeal-2408"
        row={row}
        readOnly
        offerOpen={false}
        onOfferOpenChange={() => {}}
        onClose={() => {}}
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId("ca-prof-side-created-by")).toHaveTextContent("Автор Тест");
    });
    expect(screen.getByTestId("ca-prof-side-title-readonly")).toBeInTheDocument();
  });
});