import { createRef } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PartnersOverviewLayout } from "./PartnersOverviewLayout";

const props = {
  lead: "Условия партнёров, которым вы рекомендуете клиентов.",
  counts: { active: 3, decisions: 0, outgoing: 0 },
  loading: false, error: "", listReady: true, onRetry: vi.fn(), onOpenFind: vi.fn(), onOpenLink: vi.fn(),
  onTileNavigate: vi.fn(), waitingOpen: false, onWaitingOpenChange: vi.fn(), decisionSlot: null, waitingSlot: null,
  zoneRefs: { active: createRef<HTMLDivElement>(), decide: createRef<HTMLDivElement>(), waiting: createRef<HTMLDetailsElement>() },
  collectionIsEmpty: false, greetingVariant: "history" as const, hasArchivedOrHiddenActive: false, collectionCount: 3,
  legacyDisclosureOpen: true, onLegacyDisclosureOpenChange: vi.fn(), legacyChromePinned: false, legacyBulkOutcomeVisible: false,
};
const css = readFileSync(join(import.meta.dirname, "PartnersOverviewLayout.module.css"), "utf8");

describe("outgoing overview head", () => {
  it("shows the lead, the existing-flow certificate action beside Find and the selected count", () => {
    render(<PartnersOverviewLayout {...props} showCreateCertificate activeSlot={<div>list</div>} />);
    expect(screen.getByText("Условия партнёров, которым вы рекомендуете клиентов.")).toBeInTheDocument();
    expect(screen.getByTestId("partners-overview-cta-certificate")).toHaveAttribute("href", "/certificates");
    expect(screen.getByTestId("partners-overview-cta-find")).toBeInTheDocument();
  });

  it("omits the certificate action by default", () => {
    render(<PartnersOverviewLayout {...props} activeSlot={<div>list</div>} />);
    expect(screen.queryByTestId("partners-overview-cta-certificate")).toBeNull();
  });

  it("uses scoped prototype action colours with a readable dark ink and a tile/panel gutter", () => {
    expect(css).toMatch(/--pp-accent-ink:/);
    expect(css).toMatch(/\.primaryCta\s*\{[^}]*var\(--pp-accent/s);
    expect(css).toMatch(/\.primaryCta\s*\{[^}]*color:\s*var\(--pp-accent-ink/s);
    expect(css).toMatch(/\.panelStack\s*\{[^}]*(gap|row-gap)/s);
  });
});
