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


import { readFileSync } from "node:fs";
import path from "node:path";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

function columns(table: HTMLElement) {
  const head = Array.from(table.querySelectorAll("thead th"));
  const firstRow = Array.from(table.querySelectorAll("tbody tr")[0]!.querySelectorAll("td"));
  return {
    head: head.map((c) => c.getAttribute("data-col")),
    row: firstRow.map((c) => c.getAttribute("data-col")),
    headClasses: head.map((c) => c.className),
    rowClasses: firstRow.map((c) => c.className),
  };
}

const READONLY = ["name", "detail", "status", "action"];

describe("AB-10: read-only employee certificate table keeps semantic column assignment", () => {
  it("specialist/business employee: no selection column, name/detail/status/action classes (not positional)", async () => {
    vi.mocked(fetchBusinessOwnerCertificates).mockResolvedValue(listOf([row]) as never);
    render(
      <OwnerIssuerModeProvider
        mode="business"
        businessPartnerType="STORE"
        canIssueCertificates
        isBranchStaff
        staffBranches={[]}
        employerLabel="Мастер Иван"
      >
        <AgentCertificatesList accessMode="business" />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    const c = columns(screen.getByRole("table"));
    expect(c.head).toEqual(READONLY);
    expect(c.row).toEqual(READONLY);
    expect(c.headClasses[0]).toMatch(/colName/);
    expect(c.headClasses[0]).not.toMatch(/colSelect/);
    expect(c.headClasses[1]).toMatch(/colDetail/);
    expect(c.headClasses[2]).toMatch(/colStatus/);
    expect(c.headClasses[3]).toMatch(/colAction/);
    expect(c.rowClasses[0]).toMatch(/colName/);
    expect(c.rowClasses[3]).toMatch(/colAction/);
  });

  it("agent employee: same read-only column assignment", async () => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue(listOf([row]) as never);
    render(
      <OwnerIssuerModeProvider mode="legacy" canIssueCertificates agentEmployee employerLabel="Агент Иван">
        <AgentCertificatesList />
      </OwnerIssuerModeProvider>,
    );
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    const c = columns(screen.getByRole("table"));
    expect(c.head).toEqual(READONLY);
    expect(c.row).toEqual(READONLY);
    expect(c.headClasses[0]).toMatch(/colName/);
  });

  it("owner table with the real checkbox keeps select + the same four semantic columns", async () => {
    vi.mocked(fetchAgentCertificates).mockResolvedValue(listOf([{ ...row, canMutateIssuer: true }]) as never);
    render(<AgentCertificatesList />);
    await waitFor(() => expect(screen.getByRole("table")).toBeVisible());
    const c = columns(screen.getByRole("table"));
    expect(c.head).toEqual(["select", ...READONLY]);
    expect(c.row).toEqual(["select", ...READONLY]);
    expect(c.headClasses[0]).toMatch(/colSelect/);
    expect(c.headClasses[1]).toMatch(/colName/);
    expect(within(screen.getByRole("table")).queryAllByRole("checkbox").length).toBeGreaterThan(0);
  });
});

describe("AB-10: collection table widths are keyed by column class, never by position", () => {
  const css = readFileSync(path.resolve(__dirname, "agent-r03.module.css"), "utf8");
  const rule = (selector: string) => {
    const m = css.match(new RegExp(`${selector.replace(/[.]/g, "\\.")}\\s*\\{([^}]*)\\}`));
    return m?.[1] ?? "";
  };

  it("no positional rule targets collectionTable columns", () => {
    expect(css).not.toMatch(/\.collectionTable[^{}]*(:nth-child|:first-child|:last-child)[^{}]*\{[^}]*width/);
    expect(css).not.toMatch(/\.collectionTable\s+(th|td):(nth-child|first-child)/);
  });

  it("the 46px checkbox width belongs to colSelect only; name/status/action get their own widths", () => {
    expect(rule(".collectionTable .colSelect")).toMatch(/width:\s*46px/);
    for (const col of ["colName", "colDetail", "colStatus", "colAction"]) {
      expect(rule(`.collectionTable .${col}`)).not.toMatch(/width:\s*46px/);
    }
    expect(rule(".collectionTable .colName")).toMatch(/width:\s*29%/);
    expect(rule(".collectionTable .colStatus")).toMatch(/width:\s*22%/);
    expect(rule(".collectionTable .colAction")).toMatch(/width:\s*280px/);
  });
});
