import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PartnerRowTerms } from "./PartnerRowTerms";
import type { Partnership } from "@/lib/types";

const css = (name: string) => readFileSync(join(__dirname, name), "utf8");
const rule = (source: string, selector: string) => {
  const match = source.match(new RegExp(`(^|\\n)\\${selector}\\s*\\{([^}]*)\\}`));
  return match ? match[2] : "";
};

const partnership = {
  id: "ps-1",
  status: "ACTIVE",
  directionInfo: { direction: "incoming" },
  terms: [
    { category: "doors", categoryLabel: "doors", storePercent: 12, isExcluded: false },
    { category: "flooring", categoryLabel: "flooring", storePercent: 0, isExcluded: false },
    { category: "paint", categoryLabel: "Краска / ЛКМ", storePercent: 0, isExcluded: true },
  ],
} as unknown as Partnership;

describe("compact row conditions hierarchy", () => {
  it("makes category + percent the primary text: ink colour, semibold, at least text-sm", () => {
    const styles = css("AgentActiveCollection.module.css");
    const rates = rule(styles, ".termsRates");
    expect(rates).toMatch(/color:\s*var\(--ink\)/);
    expect(rates).toMatch(/font-weight:\s*(600|700)/);
    expect(rates).toMatch(/font-size:\s*var\(--text-sm\)/);
    const secondary = rule(styles, ".termsPreview");
    expect(secondary).toMatch(/color:\s*var\(--muted\)/);
    expect(secondary).toMatch(/font-size:\s*var\(--text-xs\)/);
  });

  it("renders rates with the primary class and keeps validity, purchases and exclusions secondary and separate from 0%", () => {
    render(<PartnerRowTerms partnership={partnership} restrictions={{ validityDays: 45, purchaseLimit: 3 }} />);
    const rates = screen.getByTestId("partner-row-terms-preview");
    expect(rates.className).toMatch(/termsRates/);
    expect(rates).toHaveTextContent("Двери 12%");
    expect(rates).toHaveTextContent("Напольные покрытия 0%");
    expect(rates).not.toHaveTextContent("Краска");
    const restrictions = screen.getByTestId("partner-row-restrictions");
    expect(restrictions.className).toMatch(/termsPreview/);
    expect(restrictions.className).not.toMatch(/termsRates/);
    const excluded = screen.getByTestId("partner-row-excluded");
    expect(excluded.className).toMatch(/termsPreview/);
    expect(excluded).toHaveTextContent("Не участвуют: Краска / ЛКМ");
  });

  it("uses the same primary weight for the detail terms list, which keeps ink colour", () => {
    const styles = css("PartnerPartnershipDetailDialog.module.css");
    expect(rule(styles, ".termsList li")).toMatch(/font-weight:\s*(600|700)/);
    expect(rule(styles, ".list li")).toMatch(/color:\s*var\(--ink\)/);
  });
});
