import { render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchAgentCertificates } from "@/lib/agent-r03/api";
import { fetchBusinessOwnerCertificates } from "@/lib/business-owner-certificates/api";
import { businessCertificatesPageCopy } from "@/lib/business-owner-certificates/copy";

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
vi.mock("@/lib/agent-r03/api", () => ({
  fetchAgentCertificates: vi.fn(),
  patchAgentCertificate: vi.fn(),
  deleteAgentCertificate: vi.fn(),
  batchAgentCertificates: vi.fn(),
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

const row = {
  id: "c1",
  promoCode: "G1",
  displayCode: "S-G1",
  title: "Сертификат работодателя",
  userAlias: null,
  status: "ACTIVE",
  partnerStoreName: "Store",
  categorySummary: "Двери",
  discountPercent: 5,
  createdAt: "2026-10-01T10:00:00.000Z",
  archivedInWorkspace: false,
  hasOrders: false,
  canMutateIssuer: false,
  issuedBy: { id: "emp-1", name: "Иван" },
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

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("specialist employee (no Branch): the employer's issuer list", () => {
  function renderSpecialistEmployee(canIssue: boolean) {
    return render(
      <OwnerIssuerModeProvider
        mode="business"
        businessPartnerType="STORE"
        canIssueCertificates={canIssue}
        isBranchStaff
        staffBranches={[]}
        employerLabel="Мастер Иван"
      >
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
  }

  it("lists the employer certificates read-only (no selection column), with the create entry for an issuing employee", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf([row]) as never);
    renderSpecialistEmployee(true);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(screen.getByTestId("business-certificates-create-cta")).toBeVisible();
    expect(screen.getByTestId("create-dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.queryByTestId("certificates-branch-filter")).not.toBeInTheDocument();
    expect(fetchBusinessOwnerCertificates).toHaveBeenCalledTimes(1);
  });

  it("row actions are share-only: no archive, rename, cancel or delete", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf([row]) as never);
    renderSpecialistEmployee(true);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(screen.getAllByRole("button", { name: "Поделиться" }).length).toBeGreaterThan(0);
    for (const label of [/Переименовать/, /В архив/, /Отключить/, /Удалить/, /Изменить скидки/]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
  });

  it("without the issue right nothing can be created, the list stays readable", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf([row]) as never);
    renderSpecialistEmployee(false);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(screen.queryByTestId("business-certificates-create-cta")).not.toBeInTheDocument();
    expect(screen.queryByTestId("create-dialog")).not.toBeInTheDocument();
  });

  it("the page eyebrow is the employer, not the employee's own profile", () => {
    expect(businessCertificatesPageCopy({ partnerType: "STORE" }, { employerLabel: "Мастер Иван" }).eyebrow).toBe(
      "Мастер Иван",
    );
    expect(businessCertificatesPageCopy({ partnerType: "COMPANY" }).eyebrow).toBe("Компания");
    expect(businessCertificatesPageCopy({ partnerType: "STORE" }, { employerLabel: "  " }).eyebrow).toBe("Магазин");
  });
});

describe("agent employee: issuer/observer of the employer's certificates only", () => {
  it("reads the AGENT certificates list read-only (no selection, share-only), no owner actions", async () => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue(listOf([{ ...row, canMutateIssuer: true }]) as never);
    render(
      <OwnerIssuerModeProvider mode="legacy" canIssueCertificates agentEmployee employerLabel="Агент Иван">
        <AgentCertificatesList />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(fetchAgentCertificates).toHaveBeenCalledTimes(1);
    expect(within(screen.getByRole("table")).queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getAllByRole("button", { name: "Поделиться" }).length).toBeGreaterThan(0);
    for (const label of [/Переименовать/, /В архив/, /Отключить/, /Удалить/]) {
      expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    }
  });

  it("regression: the agent OWNER keeps selection and the full action set", async () => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue(listOf([{ ...row, canMutateIssuer: true }]) as never);
    render(<AgentCertificatesList />);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    expect(within(screen.getByRole("table")).queryAllByRole("checkbox").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /В архив/ }).length).toBeGreaterThan(0);
  });
});
