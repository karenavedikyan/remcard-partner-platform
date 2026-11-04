import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import type { Partnership, ProProfileResponse } from "@/lib/types";
import { remcardFetch, RemcardApiError } from "@/lib/api-client";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({ products: [], services: [], stages: [] }),
}));

vi.mock("@/lib/api-client", () => ({
  remcardFetch: vi.fn(),
  RemcardApiError: class RemcardApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
      this.name = "RemcardApiError";
    }
  },
}));

const agentProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "agent-me",
    publicId: "RC-AGENT",
    displayName: "Agent",
    city: "Краснодар",
    specializations: [],
    role: "PRO",
    partnerType: "COMPANY",
    partnerActivities: ["AGENT"],
    description: null,
    catalogStatus: "APPROVED",
    isPublic: true,
    rejectionReason: null,
    badges: [],
    photoUrl: null,
    storeCategories: [],
    areas: [],
    website: null,
    telegram: null,
    whatsapp: null,
    instagram: null,
    vk: null,
    max: null,
    yandex: null,
    publicEmail: null,
    publicPhone: null,
    showFullName: false,
  },
};

function renderOverviewHub() {
  return render(
    <PartnersHub
      meId="agent-me"
      initialProfile={agentProfile}
      variant="agent-r04"
      agentPresentation="overview"
      partnersAudience="agent-r04"
      onOpenPartnerHub={vi.fn()}
    />,
  );
}

function stubListSideRoutes() {
  return {
    async side(path: string) {
      if (path.startsWith("/api/partnership/search")) {
        return { partners: [], nextCursor: null };
      }
      if (path === "/api/partnership/link-invite") {
        return { invites: [] };
      }
      throw new Error(`unexpected ${path}`);
    },
  };
}

describe("PartnersHub overview first paint", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("pending -> rejected list -> alert+retry -> retry pending -> empty welcome", async () => {
    const user = userEvent.setup();
    const releaseWaiters: Array<() => void> = [];
    let listMode: "hold" | "fail" | "ok" = "hold";
    const side = stubListSideRoutes();
    const releaseHeldListFetches = () => {
      releaseWaiters.splice(0).forEach((release) => release());
    };

    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/partnership/list") {
        if (listMode === "hold") {
          await new Promise<void>((resolve) => {
            releaseWaiters.push(resolve);
          });
        }
        if (listMode === "fail") {
          throw new RemcardApiError(500, "Список недоступен");
        }
        return { partnerships: [] };
      }
      return side.side(path);
    });

    renderOverviewHub();
    await waitFor(() =>
      expect(screen.getByTestId("partners-welcome-decision-pending")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("partners-overview-error")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();

    listMode = "fail";
    releaseHeldListFetches();
    await waitFor(() => expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument());
    expect(screen.queryByTestId("partners-welcome-decision-pending")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();

    listMode = "hold";
    await user.click(screen.getByRole("button", { name: /Повторить/i }));
    await waitFor(() =>
      expect(screen.getByTestId("partners-welcome-decision-pending")).toBeInTheDocument(),
    );

    listMode = "ok";
    releaseHeldListFetches();
    await waitFor(() => expect(screen.getByTestId("partners-empty")).toBeInTheDocument());
    expect(screen.queryByTestId("partners-overview-error")).not.toBeInTheDocument();
  });

  it("pending -> malformed payload -> alert without welcome", async () => {
    let resolveList!: (value: unknown) => void;
    const side = stubListSideRoutes();

    vi.mocked(remcardFetch).mockImplementation(async (path: string) => {
      if (path === "/api/partnership/list") {
        return new Promise((resolve) => {
          resolveList = resolve;
        });
      }
      return side.side(path);
    });

    renderOverviewHub();
    expect(screen.getByTestId("partners-welcome-decision-pending")).toBeInTheDocument();

    resolveList({ partnerships: null });
    await waitFor(() => expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument());
    expect(screen.queryByTestId("partners-welcome-decision-pending")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });
});
