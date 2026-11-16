import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerPartnershipDetailDialog } from "./PartnerPartnershipDetailDialog";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
import type { Partnership } from "@/lib/types";

const fetchWorkspace = vi.hoisted(() => vi.fn());
vi.mock("@/lib/certificate-policy/api", () => ({ fetchCertificatePolicyWorkspace: fetchWorkspace }));
const policyDialog = vi.hoisted(() => vi.fn());
vi.mock("@/components/certificate-policy/CertificatePolicyDialog", () => ({
  CertificatePolicyDialog: (props: Record<string, unknown>) => {
    policyDialog(props);
    return props.open ? <div data-testid="policy-dialog-stub" /> : null;
  },
}));

const ME = "me";
function make(overrides: Partial<Partnership> & { direction: "incoming" | "outgoing" }): Partnership {
  const { direction, ...rest } = overrides;
  const incoming = direction === "incoming";
  return {
    id: "row-1", status: "ACTIVE", initiatedBy: "other", pendingProposedBy: null, note: null,
    createdAt: "", updatedAt: "",
    storeUserId: incoming ? ME : "other", proUserId: incoming ? "other" : ME,
    terms: [
      { id: "t1", category: "doors", categoryLabel: "Двери", storePercent: 0, isExcluded: false, minMargin: null },
      { id: "t2", category: "flooring", categoryLabel: "Напольные покрытия", storePercent: 9, isExcluded: false, minMargin: null },
      { id: "t3", category: "handles", categoryLabel: "Ручки", storePercent: 0, isExcluded: true, minMargin: null },
    ],
    storeUser: { id: incoming ? ME : "other", displayName: "Магазин", city: "Казань", specializations: [], storeCategories: [], partnerType: "STORE" },
    proUser: { id: incoming ? "other" : ME, displayName: "Партнёр", city: "Казань", specializations: [], storeCategories: [], partnerType: "COMPANY" },
    listPreference: { personalAlias: null, archivedAt: null, hiddenAt: null },
    directionInfo: {
      direction,
      issuerUserId: incoming ? "other" : ME,
      receiverUserId: incoming ? ME : "other",
      legacyInverted: false,
      counterpartyUserId: "other",
      reversePartnershipId: null,
      reverseStatus: null,
    },
    ...rest,
  } as unknown as Partnership;
}

const workspaceWith = (partnershipId: string) => ({
  ok: true,
  workspace: {
    counterparties: [
      { partnershipId, effective: { validityDays: 21, purchaseLimit: 3, minimumPurchaseAmount: 1500, promotionsCompatible: false } },
    ],
  },
});

function mount(p: Partnership, extra: { canEdit?: boolean } = {}) {
  return render(
    <PartnerPartnershipDetailDialog
      partnership={p}
      meId={ME}
      open
      onClose={() => undefined}
      directionAudience="business-store-r04"
      certificatePolicyEntry={{ viewerUserId: ME, canEditSettings: extra.canEdit ?? true }}
    />,
  );
}

beforeEach(() => {
  fetchWorkspace.mockReset().mockImplementation(async () => workspaceWith("row-1"));
  policyDialog.mockReset();
});
afterEach(() => resetBodyScrollLockForTests());

