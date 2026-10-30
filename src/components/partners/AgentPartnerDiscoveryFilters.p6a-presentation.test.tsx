import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentPartnerDiscoveryFilters } from "./AgentPartnerDiscoveryFilters";

const cssPath = path.join(__dirname, "AgentPartnerDiscoveryFilters.module.css");
const cssBytes = readFileSync(cssPath);
const css = cssBytes.toString("utf8");
const MARKER = "/* === P6a: modal-primary specialization/stage filters (prefix above immutable) === */";
const PREFIX_BYTES = 1929;
const PREFIX_SHA256 = "87e316d8ecbb59fedd293f06073ac17bd0f333a76236d3b613f3bad7430a72be";
const TSX_SHA256 = "e64ee7c854768892e45ec54ec87ea8adf7be5772985f650250da1c033f421389";

vi.mock("@/lib/partner-taxonomy", () => ({
  fetchPartnerTaxonomy: vi.fn(),
}));

const { fetchPartnerTaxonomy } = await import("@/lib/partner-taxonomy");

describe("AgentPartnerDiscoveryFilters P6a presentation", () => {
  beforeEach(() => {
    vi.mocked(fetchPartnerTaxonomy).mockResolvedValue({
      products: [{ id: "p1", label: "Плитка и керамогранит длинная подпись" }],
      services: [{ id: "s1", label: "Электромонтаж длинная подпись опции" }],
      stages: [{ id: "st1", label: "Черновая отделка длинная подпись этапа" }],
    });
  });

  it("keeps the pre-P6a CSS as an exact 1929-byte prefix before the appendix marker", () => {
    const prefix = cssBytes.subarray(0, PREFIX_BYTES);
    expect(prefix.byteLength).toBe(PREFIX_BYTES);
    expect(createHash("sha256").update(prefix).digest("hex")).toBe(PREFIX_SHA256);
    expect(prefix.toString("utf8")).toContain(".modalPrimary {\n  display: grid;");
    expect(prefix.toString("utf8")).toContain(".fieldHint {\n  font-size: var(--text-xs);");
    expect(prefix.toString("utf8").endsWith("}\n")).toBe(true);

    const idx = css.indexOf(MARKER);
    expect(idx).toBeGreaterThanOrEqual(PREFIX_BYTES);
    const appendix = css.slice(PREFIX_BYTES);
    expect(appendix).toContain(MARKER);
    expect(appendix).not.toContain("!important");
    // No bare standalone selectors outside the .modalPrimary > .primaryRow chain
    expect(appendix).not.toMatch(/(^|\n)\.primaryRow\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.field\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.fieldHint\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.root\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.mainRow\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.moreGrid\s*\{/);
    expect(appendix).not.toMatch(/(^|\n)\.modalMore\s*\{/);
  });

  it("sets modal-primary selects to ≥44px hit / 16px font and fieldHints to ≥14px with light FG ≥4.5:1", () => {
    const appendix = css.slice(css.indexOf(MARKER));
    expect(appendix).toMatch(
      /\.modalPrimary\s*>\s*\.primaryRow\s*>\s*\.field\s*>\s*select\s*\{[^}]*min-height:\s*46px;[^}]*height:\s*46px;[^}]*font-size:\s*16px;/s,
    );
    expect(appendix).toMatch(
      /\.modalPrimary\s*>\s*\.primaryRow\s*>\s*\.field\s*>\s*\.fieldHint\s*\{[^}]*font-size:\s*14px;[^}]*color:\s*#5c605a;/s,
    );
    expect(appendix).toMatch(
      /\.modalPrimary\s*>\s*\.primaryRow\s*>\s*\.field\s*>\s*select:focus-visible\s*\{[^}]*outline:\s*2px\s+solid/s,
    );
    expect(appendix).toMatch(/@media\s*\(max-width:\s*680px\)/);

    const fg = [0x5c, 0x60, 0x5a];
    const bg = [0xf2, 0xf1, 0xee];
    const lin = (c: number) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const L = (rgb: number[]) =>
      0.2126 * lin(rgb[0]!) + 0.7152 * lin(rgb[1]!) + 0.0722 * lin(rgb[2]!);
    const ratio = (Math.max(L(fg), L(bg)) + 0.05) / (Math.min(L(fg), L(bg)) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps TSX blob frozen and preserves native select contract / full hint text", async () => {
    const tsx = readFileSync(path.join(__dirname, "AgentPartnerDiscoveryFilters.tsx"));
    expect(createHash("sha256").update(tsx).digest("hex")).toBe(TSX_SHA256);

    const onSpecializationChange = vi.fn();
    const onStageChange = vi.fn();
    const onCityChange = vi.fn();
    const onPartnerTypeChange = vi.fn();

    render(
      <AgentPartnerDiscoveryFilters
        layout="modal-primary"
        specialization=""
        stageId=""
        city=""
        partnerType=""
        onSpecializationChange={onSpecializationChange}
        onStageChange={onStageChange}
        onCityChange={onCityChange}
        onPartnerTypeChange={onPartnerTypeChange}
      />,
    );

    expect(screen.getByTestId("agent-partner-discovery-filters")).toBeInTheDocument();
    expect(screen.getByText("Область работ, услуг или товаров партнёра")).toBeInTheDocument();
    expect(screen.getByText("На каком этапе ремонта партнёр полезен")).toBeInTheDocument();

    const specialization = await screen.findByTestId("discovery-specialization");
    const stage = screen.getByTestId("discovery-stage");
    expect(specialization.tagName).toBe("SELECT");
    expect(stage.tagName).toBe("SELECT");

    await waitFor(() => {
      expect(fetchPartnerTaxonomy).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(specialization.querySelector('option[value="services:s1"]')).toBeTruthy();
      expect(stage.querySelector('option[value="st1"]')).toBeTruthy();
    });

    await userEvent.selectOptions(specialization, "services:s1");
    expect(onSpecializationChange).toHaveBeenCalledWith("services:s1");

    await userEvent.selectOptions(stage, "st1");
    expect(onStageChange).toHaveBeenCalledWith("st1");

    expect(onCityChange).not.toHaveBeenCalled();
    expect(onPartnerTypeChange).not.toHaveBeenCalled();
  });
});
