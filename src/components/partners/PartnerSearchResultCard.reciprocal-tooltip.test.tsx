import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PartnerSearchResultCard } from "./PartnerSearchResultCard";
import type { PartnerSearchResult } from "@/lib/types";
import type { PartnerSideProfile } from "@/lib/partnership-rules";

type Slot = { partnershipId: string; status: string } | null;
const LONG_TITLE = "Фабрика мебели и дверей Соляник Фэмили Групп";
const result = (outgoing: Slot, incoming: Slot, partnerType = "COMPANY"): PartnerSearchResult => ({
  id: "p-1", displayName: LONG_TITLE, city: "Москва", photoUrl: null, description: null,
  specializations: [], badges: [], storeCategories: [], branches: [], rating: null, ratingCount: 0,
  partnershipStatus: outgoing?.status ?? incoming?.status ?? null,
  partnerType, partnerTypeLabel: "Компания",
  workingProductLabels: ["Двери"], workingServiceLabels: [], workingStageLabels: [],
  partnershipDirections: { outgoing, incoming },
});
const business: PartnerSideProfile = { id: "me", partnerType: "STORE", partnerActivities: ["STORE"], storeCategories: [], specializations: [] };
const agent: PartnerSideProfile = { id: "me", partnerType: "COMPANY", partnerActivities: ["AGENT"], storeCategories: [], specializations: [] };
const slot = (status: string): Slot => ({ partnershipId: "x", status });

