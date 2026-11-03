import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WalletAccrualsShell } from "./WalletAccrualsShell";

vi.mock("./wallet-accruals.global.css", () => ({}));

const shellPath = path.join(__dirname, "WalletAccrualsShell.tsx");
const cssPath = path.join(__dirname, "wallet-accruals.global.css");

const CARD_SHELL_CLASS_NAMES = [
  "wallet-accruals-card-column",
  "wallet-rc-card",
  "wallet-rc-card--black",
  "wallet-rc-card__head",
  "wallet-rc-card__ribbon",
  "wallet-rc-lockup",
  "wallet-rc-lockup__word",
  "wallet-rc-lockup__dot",
  "wallet-rc-card__body",
  "wallet-rc-card__label",
  "wallet-rc-card__label--secondary",
  "wallet-rc-card__hero",
  "wallet-rc-card__amount",
  "wallet-rc-card__unit",
  "wallet-rc-card__unit--waiting",
  "wallet-rc-card__waiting-row",
  "wallet-rc-card__waiting-amount",
  "wallet-rc-card__pan",
  "wallet-accruals-quick",
  "wallet-accruals-quick__btn",
  "wallet-accruals-quick__btn--teal",
  "wallet-accruals-quick__btn--accent",
] as const;

function extractCardRegionSource(): string {
  const source = readFileSync(shellPath, "utf8");
  const start = source.indexOf('className="wallet-accruals-card-column"');
  if (start < 0) return source;
  return source.slice(start, start + 4500);
}

const emptyData = {
  receivable: [],
  payable: [],
  completed: [],
};

describe("WalletAccrualsShell card layout (E5)", () => {
  it("wraps card and quick actions in wallet-accruals-card-column with prototype structure", () => {
    render(
      <WalletAccrualsShell
        data={emptyData}
        incomingOnly
        presentation={{ ribbonLabel: "Агент", cardIdentifier: null }}
      />,
    );
    const face = screen.getByTestId("wallet-rc-receivable-face");
    const column = screen.getByTestId("wallet-column-receivable");
    expect(column).toContainElement(face);
    expect(column.className).toContain("wallet-accruals-card-column");
    expect(face.querySelector(".wallet-rc-card__head")).toBeTruthy();
    expect(face.querySelector(".wallet-rc-card__body")).toBeTruthy();
    expect(face.querySelector(".wallet-rc-card__hero")).toBeTruthy();
    expect(face.querySelector(".wallet-rc-card__waiting-row")).toBeTruthy();
    expect(face.querySelector(".wallet-rc-card__pan")).toBeNull();

    const quick = within(column).getByTestId("wallet-quick-in");
    expect(quick.className).toContain("wallet-accruals-quick");
    expect(quick.querySelector(".wallet-accruals-quick__btn--teal")).toBeTruthy();
    expect(quick.querySelector(".wallet-accruals-quick__btn--accent")).toBeTruthy();
    expect(column).toContainElement(quick);
  });

  it("renders pan only when a real card identifier is present", () => {
    const { rerender } = render(
      <WalletAccrualsShell
        data={emptyData}
        incomingOnly
        presentation={{ ribbonLabel: "Агент", cardIdentifier: null }}
      />,
    );
    expect(screen.getByTestId("wallet-rc-receivable-face").querySelector(".wallet-rc-card__pan")).toBeNull();

    rerender(
      <WalletAccrualsShell
        data={emptyData}
        incomingOnly
        presentation={{ ribbonLabel: "Агент", cardIdentifier: "RC 1234 5678" }}
      />,
    );
    const pan = screen.getByTestId("wallet-rc-receivable-face").querySelector(".wallet-rc-card__pan");
    expect(pan).toHaveTextContent("RC 1234 5678");
  });

  it("does not render tier/edition selectors or non-black card finishes", () => {
    const { container } = render(
      <WalletAccrualsShell
        data={emptyData}
        presentation={{ ribbonLabel: "Магазин", cardIdentifier: null }}
      />,
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/wallet-accruals-edition/i);
    expect(html).not.toMatch(/wallet-rc-card--(?:silver|gold|platinum)/);
    expect(container.querySelector(".wallet-rc-card--black")).toBeTruthy();
  });

  it("maps every card/quick className in Shell to a CSS rule", () => {
    const region = extractCardRegionSource();
    const css = readFileSync(cssPath, "utf8");
    for (const className of CARD_SHELL_CLASS_NAMES) {
      expect(region, `Shell should reference .${className}`).toContain(className);
      const rulePattern = new RegExp(`\\.${className.replace(/-/g, "\\-")}(\\s|[,{:.])`);
      expect(css, `CSS should define .${className}`).toMatch(rulePattern);
    }
  });

  it("ties 100cqw card min-height to container-type on wallet-accruals-card-column", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toMatch(/\.wallet-rc-card[\s\S]*100cqw/);
    expect(css).toMatch(/\.wallet-accruals-card-column[\s\S]*container-type:\s*inline-size/);
  });
});
