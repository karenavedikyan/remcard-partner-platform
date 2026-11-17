import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentR03Gate, AGENT_EMPLOYEE_NO_ACCESS_NOTE } from "./AgentR03Gate";
import { useOwnerIssuerModeValue } from "@/components/specialist-certificates/OwnerIssuerModeContext";
import { fetchAgentR03Status } from "@/lib/agent-r03/api";
import { fetchEmployeeIssuerStatusSafe } from "@/lib/employee-issuer/api";

vi.mock("@/lib/agent-r03/api", () => ({ fetchAgentR03Status: vi.fn() }));
vi.mock("@/lib/employee-issuer/api", () => ({ fetchEmployeeIssuerStatusSafe: vi.fn() }));

function Child() {
  const v = useOwnerIssuerModeValue();
  return <div data-testid="child" data-agent-employee={String(v?.agentEmployee)} data-label={v?.employerLabel ?? ""} />;
}

const agentOwner = { featureEnabled: true, eligible: true } as never;
const notAgent = { featureEnabled: true, eligible: false } as never;

beforeEach(() => vi.clearAllMocks());

describe("AgentR03Gate: agent owner and the agent's employee", () => {
  it("agent owner: children render with no employee flags and no employee lookup", async () => {
    vi.mocked(fetchAgentR03Status).mockResolvedValue(agentOwner);
    render(<AgentR03Gate><Child /></AgentR03Gate>);
    const child = await screen.findByTestId("child");
    expect(child.dataset.agentEmployee).toBe("undefined");
    expect(fetchEmployeeIssuerStatusSafe).not.toHaveBeenCalled();
  });

  it("employee of an agent with the issue right: admitted as an issuer/observer with the employer label", async () => {
    vi.mocked(fetchAgentR03Status).mockResolvedValue(notAgent);
    vi.mocked(fetchEmployeeIssuerStatusSafe).mockResolvedValue({
      applicable: true,
      workspace: "agent",
      canIssue: true,
      employerDisplayName: "Агент Иван",
    });
    render(<AgentR03Gate><Child /></AgentR03Gate>);
    const child = await screen.findByTestId("child");
    expect(child.dataset.agentEmployee).toBe("true");
    expect(child.dataset.label).toBe("Агент Иван");
  });

  it("employee of an agent without the issue right: an explanation, no screens", async () => {
    vi.mocked(fetchAgentR03Status).mockResolvedValue(notAgent);
    vi.mocked(fetchEmployeeIssuerStatusSafe).mockResolvedValue({ applicable: true, workspace: "agent", canIssue: false });
    render(<AgentR03Gate><Child /></AgentR03Gate>);
    expect(await screen.findByTestId("agent-employee-no-access")).toHaveTextContent(AGENT_EMPLOYEE_NO_ACCESS_NOTE);
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("forbidden contexts stay blocked: specialist/business employee, not an employee, failed status call", async () => {
    vi.mocked(fetchAgentR03Status).mockResolvedValue(notAgent);
    for (const status of [
      { applicable: true, workspace: "specialist", canIssue: true },
      { applicable: true, workspace: "business", canIssue: true },
      { applicable: false, workspace: null, canIssue: false },
      null,
    ]) {
      vi.mocked(fetchEmployeeIssuerStatusSafe).mockResolvedValue(status as never);
      const { unmount } = render(<AgentR03Gate><Child /></AgentR03Gate>);
      await waitFor(() => expect(screen.getByText(/Раздел недоступен/)).toBeInTheDocument());
      expect(screen.queryByTestId("child")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("feature flag off blocks everybody and the employee status is not even requested", async () => {
    vi.mocked(fetchAgentR03Status).mockResolvedValue({ featureEnabled: false, eligible: false } as never);
    vi.mocked(fetchEmployeeIssuerStatusSafe).mockResolvedValue({ applicable: true, workspace: "agent", canIssue: true });
    render(<AgentR03Gate><Child /></AgentR03Gate>);
    await waitFor(() => expect(screen.getByText(/Раздел недоступен/)).toBeInTheDocument());
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
    expect(fetchEmployeeIssuerStatusSafe).not.toHaveBeenCalled();
  });
});
