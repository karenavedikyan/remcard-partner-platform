import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchBusinessOwnerCertificates } from "@/lib/business-owner-certificates/api";
import { RemcardApiError } from "@/lib/api-client";
import { BUSINESS_CERTIFICATES_NO_ACCESS_NOTE } from "@/lib/business-owner-certificates/copy";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,test") },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/agent-r03/viewModeStorage", () => ({
  readAgentR03ViewMode: () => "list" as const,
  writeAgentR03ViewMode: vi.fn(),
}));

vi.mock("@/lib/business-owner-certificates/api", () => ({
  fetchBusinessOwnerCertificates: vi.fn(),
  patchBusinessOwnerCertificate: vi.fn(),
  deleteBusinessOwnerCertificate: vi.fn(),
  batchBusinessOwnerCertificates: vi.fn(),
}));

vi.mock("@/components/specialist-certificates/SpecialistCertificateCreateDialog", () => ({
  SpecialistCertificateCreateDialog: () => <div data-testid="create-dialog" />,
}));

const baseRow = {
  promoCode: "G1",
  displayCode: "S-G1",
  userAlias: null,
  status: "ACTIVE",
  partnerStoreName: "Store",
  categorySummary: "Двери",
  discountPercent: 5,
  createdAt: "2026-10-01T10:00:00.000Z",
  archivedInWorkspace: false,
  hasOrders: false,
  canMutateIssuer: false,
};

function listOf(rows: Array<Record<string, unknown>>) {
  return {
    certificates: rows,
    page: 1,
    pageSize: 25,
    totalCount: rows.length,
    totalPages: 1,
    activeCount: rows.length,
    archivedCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    sort: "created_desc" as const,
  };
}

const TWO_BRANCHES = [
  { id: "br-1", name: "Центр", city: "Москва" },
  { id: "br-2", name: "Север", city: "Москва" },
];

function renderList(
  canIssueCertificates: boolean | undefined,
  opts: { staff?: boolean; branches?: typeof TWO_BRANCHES } = {},
) {
  const staff = opts.staff ?? true;
  return render(
    <OwnerIssuerModeProvider
      mode="business"
      businessPartnerType="COMPANY"
      canIssueCertificates={canIssueCertificates}
      isBranchStaff={staff}
      staffBranches={staff ? opts.branches : undefined}
    >
      <AgentCertificatesList accessMode="business" />
    </OwnerIssuerModeProvider>,
  );
}

