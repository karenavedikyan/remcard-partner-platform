import { createRef, useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { PartnersOverviewLayout } from "./PartnersOverviewLayout";
import { PartnerDirectionTabs } from "./PartnerDirectionTabs";
import { PartnerRowTerms } from "./PartnerRowTerms";
import { directionTabCopy } from "@/lib/partner-directions/direction";
import type { Partnership, PartnershipDirection } from "@/lib/types";

const baseProps = {
  lead: "Lead",
  counts: { active: 3, decisions: 0, outgoing: 0 },
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

function Harness({ onChange }: { onChange?: (d: PartnershipDirection) => void }) {
  const [value, setValue] = useState<PartnershipDirection>("incoming");
  return (
    <PartnersOverviewLayout
      {...baseProps}
      policySlot={<section data-testid="policy">policy</section>}
      directionTabsSlot={
        <PartnerDirectionTabs
          value={value}
          onChange={(next) => {
            onChange?.(next);
            setValue(next);
          }}
          copy={directionTabCopy("business-store-r04")}
          panelId="partner-direction-panel"
        />
      }
      activeSlot={<div id="partner-direction-panel" role="tabpanel" aria-labelledby={`partner-direction-tab-${value}`} data-direction={value}>list</div>}
    />
  );
}

describe("direction tabs sit above all direction content", () => {
  it("orders the policy entry, the tabs, then the lead, tiles and active list", () => {
    render(<Harness />);
    const root = screen.getByTestId("partners-overview");
    const header = screen.getByTestId("partners-overview-direction-header");
    const tabs = screen.getByTestId("partner-direction-tabs");
    const tiles = screen.getByTestId("partners-overview-tiles");
    const active = screen.getByTestId("partners-zone-active");
    expect(header.contains(tabs)).toBe(true);
    expect(within(active).queryByTestId("partner-direction-tabs")).toBeNull();
    expect(screen.getByTestId("policy").compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(header.compareDocumentPosition(tiles) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(header.compareDocumentPosition(screen.getByTestId("partners-overview-cta-find")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root.firstElementChild).toBe(header);
    expect(tiles.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("keeps one tab state: roving tabindex, arrow keys and the panel association", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const incoming = screen.getByRole("tab", { name: "Нас рекомендуют" });
    incoming.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("outgoing");
    const outgoing = screen.getByRole("tab", { name: "Мы рекомендуем" });
    expect(outgoing).toHaveFocus();
    expect(outgoing).toHaveAttribute("aria-selected", "true");
    expect(outgoing).toHaveAttribute("tabindex", "0");
    expect(incoming).toHaveAttribute("tabindex", "-1");
    expect(document.getElementById("partner-direction-panel")).toHaveAttribute("data-direction", "outgoing");
    expect(outgoing).toHaveAttribute("aria-controls", "partner-direction-panel");
  });

  it("hides the tabs while the legacy panel is collapsed", () => {
    render(
      <PartnersOverviewLayout
        {...baseProps}
        counts={{ active: 0, decisions: 0, outgoing: 0 }}
        collectionIsEmpty
        directionTabsSlot={<div data-testid="slot-tabs">tabs</div>}
        activeSlot={<div>list</div>}
      />,
    );
    expect(screen.queryByTestId("slot-tabs")).toBeNull();
  });
});

describe("prototype geometry is copied into scoped styles", () => {
  const css = (name: string) => readFileSync(join(__dirname, name), "utf8");
  it("matches the .dp-tabs underline tab", () => {
    const tabs = css("PartnerDirectionTabs.module.css");
    expect(tabs).toMatch(/gap:\s*24px/);
    expect(tabs).toMatch(/padding:\s*10px 0/);
    expect(tabs).toMatch(/border-bottom:\s*3px solid transparent/);
    expect(tabs).toMatch(/border-bottom-color:\s*#cf382f/);
    expect(tabs).toMatch(/border-radius:\s*0/);
    expect(tabs).not.toMatch(/999px/);
  });
  it("defines the prototype palette only inside the overview scope", () => {
    const layout = css("PartnersOverviewLayout.module.css");
    expect(layout).toMatch(/--pp-line:\s*#dedfd9/);
    expect(readFileSync(join(__dirname, "../../app/globals.css"), "utf8")).not.toMatch(/--pp-line/);
  });
});

const outgoing = {
  id: "ps-1",
  status: "ACTIVE",
  directionInfo: { direction: "outgoing" },
  terms: [
    { category: "paint", categoryLabel: "Краски", storePercent: 7, isExcluded: false },
    { category: "doors", categoryLabel: "Двери", storePercent: 0, isExcluded: false },
    { category: "handles", categoryLabel: "Ручки", storePercent: 0, isExcluded: true },
  ],
} as unknown as Partnership;

describe("outgoing rate hierarchy", () => {
  it("lists every category with percent, keeps 0% distinct from excluded and keeps limits as meta", () => {
    render(<PartnerRowTerms partnership={outgoing} restrictions={{ validityDays: 14, purchaseLimit: 1 }} variant="rates" />);
    const rows = screen.getAllByTestId("partner-row-category-rate");
    expect(rows.map((r) => r.querySelector("dt")?.textContent)).toEqual(["Краски", "Двери", "Ручки"]);
    expect(rows[1].querySelector("dd")).toHaveTextContent("0%");
    expect(rows[1]).not.toHaveAttribute("data-excluded");
    expect(rows[2]).toHaveAttribute("data-excluded", "true");
    expect(rows[2]).toHaveTextContent("Не участвует");
    expect(screen.getByTestId("partner-row-restrictions")).toHaveTextContent("14 дней · 1 покупка");
  });

  it("folds long category lists behind a native disclosure without losing rows", () => {
    const many = {
      ...outgoing,
      terms: Array.from({ length: 8 }, (_, i) => ({ category: `c${i}`, categoryLabel: `Кат ${i}`, storePercent: i, isExcluded: false })),
    } as unknown as Partnership;
    render(<PartnerRowTerms partnership={many} variant="rates" />);
    expect(screen.getAllByTestId("partner-row-category-rate")).toHaveLength(8);
    expect(screen.getByText("Ещё 3")).toBeInTheDocument();
  });
});
