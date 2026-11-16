import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerPartnershipDetailDialog } from "./PartnerPartnershipDetailDialog";
import { resetBodyScrollLockForTests } from "@/lib/dialog-focus";
import type { Partnership } from "@/lib/types";

const fetchWorkspace = vi.hoisted(() => vi.fn());
vi.mock("@/lib/certificate-policy/api", () => ({ fetchCertificatePolicyWorkspace: fetchWorkspace }));
const fetchAppeals = vi.hoisted(() => vi.fn());
vi.mock("@/lib/clients-parity/fetch-observer-appeals", () => ({ fetchObserverReferredAppeals: fetchAppeals }));
vi.mock("@/components/certificate-policy/CertificatePolicyDialog", () => ({
  CertificatePolicyDialog: () => null,
}));

const ME = "me";
function make(direction: "incoming" | "outgoing", status = "ACTIVE"): Partnership {
  const incoming = direction === "incoming";
  return {
    id: "row-1", status, initiatedBy: "other", pendingProposedBy: null, note: null, createdAt: "", updatedAt: "",
    storeUserId: incoming ? ME : "other", proUserId: incoming ? "other" : ME,
    terms: [
      { id: "t1", category: "paint", categoryLabel: "Краски", storePercent: 7, isExcluded: false, minMargin: null },
      { id: "t2", category: "handles", categoryLabel: "Ручки", storePercent: 0, isExcluded: true, minMargin: null },
    ],
    storeUser: { id: incoming ? ME : "other", displayName: "Магазин Краски", city: "Казань", specializations: [], storeCategories: [], partnerType: "STORE" },
    proUser: { id: incoming ? "other" : ME, displayName: "Партнёр", city: "Казань", specializations: [], storeCategories: [], partnerType: "COMPANY" },
    listPreference: { personalAlias: null, archivedAt: null, hiddenAt: null },
    directionInfo: {
      direction, issuerUserId: incoming ? "other" : ME, receiverUserId: incoming ? ME : "other",
      legacyInverted: false, counterpartyUserId: "other", reversePartnershipId: null, reverseStatus: null,
    },
  } as unknown as Partnership;
}

const appeal = (id: string, partner: string, name: string, cert: string, stageId: string, label: string) => ({
  id, clientName: name, certificateId: cert, receivingPartnerId: partner, referrerPartnerId: ME, stageId, stageLabel: label,
  updatedAt: "2026-11-10T09:00:00.000Z",
});

function mount(p: Partnership, onClose = () => undefined) {
  return render(
    <PartnerPartnershipDetailDialog
      partnership={p}
      meId={ME}
      open
      onClose={onClose}
      directionAudience="business-store-r04"
      certificatePolicyEntry={{ viewerUserId: ME, canEditSettings: true }}
      onRunAction={() => undefined}
      onOpenTermChange={() => undefined}
    />,
  );
}

beforeEach(() => {
  fetchWorkspace.mockReset().mockResolvedValue({
    ok: true,
    workspace: {
      counterparties: [
        { partnershipId: "row-1", effective: { validityDays: 21, purchaseLimit: 3, minimumPurchaseAmount: null, promotionsCompatible: false } },
      ],
    },
  });
  fetchAppeals.mockReset().mockResolvedValue({
    ok: true,
    appeals: [
      appeal("a1", "other", "Иван Петров", "RC-1001", "sys_new", "Новый"),
      appeal("a2", "other", "Мария Соколова", "RC-1002", "sys_paid", "Оплачен"),
      appeal("a3", "someone-else", "Чужой Клиент", "RC-9", "sys_new", "Новый"),
    ],
    partners: [],
    personalMeta: {},
    overlayVersions: {},
  });
});
afterEach(() => resetBodyScrollLockForTests());

