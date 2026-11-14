import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentCertificatesList } from "./AgentCertificatesList";
import { OwnerIssuerModeProvider } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchBusinessOwnerCertificates } from "@/lib/business-owner-certificates/api";
import { fetchOrgOwnerContextBranches } from "@/lib/business-owner-certificates/pro-context-branches";
import { fetchSpecialistIssuerCertificates } from "@/lib/specialist-certificates/api";

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

vi.mock("@/lib/business-owner-certificates/pro-context-branches", () => ({
  fetchOrgOwnerContextBranches: vi.fn(),
}));

vi.mock("@/lib/specialist-certificates/api", () => ({
  fetchSpecialistIssuerCertificates: vi.fn(),
  patchSpecialistIssuerCertificate: vi.fn(),
  deleteSpecialistIssuerCertificate: vi.fn(),
  batchSpecialistIssuerCertificates: vi.fn(),
}));

const certRow = {
  id: "cert-1",
  promoCode: "G1",
  displayCode: "S-G1",
  title: "Gate cert",
  userAlias: "Gate cert",
  status: "ACTIVE",
  partnerStoreName: "Store",
  categorySummary: "Двери",
  discountPercent: 5,
  createdAt: "2026-10-01T10:00:00.000Z",
  archivedInWorkspace: false,
  hasOrders: false,
  canMutateIssuer: true,
};

function listMeta(count: number) {
  return {
    certificates: count ? [certRow] : [],
    page: 1,
    pageSize: 25,
    totalCount: count,
    totalPages: 1,
    activeCount: count,
    archivedCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    sort: "created_desc" as const,
  };
}

