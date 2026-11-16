import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PartnersOverviewLayout } from "./PartnersOverviewLayout";

const props = {
  lead: "Lead",
  counts: { active: 3, decisions: 0, outgoing: 0, activeCounterparties: 2 },
  loading: false,
  error: "",
  listReady: true,
  onRetry: vi.fn(),
  onOpenFind: vi.fn(),
  onOpenLink: vi.fn(),
  onTileNavigate: vi.fn(),
  waitingOpen: false,
  onWaitingOpenChange: vi.fn(),
  decisionSlot: null,
  activeSlot: <div>active</div>,
  waitingSlot: null,
  zoneRefs: {
    active: createRef<HTMLDivElement>(),
    decide: createRef<HTMLDivElement>(),
    waiting: createRef<HTMLDetailsElement>(),
  },
  collectionIsEmpty: false,
  greetingVariant: "history" as const,
  hasArchivedOrHiddenActive: false,
  collectionCount: 3,
  legacyDisclosureOpen: true,
  onLegacyDisclosureOpenChange: vi.fn(),
  legacyChromePinned: false,
  legacyBulkOutcomeVisible: false,
};

describe("PartnersOverviewLayout directions", () => {
  it("counts a mutually-recommending person once on the partners tile", () => {
    render(<PartnersOverviewLayout {...props} />);
    const tiles = screen.getByTestId("partners-overview-tiles");
    expect(tiles).toHaveTextContent("2");
    expect(tiles.textContent).not.toMatch(/\b3\b/);
  });

  it("falls back to the row count when distinct counterparties are not provided", () => {
    render(<PartnersOverviewLayout {...props} counts={{ active: 3, decisions: 0, outgoing: 0 }} />);
    expect(screen.getByTestId("partners-overview-tiles")).toHaveTextContent("3");
  });

  it("renders the general-terms entry slot only when provided", () => {
    const { rerender } = render(<PartnersOverviewLayout {...props} />);
    expect(screen.queryByTestId("partners-overview-policy")).toBeNull();
    rerender(<PartnersOverviewLayout {...props} policySlot={<span>entry</span>} />);
    expect(screen.getByTestId("partners-overview-policy")).toHaveTextContent("entry");
  });
});
