import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OwnerIssuerGate } from "./OwnerIssuerGate";
import { useOwnerIssuerModeValue } from "./OwnerIssuerModeContext";
import { useBusinessSectionDispatch } from "@/lib/business-workplace/use-business-section-dispatch";
import type { BusinessSectionDispatchDecision } from "@/lib/business-workplace/dispatch-priority";

const replace = vi.fn();

vi.mock("@/lib/business-workplace/use-business-section-dispatch");
vi.mock("@/components/layout/CabinetPresentationContext", () => ({
  useCabinetPresentation: () => null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/recommendations",
  useSearchParams: () => new URLSearchParams(),
}));

function Probe() {
  const v = useOwnerIssuerModeValue();
  return (
    <div
      data-testid="probe"
      data-mode={v?.mode}
      data-can-issue={String(v?.canIssueCertificates)}
      data-staff={String(v?.isBranchStaff)}
      data-label={v?.employerLabel ?? ""}
      data-branches={String(v?.staffBranches?.length)}
    />
  );
}

function renderWith(decision: BusinessSectionDispatchDecision | null) {
  vi.mocked(useBusinessSectionDispatch).mockReturnValue({
    loading: false,
    error: "",
    decision,
    proContext: { role: "PARTNER_EMPLOYEE" },
  });
  render(
    <OwnerIssuerGate>
      <Probe />
    </OwnerIssuerGate>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("OwnerIssuerGate: employee of a specialist / organization without Branch", () => {
  it("opens the employer's issuer workspace: business list, read-only except issuing, employer label, no branches", () => {
    renderWith({ kind: "employee-issuer", canIssue: true, employerLabel: "Мастер Иван" });
    const probe = screen.getByTestId("probe");
    expect(probe.dataset.mode).toBe("business");
    expect(probe.dataset.canIssue).toBe("true");
    expect(probe.dataset.staff).toBe("true");
    expect(probe.dataset.label).toBe("Мастер Иван");
    expect(probe.dataset.branches).toBe("0");
  });

  it("without the issue right the workspace stays read-only (canIssue false)", () => {
    renderWith({ kind: "employee-issuer", canIssue: false, employerLabel: null });
    const probe = screen.getByTestId("probe");
    expect(probe.dataset.canIssue).toBe("false");
    expect(probe.dataset.staff).toBe("true");
    expect(probe.dataset.label).toBe("Работодатель");
  });

  it("agent employer: redirects to the agent certificates screens instead of rendering the specialist shell", async () => {
    renderWith({ kind: "agent-r03" });
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    expect(replace.mock.calls[0]![0]).toContain("/certificates");
    expect(screen.queryByTestId("probe")).not.toBeInTheDocument();
  });

  it("regression: an owner (specialist-r06) is not an employee shell and not read-only", () => {
    renderWith({ kind: "specialist-r06" });
    const probe = screen.getByTestId("probe");
    expect(probe.dataset.mode).toBe("specialist");
    expect(probe.dataset.staff).toBe("undefined");
    expect(probe.dataset.label).toBe("");
  });

  it("regression: a branch employee keeps the business shell with branches from the context", () => {
    vi.mocked(useBusinessSectionDispatch).mockReturnValue({
      loading: false,
      error: "",
      decision: { kind: "business", partnerType: "STORE" },
      proContext: {
        role: "BRANCH_EMPLOYEE",
        branchRole: "SELLER",
        branches: [{ id: "b1", name: "Центр", city: "Москва" }],
        branchAssignments: [
          {
            branchId: "b1",
            status: "ACTIVE",
            effectivePermissions: { canManageCertificates: true } as never,
          },
        ],
      },
    });
    render(
      <OwnerIssuerGate>
        <Probe />
      </OwnerIssuerGate>,
    );
    const probe = screen.getByTestId("probe");
    expect(probe.dataset.mode).toBe("business");
    expect(probe.dataset.staff).toBe("true");
    expect(probe.dataset.label).toBe("");
  });
});