describe("PartnerPartnershipDetailDialog directions", () => {
  it("explains an incoming row, shows the exact per-row restrictions, 0% vs excluded, and links", async () => {
    mount(make({ direction: "incoming" }));
    expect(screen.getByTestId("partner-detail-direction")).toHaveAttribute("data-direction", "incoming");
    expect(screen.getByText("Ваши условия получения")).toBeInTheDocument();
    expect(screen.getByTestId("partner-detail-zero-note")).toHaveTextContent("не исключение");
    expect(screen.getByTestId("partner-detail-excluded")).toHaveTextContent("Ручки");
    expect(await screen.findByTestId("partner-detail-restrictions-line")).toHaveTextContent("21 день");
    expect(screen.getByTestId("partner-detail-restrictions-line")).toHaveTextContent("3 покупки");
    expect(screen.getByTestId("partner-detail-restrictions-line")).toHaveTextContent("от 1500");
    expect(screen.getByTestId("partner-detail-clients-link")).toHaveAttribute("href", "/clients?direction=receiving");
    expect(screen.getByTestId("partner-detail-individual-terms")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-detail-receiver-terms")).toBeNull();
  });

  it("opens the individual-terms editor scoped to this exact row", async () => {
    mount(make({ direction: "incoming" }));
    await userEvent.click(screen.getByTestId("partner-detail-individual-terms"));
    await waitFor(() => expect(screen.getByTestId("policy-dialog-stub")).toBeInTheDocument());
    const last = policyDialog.mock.calls.at(-1)![0];
    expect(last).toMatchObject({
      open: true, initialTab: "settings", initialScope: "individual",
      initialPartnershipId: "row-1", initialPartnerUserId: "other",
    });
  });

  it("makes an outgoing row read-only: partner terms, no individual editor, exact-partner clients link", async () => {
    mount(make({ direction: "outgoing" }));
    expect(screen.getByText("Условия партнёра для ваших рекомендаций")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-detail-individual-terms")).toBeNull();
    expect(screen.getByTestId("partner-detail-clients-link")).toHaveAttribute(
      "href", "/clients?direction=at-partners&partnerId=other",
    );
    await userEvent.click(screen.getByTestId("partner-detail-receiver-terms"));
    expect(policyDialog.mock.calls.at(-1)![0]).toMatchObject({ open: true, initialTab: "incoming", initialPartnershipId: null });
  });

  it("hides the individual editor from viewers who cannot edit", () => {
    mount(make({ direction: "incoming" }), { canEdit: false });
    expect(screen.queryByTestId("partner-detail-individual-terms")).toBeNull();
  });

  it("states that a pending reverse direction is not active and a paused row is not issuable", () => {
    mount(make({
      direction: "incoming", status: "PAUSED",
      directionInfo: {
        direction: "incoming", issuerUserId: "other", receiverUserId: ME, legacyInverted: false,
        counterpartyUserId: "other", reversePartnershipId: "rev", reverseStatus: "INVITED",
      },
    }));
    expect(screen.getByTestId("partner-detail-direction")).toHaveTextContent("выдача сертификатов недоступна");
    expect(screen.getByTestId("partner-detail-reverse")).toHaveTextContent("ждёт ответа");
  });

  it("explains a legacy inverted agent row", () => {
    mount(make({
      direction: "outgoing",
      directionInfo: {
        direction: "outgoing", issuerUserId: ME, receiverUserId: "other", legacyInverted: true,
        counterpartyUserId: "other", reversePartnershipId: null, reverseStatus: null,
      },
    }));
    expect(screen.getByTestId("partner-detail-legacy-inverted")).toBeInTheDocument();
  });

  it("shows the pending per-invitation offer without implying it is active", () => {
    mount(make({
      direction: "incoming", status: "INVITED",
      pendingOffer: {
        proposalId: "pr1", proposerUserId: ME,
        restrictions: { validityDays: 7, purchaseLimit: 2, minimumPurchaseAmount: null, promotionsCompatible: true, exclusionsText: "Сантехника" },
        categoryRates: [],
      },
    }));
    const offer = screen.getByTestId("partner-detail-offer");
    expect(offer).toHaveTextContent("7 дней");
    expect(offer).toHaveTextContent("Применятся только после принятия");
    expect(offer).toHaveTextContent("Сантехника");
    expect(screen.queryByTestId("partner-detail-restrictions")).toBeNull();
  });

  it("shows a retryable error when restrictions cannot be loaded", async () => {
    fetchWorkspace.mockResolvedValueOnce({ ok: false, code: "ERROR", message: "x" });
    mount(make({ direction: "incoming" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Не удалось загрузить");
    await userEvent.click(screen.getByRole("button", { name: "Повторить" }));
    expect(await screen.findByTestId("partner-detail-restrictions-line")).toBeInTheDocument();
  });

  it("renders no direction block without the direction audience (legacy dialogs unchanged)", () => {
    render(<PartnerPartnershipDetailDialog partnership={make({ direction: "incoming" })} meId={ME} open onClose={() => undefined} />);
    expect(screen.queryByTestId("partner-detail-direction")).toBeNull();
    expect(fetchWorkspace).not.toHaveBeenCalled();
  });
});
