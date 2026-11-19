import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import { partnersAccessNote } from "@/lib/partners/access-note";
import type { ProContextSnapshot } from "@/lib/profile-cabinet-access";
import type { ProProfileResponse } from "@/lib/types";
import { RemcardApiError, remcardFetch } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));
vi.mock("@/lib/agent-r04/api", () => ({ patchPartnershipListPreference: vi.fn() }));
vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({ products: [], services: [], stages: [] }),
}));
vi.mock("@/components/partners/AgentPartnerWorkspaceActions", () => ({
  AgentPartnerWorkspaceActions: () => <div />,
}));
vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

const profile = {
  organization: null,
  programs: [],
  user: {
    id: "emp-1",
    publicId: "RC-EMP",
    displayName: "Сотрудник",
    city: "Москва",
    specializations: [],
    role: "CLIENT",
    partnerType: null,
    partnerActivities: [],
    description: null,
    catalogStatus: "APPROVED",
    isPublic: false,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: [],
    areas: [],
  },
} as unknown as ProProfileResponse;

const branchManager = { role: "BRANCH_MANAGER" } as unknown as ProContextSnapshot;

function mockList(behaviour: "403" | "500") {
  vi.mocked(remcardFetch).mockImplementation(async (path) => {
    if (path === "/api/partnership/list") {
      throw new RemcardApiError(behaviour === "403" ? 403 : 500, behaviour === "403" ? "Доступно только партнёрам" : "Сбой");
    }
    if (path === "/api/partnership/link-invite") return { active: { items: [], nextCursor: null }, archive: { items: [], nextCursor: null }, activeLimit: 50 };
    throw new Error(`unexpected ${String(path)}`);
  });
}

function renderHub(proContext: ProContextSnapshot | null) {
  return render(
    <PartnersHub
      meId="emp-1"
      initialProfile={profile}
      variant="agent-r04"
      agentPresentation="overview"
      partnersAudience="agent-r04"
      onOpenPartnerHub={vi.fn()}
      proContext={proContext}
      proContextReady
    />,
  );
}

beforeEach(() => {
  vi.mocked(remcardFetch).mockReset();
});

describe("AB-06: closed «Партнёры» for an employee without full partnership coverage", () => {
  it("403: explains the work restriction, no «Доступно только партнёрам», no retry", async () => {
    mockList("403");
    renderHub(branchManager);
    const note = await screen.findByTestId("partners-overview-access-note");
    expect(note).toHaveTextContent(/во всех её филиалах/);
    expect(note).toHaveTextContent(/обратитесь к владельцу/i);
    expect(screen.queryByText("Доступно только партнёрам")).toBeNull();
    expect(screen.queryByRole("button", { name: "Повторить" })).toBeNull();
    expect(screen.queryByTestId("partners-overview-error")).toBeNull();
  });

  it("5xx keeps the error with «Повторить»", async () => {
    mockList("500");
    renderHub(branchManager);
    await waitFor(() => expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Повторить" })).toBeInTheDocument();
    expect(screen.queryByTestId("partners-overview-access-note")).toBeNull();
  });
});

describe("partnersAccessNote", () => {
  it("is role specific and never suggests a retry", () => {
    expect(partnersAccessNote({ role: "BRANCH_EMPLOYEE" } as ProContextSnapshot)).toMatch(/всех её филиалах/);
    expect(partnersAccessNote({ role: "ORG_TEAM_MEMBER" } as ProContextSnapshot)).toMatch(/всех её филиалах/);
    expect(partnersAccessNote({ role: "PARTNER_MANAGER" } as ProContextSnapshot)).toMatch(/управляет владелец/);
    expect(partnersAccessNote(null)).toMatch(/недоступен для этой учётной записи/);
    for (const role of ["BRANCH_MANAGER", "PARTNER_EMPLOYEE", "SOLO_PARTNER"]) {
      expect(partnersAccessNote({ role } as ProContextSnapshot)).not.toMatch(/повтор/i);
    }
  });
});
