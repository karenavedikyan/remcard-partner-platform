import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnersHub } from "./PartnersHub";
import type { Partnership, ProProfileResponse } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn().mockResolvedValue({
    products: [],
    services: [],
    stages: [],
  }),
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

const { remcardFetch, RemcardApiError } = await import("@/lib/api-client");

const agentProfile: ProProfileResponse = {
  organization: null,
  programs: [],
  user: {
    id: "agent-me",
    publicId: "QA-AGENT",
    displayName: "Synthetic Agent",
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

function makePartnership(status: "ACTIVE" | "PAUSED" = "ACTIVE"): Partnership {
  return {
    id: "qa-p1",
    status,
    initiatedBy: "store-1",
    pendingProposedBy: null,
    note: null,
    createdAt: "2026-10-01T00:00:00Z",
    updatedAt: "2026-10-01T00:00:00Z",
    storeUserId: "store-1",
    proUserId: "agent-me",
    terms: [
      {
        id: "t1",
        category: "doors",
        categoryLabel: "Двери",
        storePercent: 10,
        isExcluded: false,
        minMargin: null,
      },
    ],
    storeUser: {
      id: "store-1",
      displayName: "Synthetic Store",
      city: "Краснодар",
      specializations: [],
      storeCategories: ["doors"],
      partnerType: "STORE",
    },
    proUser: {
      id: "agent-me",
      displayName: "Synthetic Agent",
      city: "Краснодар",
      specializations: [],
      storeCategories: [],
      partnerType: "COMPANY",
      partnerActivities: ["AGENT"],
    },
  };
}

describe("PartnersHub C1 focus + confirm error", () => {
  beforeEach(() => {
    vi.mocked(remcardFetch).mockReset();
  });

  it("opens term host and focuses draft field after Изменить условия", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
        return { partnerships: [makePartnership("ACTIVE")] };
      }
      if (typeof path === "string" && path.includes("/term-change")) {
        return { requests: [] };
      }
      if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
        return { invites: [] };
      }
      throw new RemcardApiError(500, `fail-closed ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const openButtons = await screen.findAllByTestId("partner-term-change-qa-p1");
    await userEvent.click(openButtons[0]!);

    await waitFor(() => {
      expect(screen.getByTestId("partner-term-change-panel")).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId("term-draft-doors")).toHaveFocus();
    });
  });

  it("Keep returns focus to the dirty draft field", async () => {
    vi.mocked(remcardFetch).mockImplementation(async (path) => {
      if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
        return { partnerships: [makePartnership("ACTIVE")] };
      }
      if (typeof path === "string" && path.includes("/term-change")) {
        return { requests: [] };
      }
      if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
        return { invites: [] };
      }
      throw new RemcardApiError(500, `fail-closed ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const openButtons = await screen.findAllByTestId("partner-term-change-qa-p1");
    await userEvent.click(openButtons[0]!);
    await waitFor(() => expect(screen.getByTestId("term-draft-doors")).toBeInTheDocument());

    await userEvent.type(screen.getByTestId("term-draft-doors"), "15");
    await userEvent.click(screen.getByTestId("term-change-close"));
    await waitFor(() => {
      expect(screen.getByTestId("partner-term-discard-confirm-confirm")).toHaveFocus();
    });

    await userEvent.click(screen.getByTestId("partner-term-discard-confirm-confirm"));
    await waitFor(() => {
      expect(screen.queryByTestId("partner-term-discard-confirm")).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByTestId("term-draft-doors")).toHaveFocus();
    });
    expect(screen.getByTestId("term-draft-doors")).toHaveValue(15);
  });

  it("pause PATCH error stays inside confirm (visible workflow), Cancel does not PATCH", async () => {
    let partnerships = [makePartnership("ACTIVE")];
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      const method = init?.method ?? "GET";
      if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
        return { partnerships };
      }
      if (typeof path === "string" && path.includes("/term-change")) {
        return { requests: [] };
      }
      if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
        return { invites: [] };
      }
      if (
        typeof path === "string" &&
        path.startsWith("/api/partnership/qa-p1") &&
        method === "PATCH"
      ) {
        throw new RemcardApiError(500, "synthetic pause failed");
      }
      throw new RemcardApiError(500, `fail-closed ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const nameButtons = await screen.findAllByTestId("partner-row-name-button");
    await userEvent.click(nameButtons[0]!);
    await waitFor(() => {
      expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
    });
    await userEvent.click(screen.getByTestId("partner-detail-action-pause"));
    await waitFor(() => {
      expect(screen.getByTestId("partner-pause-confirm")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId("partner-pause-confirm-confirm"));
    await waitFor(() => {
      expect(screen.getByTestId("partner-pause-confirm-error")).toHaveTextContent(
        "synthetic pause failed",
      );
    });
    // Confirm remains the active workflow — not dismissed under the detail modal.
    expect(screen.getByTestId("partner-pause-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("partner-pause-confirm-error")).toBeVisible();

    const patchesBeforeCancel = vi
      .mocked(remcardFetch)
      .mock.calls.filter(([, init]) => init?.method === "PATCH").length;
    await userEvent.click(screen.getByTestId("partner-pause-confirm-dismiss"));
    await waitFor(() => {
      expect(screen.queryByTestId("partner-pause-confirm")).not.toBeInTheDocument();
    });
    expect(
      vi.mocked(remcardFetch).mock.calls.filter(([, init]) => init?.method === "PATCH").length,
    ).toBe(patchesBeforeCancel);

    // Detail still available for corrected reopen lifecycle.
    expect(screen.getByTestId("partner-partnership-detail-dialog")).toBeInTheDocument();
    void partnerships;
  });

  it("confirmLifecycleAction uses shared runPartnershipAction (single PATCH transport)", async () => {
    let partnerships = [makePartnership("ACTIVE")];
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      const method = init?.method ?? "GET";
      if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
        return { partnerships };
      }
      if (typeof path === "string" && path.includes("/term-change")) {
        return { requests: [] };
      }
      if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
        return { invites: [] };
      }
      if (
        typeof path === "string" &&
        path.startsWith("/api/partnership/qa-p1") &&
        method === "PATCH"
      ) {
        partnerships = [makePartnership("PAUSED")];
        return { ok: true };
      }
      throw new RemcardApiError(500, `fail-closed ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const nameButtons = await screen.findAllByTestId("partner-row-name-button");
    await userEvent.click(nameButtons[0]!);
    await userEvent.click(await screen.findByTestId("partner-detail-action-pause"));
    await userEvent.click(await screen.findByTestId("partner-pause-confirm-confirm"));

    await waitFor(() => {
      expect(screen.queryByTestId("partner-pause-confirm")).not.toBeInTheDocument();
    });

    const patchCalls = vi
      .mocked(remcardFetch)
      .mock.calls.filter(
        ([path, init]) =>
          typeof path === "string" &&
          path === "/api/partnership/qa-p1" &&
          init?.method === "PATCH",
      );
    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0]?.[1]?.body).toEqual({ action: "pause" });
  });

  it("successful pause restores focus to a live partner control after reload", async () => {
    let partnerships = [makePartnership("ACTIVE")];
    vi.mocked(remcardFetch).mockImplementation(async (path, init) => {
      const method = init?.method ?? "GET";
      if (typeof path === "string" && path.startsWith("/api/partnership/list")) {
        return { partnerships };
      }
      if (typeof path === "string" && path.includes("/term-change")) {
        return { requests: [] };
      }
      if (typeof path === "string" && path.startsWith("/api/partnership/link-invite")) {
        return { invites: [] };
      }
      if (
        typeof path === "string" &&
        path.startsWith("/api/partnership/qa-p1") &&
        method === "PATCH"
      ) {
        partnerships = [makePartnership("PAUSED")];
        return { ok: true };
      }
      throw new RemcardApiError(500, `fail-closed ${String(path)}`);
    });

    render(
      <PartnersHub
        meId="agent-me"
        initialProfile={agentProfile}
        variant="agent-r04"
        agentPresentation="overview"
        forcedTab="list"
      />,
    );

    const nameButtons = await screen.findAllByTestId("partner-row-name-button");
    await userEvent.click(nameButtons[0]!);
    await userEvent.click(await screen.findByTestId("partner-detail-action-pause"));
    await userEvent.click(await screen.findByTestId("partner-pause-confirm-confirm"));

    await waitFor(() => {
      expect(screen.queryByTestId("partner-pause-confirm")).not.toBeInTheDocument();
    });

    await waitFor(() => {
      const focused = document.activeElement as HTMLElement | null;
      expect(focused).not.toBe(document.body);
      expect(
        focused?.getAttribute("data-partnership-id") === "qa-p1" ||
          focused?.getAttribute("data-testid")?.includes("partner-"),
      ).toBe(true);
    });
  });
});