function mount(partner: PartnerSearchResult, viewer = business, audience: "business-store-r04" | "specialist-r04" = "business-store-r04") {
  const onReciprocalInvite = vi.fn();
  render(
    <div data-testid="clipping-host" style={{ overflow: "hidden" }}>
      <PartnerSearchResultCard
        partner={partner}
        title={LONG_TITLE}
        showPublishedTerms={false}
        inviteDisabled={false}
        onInvite={() => undefined}
        directionContext={{ audience, viewerSide: viewer, onReciprocalInvite }}
      />
    </div>,
  );
  return onReciprocalInvite;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("search card reciprocal action text", () => {
  it("shows a short visible label and keeps the full explanation as the accessible name", async () => {
    const onReciprocal = mount(result(slot("ACTIVE"), null));
    const button = screen.getByTestId("agent-partner-search-result-reciprocal");
    expect(button).toHaveTextContent(/^Предложить условия$/);
    expect(button).toHaveAccessibleName("Предложить условия: пусть рекомендуют нас");
    await userEvent.click(button);
    expect(onReciprocal).toHaveBeenCalledTimes(1);
    expect(onReciprocal).toHaveBeenCalledWith("INVITER_RECEIVES");
  });

  it("uses «Запросить условия» for the issuing direction with the same callback value", async () => {
    const onReciprocal = mount(result(null, slot("ACTIVE")));
    const button = screen.getByTestId("agent-partner-search-result-reciprocal");
    expect(button).toHaveTextContent(/^Запросить условия$/);
    expect(button).toHaveAccessibleName("Запросить условия: мы будем рекомендовать");
    button.focus();
    await userEvent.keyboard("{Enter}");
    expect(onReciprocal).toHaveBeenCalledWith("INVITER_ISSUES");
  });

  it("keeps specialist wording in the accessible name", () => {
    mount(result(slot("ACTIVE"), null), business, "specialist-r04");
    expect(screen.getByTestId("agent-partner-search-result-reciprocal")).toHaveAccessibleName(
      "Предложить условия: пусть рекомендуют меня",
    );
  });

  it("places the reciprocal action in the card footer next to a single-line status row", () => {
    mount(result(slot("ACTIVE"), null));
    const card = screen.getByTestId("agent-partner-search-result-card");
    expect(within(card).getByText(LONG_TITLE)).toBeInTheDocument();
    expect(card).toContainElement(screen.getByTestId("agent-partner-search-result-reciprocal"));
    expect(card).toContainElement(screen.getByTestId("agent-partner-search-result-direction"));
  });

  it("leaves INVITED single-invite cards and agent viewers without a reciprocal action", () => {
    mount(result(slot("INVITED"), null));
    expect(screen.queryByTestId("agent-partner-search-result-reciprocal")).toBeNull();
    expect(screen.getByTestId("agent-partner-search-result-direction")).toBeInTheDocument();
    cleanup();
    mount(result(slot("ACTIVE"), null), agent);
    expect(screen.queryByTestId("agent-partner-search-result-reciprocal")).toBeNull();
  });
});

describe("direction explanation tooltip", () => {
  function stubViewport(buttonRect: Partial<DOMRect>, tooltipSize: { width: number; height: number }, viewport = { width: 320, height: 640 }) {
    vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(viewport.width);
    vi.stubGlobal("innerHeight", viewport.height);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const base = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) };
      if (this.getAttribute("data-testid") === "agent-partner-search-result-direction") {
        return { ...base, ...buttonRect } as DOMRect;
      }
      return base as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(tooltipSize.width);
    vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(tooltipSize.height);
  }

  it("renders in a body-level layer so the card cannot clip it, and links it with aria-describedby", async () => {
    mount(result(slot("ACTIVE"), null));
    const badge = screen.getByTestId("agent-partner-search-result-direction");
    expect(screen.queryByRole("tooltip")).toBeNull();
    await userEvent.click(badge);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.parentElement).toBe(document.body);
    expect(screen.getByTestId("clipping-host")).not.toContainElement(tooltip);
    expect(badge).toHaveAccessibleDescription(/Мы рекомендуем|Сотрудничаем/);
    expect(tooltip).toHaveTextContent("Сотрудничаем");
  });

  it("opens on keyboard focus, closes on Escape and on an outside tap, but not on a tap inside", async () => {
    mount(result(slot("ACTIVE"), null));
    const badge = screen.getByTestId("agent-partner-search-result-direction");
    await userEvent.tab();
    badge.focus();
    fireEvent.focus(badge);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("tooltip")).toBeNull();

    await userEvent.click(badge);
    fireEvent.pointerDown(screen.getByRole("tooltip"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("clamps the layer into the viewport horizontally (marker near the right edge of a 320px screen)", async () => {
    stubViewport({ left: 290, right: 314, top: 300, bottom: 324, width: 24, height: 24 }, { width: 280, height: 92 });
    mount(result(slot("ACTIVE"), null));
    await userEvent.click(screen.getByTestId("agent-partner-search-result-direction"));
    const tooltip = screen.getByRole("tooltip");
    const left = parseFloat(tooltip.style.left);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 280).toBeLessThanOrEqual(320 - 8);
    expect(tooltip.style.visibility).toBe("visible");
  });

  it("flips above the marker when there is no room below and scrolls when taller than the room", async () => {
    stubViewport({ left: 20, right: 44, top: 590, bottom: 614, width: 24, height: 24 }, { width: 280, height: 92 });
    mount(result(slot("ACTIVE"), null));
    await userEvent.click(screen.getByTestId("agent-partner-search-result-direction"));
    let tooltip = screen.getByRole("tooltip");
    expect(parseFloat(tooltip.style.top)).toBeLessThan(590);
    cleanup();

    stubViewport({ left: 20, right: 44, top: 90, bottom: 114, width: 24, height: 24 }, { width: 280, height: 900 }, { width: 320, height: 300 });
    mount(result(slot("ACTIVE"), null));
    await userEvent.click(screen.getByTestId("agent-partner-search-result-direction"));
    tooltip = screen.getByRole("tooltip");
    const top = parseFloat(tooltip.style.top);
    const maxHeight = parseFloat(tooltip.style.maxHeight);
    expect(top).toBeGreaterThanOrEqual(8);
    expect(top + maxHeight).toBeLessThanOrEqual(300);
  });
});

describe("search card layout contract", () => {
  const css = (name: string) => readFileSync(join(__dirname, name), "utf8");

  it("does not rely on hidden overflow, ellipsis or smaller fonts for the footer action", () => {
    const card = css("PartnerSearchResultCard.module.css");
    const rule = /\.modalResultFootStatus \.reciprocalAction \{[^}]*\}/.exec(card)?.[0] ?? "";
    expect(rule).toMatch(/white-space:\s*normal/);
    expect(rule).not.toMatch(/text-overflow|overflow:\s*hidden/);
    expect(Number(/font-size:\s*(\d+)px/.exec(rule)?.[1])).toBeGreaterThanOrEqual(12);
    expect(/\.modalResultFoot \{[^}]*\}/.exec(card)?.[0]).toMatch(/flex-wrap:\s*wrap/);
  });

  it("positions the tooltip against the viewport instead of inside the card", () => {
    const badge = css("PartnerDirectionBadge.module.css");
    expect(/\.tooltip \{[^}]*\}/.exec(badge)?.[0]).toMatch(/position:\s*fixed/);
  });
});