describe("outgoing partner sheet", () => {
  it("shows two real tabs with terms first and keeps existing actions in a disclosure", async () => {
    mount(make("outgoing"));
    expect(screen.getByRole("tab", { name: "Условия" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Условия, которые Магазин Краски дал вам")).toBeInTheDocument();
    expect(screen.getByTestId("partner-sheet-status")).toHaveTextContent("Условия согласованы");
    expect(screen.getByTestId("partner-sheet-status")).toHaveAttribute("data-state", "active");
    const rates = screen.getAllByTestId("partner-sheet-rate");
    expect(rates[0]).toHaveTextContent("Краски7%");
    expect(rates[1]).toHaveTextContent("Ручки");
    expect(rates[1]).toHaveAttribute("data-excluded", "true");
    expect(screen.getByTestId("partner-sheet-excluded")).toHaveTextContent("Не участвует");
    await waitFor(() => expect(screen.getByTestId("partner-sheet-limit-validity")).toHaveTextContent("Срок скидки21"));
    expect(screen.getByTestId("partner-sheet-limit-purchases")).toHaveTextContent("Покупок3");
    const disclosure = screen.getByTestId("partner-sheet-restrictions-details");
    expect(disclosure.tagName).toBe("DETAILS");
    expect(disclosure).toHaveTextContent("Не суммируется с акциями");
    expect(disclosure).not.toHaveTextContent("от ");
    expect(screen.getByTestId("partner-detail-close")).toHaveAccessibleName("Закрыть");
    expect(screen.getByTestId("partner-detail-close")).not.toHaveTextContent("Закрыть");
    expect(screen.getByTestId("partner-sheet-create-certificate")).toHaveAttribute("href", "/certificates");
    const profile = screen.getByTestId("partner-sheet-profile");
    expect(profile.tagName).toBe("DETAILS");
    expect(within(profile).getByTestId("partner-detail-term-change")).toBeInTheDocument();
    expect(within(profile).getByTestId("partner-detail-clients-link")).toHaveAttribute(
      "href", "/clients?direction=at-partners&partnerId=other",
    );
  });

  it("shows the real authorized clients of this partner only, with real counts", async () => {
    mount(make("outgoing"));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Клиенты 2" })).toBeInTheDocument());
    await userEvent.click(screen.getByRole("tab", { name: /Клиенты/ }));
    const stats = screen.getByTestId("partner-sheet-clients-stats");
    expect(stats).toHaveTextContent("Клиентов2");
    expect(stats).toHaveTextContent("В работе1");
    expect(stats).toHaveTextContent("Дошли до оплаты1");
    const rows = screen.getAllByTestId("partner-sheet-client-row");
    expect(rows).toHaveLength(2);
    expect(screen.queryByText("Чужой Клиент")).toBeNull();
    expect(rows[0]).toHaveTextContent("RC-1001");
    expect(screen.getAllByTestId("partner-sheet-client-open")[0]).toHaveAttribute(
      "href", "/clients?direction=at-partners&partnerId=other",
    );
    expect(screen.getByTestId("partner-sheet-clients-privacy")).toHaveTextContent(
      "Только ваши направления. Внутренние заметки партнёра не видны.",
    );
    await userEvent.type(screen.getByTestId("partner-sheet-clients-search"), "rc-1002");
    expect(screen.getAllByTestId("partner-sheet-client-row")).toHaveLength(1);
    await userEvent.clear(screen.getByTestId("partner-sheet-clients-search"));
    await userEvent.selectOptions(screen.getByTestId("partner-sheet-clients-status"), "Оплачен");
    expect(screen.getAllByTestId("partner-sheet-client-row")).toHaveLength(1);
    expect(screen.getByTestId("partner-sheet-client-row")).toHaveTextContent("Мария Соколова");
  });

  it("shows an honest empty state when no clients were referred to the partner", async () => {
    fetchAppeals.mockResolvedValue({ ok: true, appeals: [], partners: [], personalMeta: {}, overlayVersions: {} });
    mount(make("outgoing"));
    await userEvent.click(screen.getByRole("tab", { name: /Клиенты/ }));
    expect(await screen.findByTestId("partner-sheet-clients-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("partner-sheet-clients-search")).toBeNull();
  });

  it("shows the existing contract error instead of fabricated numbers", async () => {
    fetchAppeals.mockResolvedValue({ ok: false, code: "SERVER", message: "Сервис клиентов недоступен.", retryable: true });
    mount(make("outgoing"));
    await userEvent.click(screen.getByRole("tab", { name: /Клиенты/ }));
    expect(await screen.findByTestId("partner-sheet-clients-error")).toHaveTextContent("Сервис клиентов недоступен.");
    expect(screen.queryByTestId("partner-sheet-clients-stats")).toBeNull();
    expect(screen.getByRole("tab", { name: "Клиенты" })).toBeInTheDocument();
  });

  it("is outgoing-only: incoming and non-active rows keep the generic detail and never fetch clients", () => {
    const { unmount } = mount(make("incoming"));
    expect(screen.queryByTestId("partner-sheet-tabs")).toBeNull();
    expect(screen.getByTestId("partner-detail-term-change")).toBeInTheDocument();
    unmount();
    mount(make("outgoing", "ENDED"));
    expect(screen.queryByTestId("partner-sheet-tabs")).toBeNull();
    expect(fetchAppeals).not.toHaveBeenCalled();
  });

  it("shows a paused row honestly, not as agreed, without the certificate action", () => {
    mount(make("outgoing", "PAUSED"));
    expect(screen.getByTestId("partner-sheet-status")).toHaveTextContent("Сотрудничество приостановлено");
    expect(screen.getByTestId("partner-sheet-status")).toHaveAttribute("data-state", "paused");
    expect(screen.queryByTestId("partner-sheet-create-certificate")).toBeNull();
  });

  it("keeps loading, missing and error states for the limit tiles", async () => {
    fetchWorkspace.mockResolvedValue({ ok: true, workspace: { counterparties: [] } });
    const { unmount } = mount(make("outgoing"));
    const sheetLimits = () => within(screen.getByTestId("partner-sheet-restrictions"));
    await waitFor(() =>
      expect(sheetLimits().getByText("Ограничения для этой договорённости пока недоступны.")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("partner-sheet-limits")).toBeNull();
    unmount();
    fetchWorkspace.mockResolvedValue({ ok: false });
    mount(make("outgoing"));
    await waitFor(() => expect(sheetLimits().getByRole("alert")).toHaveTextContent("Не удалось загрузить срок и число покупок."));
    expect(sheetLimits().getByRole("button", { name: "Повторить" })).toBeInTheDocument();
  });

  it("moves focus and the selected panel with the arrow keys", async () => {
    mount(make("outgoing"));
    const terms = screen.getByTestId("partner-sheet-tab-terms");
    const clients = screen.getByTestId("partner-sheet-tab-clients");
    terms.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(clients).toHaveFocus();
    expect(clients).toHaveAttribute("aria-selected", "true");
    expect(clients).toHaveAttribute("tabindex", "0");
    expect(terms).toHaveAttribute("tabindex", "-1");
    expect(screen.getByTestId("partner-sheet-panel-clients")).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("partner-sheet-panel-terms")).toHaveAttribute("hidden");
    await userEvent.keyboard("{ArrowLeft}");
    expect(terms).toHaveFocus();
    expect(terms).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("partner-sheet-panel-terms")).not.toHaveAttribute("hidden");
    expect(screen.getByTestId("partner-sheet-panel-clients")).toHaveAttribute("hidden");
  });

  it("closes from the sheet footer", async () => {
    const onClose = vi.fn();
    mount(make("outgoing"), onClose);
    await userEvent.click(screen.getByTestId("partner-sheet-close"));
    expect(onClose).toHaveBeenCalled();
  });
});
