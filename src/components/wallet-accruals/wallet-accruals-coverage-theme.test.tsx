import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WalletAccrualsShell } from "./WalletAccrualsShell";

const globalsCss = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const walletCss = readFileSync(path.join(process.cwd(), "src/components/wallet-accruals/wallet-accruals.global.css"), "utf8");

const PAGE_LIGHT = [246, 245, 243] as const;
const PAGE_DARK = [23, 26, 23] as const;

const COVERAGE_LIGHT_SELECTOR = "section.wallet-accruals p.wallet-accruals-coverage";
const COVERAGE_DARK_SELECTOR =
  'html[data-theme="dark"] section.wallet-accruals p.wallet-accruals-coverage';

function injectStyles(id: string, css: string) {
  let node = document.getElementById(id);
  if (!node) {
    node = document.createElement("style");
    node.id = id;
    document.head.append(node);
  }
  node.textContent = css;
}

function relativeLuminance([r, g, b]: readonly [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(fg: readonly [number, number, number], bg: readonly [number, number, number]): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function parseRgb(color: string): [number, number, number] {
  const m = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) throw new Error(`Expected rgb() from getComputedStyle, got ${color}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const emptyData = { receivable: [], payable: [], completed: [] };

/** Plain panel wrapper — no global `.pw` (production uses CSS-module hash only). */
function renderWalletBlock(coverageNote: string) {
  return render(
    <div data-testid="wallet-prototype-panel">
      <WalletAccrualsShell
        data={emptyData}
        incomingOnly
        coverageNote={coverageNote}
        presentation={{ ribbonLabel: "Агент", cardIdentifier: null }}
      />
    </div>,
  );
}

describe("wallet coverage note theme (E6b DOM)", () => {
  beforeEach(() => {
    injectStyles("wallet-test-globals", globalsCss);
    injectStyles("wallet-test-accruals", walletCss);
    document.documentElement.setAttribute("data-theme", "light");
    document.body.style.background = "#f6f5f3";
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.body.style.background = "";
  });

  it("computes coverage colors with real ancestor chain (no .pw) and theme on html", () => {
    const { rerender } = renderWalletBlock("Покрытие light");
    const note = screen.getByTestId("wallet-coverage-note");
    expect(note.matches(COVERAGE_LIGHT_SELECTOR)).toBe(true);
    expect(note.parentElement?.matches("section.wallet-accruals")).toBe(true);
    expect(note.className).toContain("pw-muted");

    const lightRgb = parseRgb(getComputedStyle(note).color);
    expect(lightRgb).toEqual([74, 80, 88]);
    expect(contrastRatio(lightRgb, PAGE_LIGHT)).toBeGreaterThanOrEqual(4.8);

    document.documentElement.setAttribute("data-theme", "dark");
    document.body.style.background = "#171a17";
    rerender(
      <div data-testid="wallet-prototype-panel">
        <WalletAccrualsShell
          data={emptyData}
          incomingOnly
          coverageNote="Покрытие dark"
          presentation={{ ribbonLabel: "Агент", cardIdentifier: null }}
        />
      </div>,
    );
    const darkNote = screen.getByTestId("wallet-coverage-note");
    expect(darkNote.matches(COVERAGE_DARK_SELECTOR)).toBe(true);
    expect(darkNote.matches('[data-theme="dark"] .wallet-accruals .wallet-accruals-coverage')).toBe(true);

    const darkRgb = parseRgb(getComputedStyle(darkNote).color);
    expect(darkRgb).toEqual([184, 192, 202]);
    expect(contrastRatio(darkRgb, PAGE_DARK)).toBeGreaterThanOrEqual(4.8);
  });

  it("documents that global .pw selectors in this file do not match production DOM", () => {
    renderWalletBlock("note");
    const section = screen.getByTestId("wallet-accruals");
    expect(section.closest(".pw")).toBeNull();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