describe("AgentCertificatesList: employee certificate issuing (C1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("employee with canManageCertificates sees the create CTA and the create dialog", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(
      listOf([{ ...baseRow, id: "c1", title: "Сертификат 1", issuedBy: null }]),
    );
    renderList(true);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(screen.getByTestId("business-certificates-create-cta")).toBeVisible();
    expect(screen.getByTestId("create-dialog")).toBeInTheDocument();
  });

  it("owner shell (flag not set) keeps the create CTA", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(
      listOf([{ ...baseRow, id: "c1", title: "Сертификат 1" }]),
    );
    renderList(undefined);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(screen.getByTestId("business-certificates-create-cta")).toBeVisible();
  });

  it("employee without the permission: no create CTA, no dialog, no error, list stays readable", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(
      listOf([{ ...baseRow, id: "c1", title: "Сертификат 1" }]),
    );
    renderList(false);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(screen.queryByTestId("business-certificates-create-cta")).not.toBeInTheDocument();
    expect(screen.queryByTestId("create-dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Создать сертификат/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Forbidden/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("employee without the permission and an empty list: plain empty text instead of the create onboarding", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf([]));
    renderList(false);
    await waitFor(() => expect(screen.getByTestId("business-certificates-empty")).toBeVisible());
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Создать/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Создать/i })).not.toBeInTheDocument();
  });

  it("shows «Выпустил: Имя» for employee-issued rows only", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(
      listOf([
        { ...baseRow, id: "c1", title: "Сертификат 1", issuedBy: { id: "emp-1", name: "Иван Петров" } },
        { ...baseRow, id: "c2", title: "Сертификат 2", issuedBy: null },
      ]),
    );
    renderList(true);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    const lines = screen.getAllByTestId("certificate-issued-by");
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).toHaveTextContent("Выпустил: Иван Петров");
    expect(screen.queryByText(/Выпустил: $/)).not.toBeInTheDocument();
  });

  describe("C1.1 D2: employee without the certificate permission (403 on the list)", () => {
    beforeEach(() => {
      vi.mocked(fetchBusinessOwnerCertificates).mockRejectedValue(new RemcardApiError(403, "Forbidden"));
    });

    it("shows a neutral line instead of Forbidden / Повторить / counters / filters", async () => {
      renderList(false);
      await waitFor(() => expect(screen.getByTestId("business-certificates-forbidden")).toBeVisible());
      expect(screen.getByTestId("business-certificates-forbidden")).toHaveTextContent(
        BUSINESS_CERTIFICATES_NO_ACCESS_NOTE,
      );
      expect(screen.queryByText(/Forbidden/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Повторить/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByTestId("agent-r03-collection-toolbar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("agent-r03-search")).not.toBeInTheDocument();
      expect(screen.queryByTestId("agent-r03-show-filter")).not.toBeInTheDocument();
      expect(screen.queryByTestId("agent-r03-view-toggle")).not.toBeInTheDocument();
      expect(screen.queryByTestId("agent-r03-found-count")).not.toBeInTheDocument();
      expect(screen.queryByTestId("business-certificates-empty")).not.toBeInTheDocument();
      expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
    });

    it("keeps the «Клиент пришёл с сертификатом?» block", async () => {
      renderList(false);
      await waitFor(() => expect(screen.getByTestId("business-certificates-forbidden")).toBeVisible());
      expect(screen.getByTestId("business-certificates-client-arrived")).toBeInTheDocument();
      expect(screen.getByText("Клиент пришёл с сертификатом?")).toBeInTheDocument();
    });

    it("a server error (5xx) is still an error with Повторить", async () => {
      vi.mocked(fetchBusinessOwnerCertificates).mockRejectedValue(new RemcardApiError(500, "Сбой сервера"));
      renderList(true);
      await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Сбой сервера"));
      expect(screen.getByRole("button", { name: /Повторить/i })).toBeVisible();
      expect(screen.queryByTestId("business-certificates-forbidden")).not.toBeInTheDocument();
    });

    it("a network failure is still an error with Повторить", async () => {
      vi.mocked(fetchBusinessOwnerCertificates).mockRejectedValue(new Error("network"));
      renderList(true);
      await waitFor(() => expect(screen.getByRole("alert")).toBeVisible());
      expect(screen.getByRole("button", { name: /Повторить/i })).toBeVisible();
    });
  });

  describe("C1.1 D3: employee list is read-only apart from share and open", () => {
    const rows = [
      { ...baseRow, id: "c1", title: "Сертификат 1", canMutateIssuer: false },
      { ...baseRow, id: "c2", title: "Сертификат 2", canMutateIssuer: false },
    ];

    it("employee: only «Поделиться» per row, no checkboxes, no «Выбрать страницу», no batch bar", async () => {
      vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf(rows));
      renderList(true);
      await waitFor(() => expect(screen.getByRole("table")).toBeVisible());

      const table = screen.getByRole("table");
      expect(within(table).queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.queryByText(/Выбрать страницу/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Переименовать")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("В архив")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Изменить скидки")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Удалить")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Отключить ссылку")).not.toBeInTheDocument();
      expect(screen.getAllByLabelText("Поделиться").length).toBeGreaterThanOrEqual(rows.length);
      expect(screen.getAllByRole("link", { name: "Сертификат 1" })[0]).toHaveAttribute("href", "/recommendations/c1");
      expect(screen.queryByText(/Выбрано:/)).not.toBeInTheDocument();
    });

    it("employee, card view: no checkboxes and no change/archive actions", async () => {
      vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf(rows));
      window.localStorage.setItem("remcard.agentR03.viewMode.certificates", "cards");
      const { unmount } = renderList(true);
      await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "Карточки" }));
      await waitFor(() => expect(screen.getByTestId("agent-r03-cards-grid")).toBeVisible());
      expect(within(screen.getByTestId("agent-r03-cards-grid")).queryAllByRole("checkbox")).toHaveLength(0);
      expect(screen.queryByText("Выбрать")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Переименовать")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("В архив")).not.toBeInTheDocument();
      expect(screen.getAllByLabelText("Поделиться").length).toBeGreaterThan(0);
      unmount();
    });

    it("owner: change/archive actions, checkboxes and «Выбрать страницу» are present", async () => {
      vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(
        listOf(rows.map((r) => ({ ...r, canMutateIssuer: true }))),
      );
      renderList(undefined, { staff: false });
      await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
      expect(within(screen.getByRole("table")).queryAllByRole("checkbox").length).toBeGreaterThan(0);
      expect(screen.getByText(/Выбрать страницу/)).toBeVisible();
      expect(screen.getAllByLabelText("Переименовать").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("В архив").length).toBeGreaterThan(0);
      expect(screen.getAllByLabelText("Поделиться").length).toBeGreaterThan(0);
    });
  });

  describe("C1.1 D4: employee branch scope", () => {
    const rows = [{ ...baseRow, id: "c1", title: "Сертификат 1" }];

    it("employee of two branches: default is «Все мои филиалы» and no branchId is sent; picking a branch sends it", async () => {
      vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf(rows));
      renderList(true, { branches: TWO_BRANCHES });
      await waitFor(() => expect(screen.getByRole("table")).toBeVisible());

      const select = screen.getByTestId("certificates-branch-filter") as HTMLSelectElement;
      expect(select.value).toBe("");
      const labels = Array.from(select.options).map((o) => o.textContent);
      expect(labels[0]).toBe("Все мои филиалы");
      expect(labels).toHaveLength(3);
      expect(vi.mocked(fetchBusinessOwnerCertificates).mock.calls[0]![0]).not.toHaveProperty("branchId");

      const user = userEvent.setup();
      await user.selectOptions(select, "br-2");
      await waitFor(() =>
        expect(vi.mocked(fetchBusinessOwnerCertificates).mock.calls.at(-1)![0]).toMatchObject({
          branchId: "br-2",
        }),
      );
      await user.selectOptions(select, "");
      await waitFor(() =>
        expect(vi.mocked(fetchBusinessOwnerCertificates).mock.calls.at(-1)![0]).not.toHaveProperty("branchId"),
      );
    });

    it("employee of one branch: no selector", async () => {
      vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf(rows));
      renderList(true, { branches: TWO_BRANCHES.slice(0, 1) });
      await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
      expect(screen.queryByTestId("certificates-branch-filter")).not.toBeInTheDocument();
    });

    it("owner: no branch selector, no branchId", async () => {
      vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf(rows));
      renderList(undefined, { staff: false });
      await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
      expect(screen.queryByTestId("certificates-branch-filter")).not.toBeInTheDocument();
      expect(vi.mocked(fetchBusinessOwnerCertificates).mock.calls[0]![0]).not.toHaveProperty("branchId");
    });
  });
});
