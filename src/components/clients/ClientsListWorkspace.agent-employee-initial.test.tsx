import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CabinetPresentationProvider } from "@/components/layout/CabinetPresentationContext";
import { cabinetPresentationFixture } from "@/lib/cabinet-presentation/test-fixtures";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import { fetchSpecialistR06Status } from "@/lib/specialist-r06/api";
import { fetchEmployeeIssuerStatusSafe } from "@/lib/employee-issuer/api";
import { fetchObserverReferredAppeals } from "@/lib/clients-parity/fetch-observer-appeals";
import { remcardFetch } from "@/lib/api-client";
import type { EmployeeIssuerStatus } from "@/lib/employee-issuer/types";
import { ClientsListWorkspace } from "./ClientsListWorkspace";

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/lib/api-client", () => ({ remcardFetch: vi.fn(), RemcardApiError: class extends Error {} }));
vi.mock("@/lib/agent-r03/api", () => ({ fetchAgentR03Status: vi.fn() }));
vi.mock("@/lib/specialist-r06/api", () => ({ fetchSpecialistR06Status: vi.fn() }));
vi.mock("@/lib/employee-issuer/api", () => ({ fetchEmployeeIssuerStatusSafe: vi.fn() }));
vi.mock("@/lib/clients-parity/fetch-observer-appeals", () => ({ fetchObserverReferredAppeals: vi.fn() }));
vi.mock("@/components/clients/receiving/ReceivingAppealsWorkspace", () => ({
  ReceivingAppealsWorkspace: () => <div data-testid="receiving-workspace" />,
}));
vi.mock("@/components/clients/observer/ObserverPartnersWorkspace", () => ({
  ObserverPartnersWorkspace: () => <div data-testid="observer-workspace" />,
}));
vi.mock("@/components/agent-r03/AgentClientsList", () => ({
  AgentClientsList: () => <div data-testid="own-clients-list" />,
}));

const employee = {
  id: "emp-1",
  displayName: "Сотрудник",
  role: "CLIENT" as const,
  partnerType: null,
  partnerActivities: [],
};
const assistantContext = (role: "PARTNER_MANAGER" | "PARTNER_EMPLOYEE") => ({
  role,
  organization: null,
  branches: [],
  activeBranch: null,
  employer: { id: "employer-1", displayName: "Работодатель" },
});

const status = (over: Partial<EmployeeIssuerStatus>): EmployeeIssuerStatus => ({
  applicable: true,
  workspace: "agent",
  canIssue: true,
  canManageClients: true,
  role: "MANAGER",
  source: "partner",
  employerDisplayName: "Агент Иван",
  ...over,
});

function open(role: "PARTNER_MANAGER" | "PARTNER_EMPLOYEE", issuer: EmployeeIssuerStatus | null) {
  vi.mocked(fetchEmployeeIssuerStatusSafe).mockResolvedValue(issuer);
  return render(
    <CabinetPresentationProvider value={cabinetPresentationFixture(employee, assistantContext(role))}>
      <ClientsListWorkspace />
    </CabinetPresentationProvider>,
  );
}

beforeEach(() => {
  vi.mocked(fetchAgentR03Status).mockReset().mockResolvedValue({ featureEnabled: true, eligible: false } as never);
  vi.mocked(fetchSpecialistR06Status).mockReset().mockResolvedValue({ featureEnabled: true, eligible: false } as never);
  vi.mocked(fetchObserverReferredAppeals).mockReset().mockResolvedValue({ ok: true, appeals: [] } as never);
  vi.mocked(remcardFetch).mockReset().mockResolvedValue({ user: employee });
  vi.mocked(fetchEmployeeIssuerStatusSafe).mockReset();
});

describe("AB-11: initial /clients of an AGENT's employee (fresh session, no query)", () => {
  it.each([
    ["MANAGER", "PARTNER_MANAGER" as const, { role: "MANAGER" as const, canIssue: true, canManageClients: true }],
    ["SELLER with only the explicit issue right", "PARTNER_EMPLOYEE" as const, { role: "SELLER" as const, canIssue: true, canManageClients: false }],
    ["SELLER with only the explicit clients right", "PARTNER_EMPLOYEE" as const, { role: "SELLER" as const, canIssue: false, canManageClients: true }],
  ])("%s opens the observer-only screen at once: no receiving tab, no «Специалист»", async (_n, ctxRole, rights) => {
    open(ctxRole, status(rights));
    expect(await screen.findByTestId("observer-workspace")).toBeInTheDocument();
    expect(screen.queryByTestId("receiving-workspace")).not.toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("Специалист")).not.toBeInTheDocument();
    expect(screen.getAllByText("Агент").length).toBeGreaterThan(0);
  });

  it.each([
    ["VIEWER", { role: "VIEWER" as const, canIssue: false, canManageClients: false }],
    ["no issue / clients right", { role: "MANAGER" as const, canIssue: false, canManageClients: false }],
  ])("%s gets no new rights: honest unavailable state, no CRM, no observer", async (_n, rights) => {
    open("PARTNER_MANAGER", status(rights));
    expect(await screen.findByText(/недоступен для текущего кабинета/i)).toBeInTheDocument();
    expect(screen.queryByTestId("observer-workspace")).not.toBeInTheDocument();
    expect(screen.queryByTestId("receiving-workspace")).not.toBeInTheDocument();
  });

  it("revoked rights (status not applicable) keep the previous behaviour: no observer, the server still denies", async () => {
    open("PARTNER_MANAGER", { applicable: false, workspace: null, canIssue: false });
    await waitFor(() => expect(screen.queryByText("Загрузка…")).not.toBeInTheDocument());
    expect(screen.queryByTestId("observer-workspace")).not.toBeInTheDocument();
  });
});

describe("AB-11: a non-agent employee keeps the directions available to them", () => {
  it("specialist's assistant: «Специалист», incoming list, «у партнёров» tab only after the server confirms", async () => {
    open("PARTNER_EMPLOYEE", status({ workspace: "specialist", employerDisplayName: "Мастер" }));
    expect(await screen.findByTestId("receiving-workspace")).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(2));
    expect(screen.getAllByText("Специалист").length).toBeGreaterThan(0);
    expect(screen.queryByText("Агент")).not.toBeInTheDocument();
  });

  it("specialist's assistant without any employer-status (null): unchanged specialist screen", async () => {
    open("PARTNER_EMPLOYEE", null);
    expect(await screen.findByTestId("receiving-workspace")).toBeInTheDocument();
    expect(screen.getAllByText("Специалист").length).toBeGreaterThan(0);
  });

  it("the status of the employee is not even requested for an owner (R03 eligible)", async () => {
    vi.mocked(fetchAgentR03Status).mockResolvedValue({ featureEnabled: true, eligible: true } as never);
    open("PARTNER_MANAGER", status({}));
    expect(await screen.findByTestId("observer-workspace")).toBeInTheDocument();
    expect(fetchEmployeeIssuerStatusSafe).not.toHaveBeenCalled();
  });
});