describe("AgentCertificatesList business branch list scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listMeta(1));
  });

  it("auto-selects single branch and passes branchId on list GET", async () => {
    vi.mocked(fetchOrgOwnerContextBranches).mockResolvedValue({
      ok: true,
      branches: [{ id: "branch-a", name: "TEST", city: "Краснодар" }],
    });
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(fetchBusinessOwnerCertificates).toHaveBeenCalled());
    const params = vi.mocked(fetchBusinessOwnerCertificates).mock.calls.at(-1)?.[0];
    expect(params?.branchId).toBe("branch-a");
    expect(screen.queryByTestId("business-certificates-branch-select")).not.toBeInTheDocument();
  });

  it("requires branch pick for multiple branches and resets pagination on change", async () => {
    vi.mocked(fetchOrgOwnerContextBranches).mockResolvedValue({
      ok: true,
      branches: [
        { id: "branch-a", name: "A", city: "X" },
        { id: "branch-b", name: "B", city: "Y" },
      ],
    });
    const user = userEvent.setup();
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-certificates-branch-select")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("business-certificates-branch-required")).toBeInTheDocument();
    expect(screen.queryByTestId("business-certificates-empty")).not.toBeInTheDocument();
    expect(fetchBusinessOwnerCertificates).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByTestId("business-certificates-branch-select"), "branch-b");
    await waitFor(() => expect(fetchBusinessOwnerCertificates).toHaveBeenCalled());
    expect(vi.mocked(fetchBusinessOwnerCertificates).mock.calls.at(-1)?.[0]?.branchId).toBe(
      "branch-b",
    );
    vi.mocked(fetchBusinessOwnerCertificates).mockClear();
    await user.selectOptions(screen.getByTestId("business-certificates-branch-select"), "branch-a");
    await waitFor(() => expect(fetchBusinessOwnerCertificates).toHaveBeenCalled());
    expect(vi.mocked(fetchBusinessOwnerCertificates).mock.calls[0]?.[0]?.page).toBe(1);
  });

  it("blocked context shows error instead of empty success", async () => {
    vi.mocked(fetchOrgOwnerContextBranches).mockResolvedValue({
      ok: false,
      forbidden: true,
      message: "Forbidden",
    });
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Forbidden"));
    expect(fetchBusinessOwnerCertificates).not.toHaveBeenCalled();
  });

  it("context error retry reloads context then list GET", async () => {
    vi.mocked(fetchOrgOwnerContextBranches)
      .mockResolvedValueOnce({
        ok: false,
        forbidden: true,
        message: "Forbidden",
      })
      .mockResolvedValueOnce({
        ok: true,
        branches: [{ id: "branch-a", name: "TEST", city: "Краснодар" }],
      });
    const user = userEvent.setup();
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Forbidden"));
    expect(fetchOrgOwnerContextBranches).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: /Повторить/i }));
    await waitFor(() => expect(fetchOrgOwnerContextBranches).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(fetchBusinessOwnerCertificates).toHaveBeenCalled());
    expect(vi.mocked(fetchBusinessOwnerCertificates).mock.calls.at(-1)?.[0]?.branchId).toBe(
      "branch-a",
    );
  });

  it("discards stale list response after branch switch A to B", async () => {
    const certA = { ...certRow, id: "cert-a", title: "Branch A only", userAlias: "Branch A only" };
    const certB = { ...certRow, id: "cert-b", title: "Branch B only", userAlias: "Branch B only" };
    vi.mocked(fetchOrgOwnerContextBranches).mockResolvedValue({
      ok: true,
      branches: [
        { id: "branch-a", name: "A", city: "X" },
        { id: "branch-b", name: "B", city: "Y" },
      ],
    });
    const pendingList: Partial<
      Record<"branch-a" | "branch-b", (value: ReturnType<typeof listMeta> & { certificates: typeof certRow[] }) => void>
    > = {};
    vi.mocked(fetchBusinessOwnerCertificates).mockImplementation((params) => {
      const branchId = params?.branchId;
      if (branchId === "branch-a" || branchId === "branch-b") {
        return new Promise((resolve) => {
          pendingList[branchId] = (value) => resolve(value);
        });
      }
      return Promise.resolve(listMeta(0));
    });
    const user = userEvent.setup();
    render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("business-certificates-branch-select")).toBeInTheDocument(),
    );
    await user.selectOptions(screen.getByTestId("business-certificates-branch-select"), "branch-a");
    await waitFor(() =>
      expect(fetchBusinessOwnerCertificates).toHaveBeenCalledWith(
        expect.objectContaining({ branchId: "branch-a" }),
      ),
    );
    await user.selectOptions(screen.getByTestId("business-certificates-branch-select"), "branch-b");
    await waitFor(() =>
      expect(fetchBusinessOwnerCertificates).toHaveBeenLastCalledWith(
        expect.objectContaining({ branchId: "branch-b" }),
      ),
    );
    await waitFor(() => expect(pendingList["branch-b"]).toBeDefined());
    pendingList["branch-b"]!({ ...listMeta(1), certificates: [certB] });
    await waitFor(() => expect(screen.getAllByText("Branch B only").length).toBeGreaterThan(0));
    pendingList["branch-a"]?.({ ...listMeta(1), certificates: [certA] });
    await waitFor(() => {
      expect(screen.queryByText("Branch A only")).not.toBeInTheDocument();
      expect(screen.getAllByText("Branch B only").length).toBeGreaterThan(0);
    });
  });

  it("ignores delayed business context after unmount", async () => {
    let resolveContext!: (v: Awaited<ReturnType<typeof fetchOrgOwnerContextBranches>>) => void;
    vi.mocked(fetchOrgOwnerContextBranches).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveContext = resolve;
        }),
    );
    const { unmount } = render(
      <OwnerIssuerModeProvider mode="business" businessPartnerType="STORE">
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    unmount();
    resolveContext({
      ok: true,
      branches: [{ id: "branch-a", name: "A", city: "X" }],
    });
    await Promise.resolve();
    expect(fetchBusinessOwnerCertificates).not.toHaveBeenCalled();
  });
});

describe("AgentCertificatesList specialist unaffected", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchSpecialistIssuerCertificates).mockResolvedValue(listMeta(0));
  });

  it("does not require business branch context", async () => {
    render(
      <OwnerIssuerModeProvider mode="specialist">
        <AgentCertificatesList accessMode="specialist" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(fetchSpecialistIssuerCertificates).toHaveBeenCalled());
    expect(fetchOrgOwnerContextBranches).not.toHaveBeenCalled();
  });
});