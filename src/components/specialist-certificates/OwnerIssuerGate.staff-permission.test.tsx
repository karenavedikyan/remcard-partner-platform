import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OwnerIssuerGate } from "./OwnerIssuerGate";
import { useOwnerIssuerModeValue } from "./OwnerIssuerModeContext";
import { useBusinessSectionDispatch } from "@/lib/business-workplace/use-business-section-dispatch";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";

vi.mock("@/lib/business-workplace/use-business-section-dispatch");
vi.mock("@/components/layout/CabinetPresentationContext", () => ({
  useCabinetPresentation: () => null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/recommendations",
  useSearchParams: () => new URLSearchParams(),
}));

function Probe() {
  const value = useOwnerIssuerModeValue();
  return (
    <div
      data-testid="probe"
      data-can-issue={String(value?.canIssueCertificates)}
      data-staff={String(value?.isBranchStaff)}
    />
  );
}

function renderWith(proContext: ProContextSnapshot | null) {
  vi.mocked(useBusinessSectionDispatch).mockReturnValue({
    loading: false,
    error: "",
    decision: { kind: "business", partnerType: "COMPANY" },
    proContext,
  });
  render(
    <OwnerIssuerGate>
      <Probe />
    </OwnerIssuerGate>,
  );
  return screen.getByTestId("probe");
}

describe("OwnerIssuerGate: certificate issuing permission", () => {
  it("employee with canManageCertificates may issue", () => {
    const probe = renderWith({
      role: "BRANCH_EMPLOYEE",
      branchRole: "SELLER",
      branchAssignments: [
        {
          branchId: "b1",
          status: "ACTIVE",
          effectivePermissions: { canManageCertificates: true } as NonNullable<ProContextSnapshot["effectivePermissions"]>,
        },
      ],
    });
    expect(probe.dataset.canIssue).toBe("true");
    expect(probe.dataset.staff).toBe("true");
  });

  it("employee without the permission may not issue", () => {
    const probe = renderWith({
      role: "BRANCH_EMPLOYEE",
      branchRole: "SELLER",
      branchAssignments: [
        {
          branchId: "b1",
          status: "ACTIVE",
          effectivePermissions: { canManageCertificates: false } as NonNullable<ProContextSnapshot["effectivePermissions"]>,
        },
      ],
    });
    expect(probe.dataset.canIssue).toBe("false");
  });

  it("owner keeps issuing", () => {
    const probe = renderWith({ role: "ORG_OWNER" });
    expect(probe.dataset.canIssue).toBe("true");
    expect(probe.dataset.staff).toBe("false");
  });
});
