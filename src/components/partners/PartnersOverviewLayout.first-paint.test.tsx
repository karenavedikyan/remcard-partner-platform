import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PartnersOverviewLayout } from "./PartnersOverviewLayout";

const zoneRefs = {
  active: createRef<HTMLDivElement>(),
  decide: createRef<HTMLDivElement>(),
  waiting: createRef<HTMLDetailsElement>(),
};

const baseProps = {
  lead: "Lead",
  counts: { active: 0, decisions: 0, outgoing: 0 },
  loading: true,
  error: "",
  listReady: false,
  onRetry: vi.fn(),
  onOpenFind: vi.fn(),
  onOpenLink: vi.fn(),
  onTileNavigate: vi.fn(),
  waitingOpen: false,
  onWaitingOpenChange: vi.fn(),
  decisionSlot: null,
  activeSlot: null,
  waitingSlot: null,
  zoneRefs,
  collectionIsEmpty: true,
  greetingVariant: "true-empty" as const,
  hasArchivedOrHiddenActive: false,
  collectionCount: 0,
  legacyDisclosureOpen: false,
  onLegacyDisclosureOpenChange: vi.fn(),
  legacyChromePinned: false,
  legacyBulkOutcomeVisible: false,
};

describe("PartnersOverviewLayout first paint", () => {
  it("shows pending shell without head CTA, tiles, or welcome while loading", () => {
    render(<PartnersOverviewLayout {...baseProps} />);
    expect(screen.getByTestId("partners-welcome-decision-pending")).toBeInTheDocument();
    expect(screen.queryByTestId("partners-overview-cta-find")).not.toBeInTheDocument();
    expect(screen.queryByTestId("partners-overview-tiles")).not.toBeInTheDocument();
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("shows welcome only after listReady with zero counts", () => {
    render(
      <PartnersOverviewLayout
        {...baseProps}
        loading={false}
        listReady
        counts={{ active: 0, decisions: 0, outgoing: 0 }}
      />,
    );
    expect(screen.queryByTestId("partners-welcome-decision-pending")).not.toBeInTheDocument();
    expect(screen.getByTestId("partners-empty")).toBeInTheDocument();
  });

  it("shows error and retry when list failed (not infinite skeleton)", () => {
    render(
      <PartnersOverviewLayout
        {...baseProps}
        loading={false}
        listReady={false}
        error="Не удалось загрузить список"
      />,
    );
    expect(screen.queryByTestId("partners-welcome-decision-pending")).not.toBeInTheDocument();
    expect(screen.getByTestId("partners-overview-error")).toBeInTheDocument();
    expect(screen.queryByTestId("partners-empty")).not.toBeInTheDocument();
  });

  it("keeps settled overview visible during same-user refetch", () => {
    render(
      <PartnersOverviewLayout
        {...baseProps}
        loading
        listReady
        error=""
        counts={{ active: 2, decisions: 0, outgoing: 0 }}
        collectionIsEmpty={false}
        collectionCount={2}
      />,
    );
    expect(screen.queryByTestId("partners-welcome-decision-pending")).not.toBeInTheDocument();
    expect(screen.getByTestId("partners-overview-tiles")).toBeInTheDocument();
  });
});
